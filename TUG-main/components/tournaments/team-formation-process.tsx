"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Users, Crown, Trophy, ArrowRight, RefreshCw, Settings, AlertCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { tournamentDraftService } from "@/lib/services/tournament-draft-service"
import { toast } from "sonner"

interface TeamFormationProcessProps {
  tournamentId: string
  tournament: any
  isOrganizer?: boolean
  onTeamsFormed?: () => void
}

interface FormedTeam {
  id: string
  name: string
  captain_id: string
  captain_name: string
  players: {
    id: string
    username: string
    elo_rating: number
    draft_cost?: number
    position?: string
  }[]
  total_budget_used: number
  average_elo: number
  status: "forming" | "confirmed" | "ready"
}

interface FormationStatus {
  draft_completed: boolean
  teams_created: boolean
  rosters_finalized: boolean
  ready_for_tournament: boolean
  total_teams: number
  confirmed_teams: number
  pending_confirmations: number
}

export function TeamFormationProcess({
  tournamentId,
  tournament,
  isOrganizer = false,
  onTeamsFormed,
}: TeamFormationProcessProps) {
  const [teams, setTeams] = useState<FormedTeam[]>([])
  const [formationStatus, setFormationStatus] = useState<FormationStatus>({
    draft_completed: false,
    teams_created: false,
    rosters_finalized: false,
    ready_for_tournament: false,
    total_teams: 0,
    confirmed_teams: 0,
    pending_confirmations: 0,
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [draftState, setDraftState] = useState<any>(null)
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()

  const loadDraftState = async () => {
    try {
      const state = await tournamentDraftService.getDraftState(tournamentId)
      setDraftState(state)
      return state
    } catch (error) {
      console.error("[v0] Error loading draft state:", error)
      return null
    }
  }

  const loadFormedTeams = async () => {
    try {
      console.log("[v0] Loading formed teams for tournament:", tournamentId)

      const { data: teamsData, error } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          budget_remaining,
          users!tournament_teams_team_captain_fkey(username),
          tournament_team_members(
            user_id,
            draft_cost,
            position,
            users(username, elo_rating)
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("draft_order")

      if (error) throw error

      const processedTeams: FormedTeam[] = (teamsData || []).map((team: any) => {
        const players = (team.tournament_team_members || []).map((member: any) => ({
          id: member.user_id,
          username: member.users?.username || "Unknown",
          elo_rating: member.users?.elo_rating || 1200,
          draft_cost: member.draft_cost,
          position: member.position,
        }))

        const totalBudgetUsed = players.reduce((sum, p) => sum + (p.draft_cost || 0), 0)
        const averageElo =
          players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 1200

        return {
          id: team.id,
          name: team.team_name,
          captain_id: team.team_captain || "",
          captain_name: team.users?.username || "TBD",
          players,
          total_budget_used: totalBudgetUsed,
          average_elo: averageElo,
          status: players.length === (tournament?.player_pool_settings?.players_per_team || 5) ? "ready" : "forming",
        }
      })

      setTeams(processedTeams)
      console.log("[v0] Loaded formed teams:", processedTeams.length)
    } catch (error) {
      console.error("[v0] Error loading formed teams:", error)
      toast.error("Failed to load formed teams")
    }
  }

  const checkFormationStatus = async () => {
    try {
      const draftState = await loadDraftState()
      const isDraftCompleted = draftState?.status === "completed"

      const { data: teamsCount } = await supabase
        .from("tournament_teams")
        .select("id", { count: "exact" })
        .eq("tournament_id", tournamentId)

      const totalTeams = teamsCount?.length || 0
      const confirmedTeams = teams.filter((t) => t.status === "ready").length
      const pendingConfirmations = totalTeams - confirmedTeams

      const status: FormationStatus = {
        draft_completed: isDraftCompleted,
        teams_created: totalTeams > 0,
        rosters_finalized: confirmedTeams === totalTeams && totalTeams > 0,
        ready_for_tournament: confirmedTeams === totalTeams && totalTeams > 0 && isDraftCompleted,
        total_teams: totalTeams,
        confirmed_teams: confirmedTeams,
        pending_confirmations: pendingConfirmations,
      }

      setFormationStatus(status)
      console.log("[v0] Formation status updated:", status)
    } catch (error) {
      console.error("[v0] Error checking formation status:", error)
    }
  }

  const finalizeTeamFormation = async () => {
    if (!isOrganizer) return

    setProcessing(true)
    try {
      console.log("[v0] Finalizing team formation for tournament:", tournamentId)

      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({
          status: "teams_formed",
          teams_finalized_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (tournamentError) throw tournamentError

      const { error: teamsError } = await supabase
        .from("tournament_teams")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)

      if (teamsError) throw teamsError

      toast.success("Team formation completed! Teams are ready for tournament play.")

      await checkFormationStatus()
      await loadFormedTeams()

      if (onTeamsFormed) {
        onTeamsFormed()
      }
    } catch (error) {
      console.error("[v0] Error finalizing team formation:", error)
      toast.error("Failed to finalize team formation")
    } finally {
      setProcessing(false)
    }
  }

  const proceedToBracket = async () => {
    if (!isOrganizer || !formationStatus.ready_for_tournament) return

    setProcessing(true)
    try {
      console.log("[v0] Proceeding to bracket generation")

      const { error } = await supabase
        .from("tournaments")
        .update({
          status: "bracket_ready",
          bracket_generated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (error) throw error

      toast.success("Teams confirmed! Proceeding to tournament bracket...")
      router.push(`/tournaments/${tournamentId}/bracket`)
    } catch (error) {
      console.error("[v0] Error proceeding to bracket:", error)
      toast.error("Failed to proceed to bracket")
    } finally {
      setProcessing(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadFormedTeams(), checkFormationStatus()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()

    const subscription = supabase
      .channel(`team-formation-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_teams",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Team formation change detected:", payload.eventType)
          refreshData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_team_members",
        },
        (payload) => {
          console.log("[v0] Team member change detected:", payload.eventType)
          refreshData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team formation process...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formation Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Team Formation Process
            <Button onClick={refreshData} variant="outline" size="sm" className="ml-auto bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Monitor and manage the transition from draft completion to tournament-ready teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{formationStatus.total_teams}</div>
              <div className="text-sm text-muted-foreground">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{formationStatus.confirmed_teams}</div>
              <div className="text-sm text-muted-foreground">Confirmed Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{formationStatus.pending_confirmations}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {teams.reduce((sum, t) => sum + t.players.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Formation Progress</span>
              <span className="font-medium">
                {formationStatus.confirmed_teams}/{formationStatus.total_teams} teams ready
              </span>
            </div>
            <Progress
              value={
                formationStatus.total_teams > 0
                  ? (formationStatus.confirmed_teams / formationStatus.total_teams) * 100
                  : 0
              }
              className="h-3"
            />
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {formationStatus.draft_completed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <div className="font-medium">Draft Status</div>
                <div className="text-sm text-muted-foreground">
                  {formationStatus.draft_completed ? "Draft completed" : "Draft in progress"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {formationStatus.teams_created ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">Teams Created</div>
                <div className="text-sm text-muted-foreground">
                  {formationStatus.teams_created
                    ? `${formationStatus.total_teams} teams formed`
                    : "No teams created yet"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {formationStatus.rosters_finalized ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <div className="font-medium">Rosters Finalized</div>
                <div className="text-sm text-muted-foreground">
                  {formationStatus.rosters_finalized ? "All rosters complete" : "Rosters being finalized"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {formationStatus.ready_for_tournament ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Settings className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <div className="font-medium">Tournament Ready</div>
                <div className="text-sm text-muted-foreground">
                  {formationStatus.ready_for_tournament ? "Ready to proceed" : "Formation in progress"}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isOrganizer && (
            <div className="space-y-3">
              {formationStatus.teams_created && !formationStatus.rosters_finalized && (
                <Button onClick={finalizeTeamFormation} disabled={processing} className="w-full" size="lg">
                  <Users className="h-4 w-4 mr-2" />
                  {processing ? "Finalizing..." : "Finalize Team Formation"}
                </Button>
              )}

              {formationStatus.ready_for_tournament && (
                <Button onClick={proceedToBracket} disabled={processing} className="w-full" size="lg">
                  <Trophy className="h-4 w-4 mr-2" />
                  {processing ? "Proceeding..." : "Proceed to Tournament Bracket"}
                </Button>
              )}
            </div>
          )}

          {!formationStatus.draft_completed && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Waiting for draft to complete before teams can be formed. Monitor the draft progress in the draft room.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">Formed Teams</TabsTrigger>
          <TabsTrigger value="process">Formation Process</TabsTrigger>
          <TabsTrigger value="settings">Team Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Tournament Teams ({teams.length})
              </CardTitle>
              <CardDescription>Teams formed from the draft results, ready for tournament play.</CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Teams Formed Yet</h3>
                  <p className="text-muted-foreground">
                    Teams will appear here once the draft is completed and team formation begins.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {teams.map((team) => (
                    <Card key={team.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {team.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{team.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">Captain: {team.captain_name}</p>
                            </div>
                          </div>
                          <Badge
                            variant={team.status === "ready" ? "default" : "secondary"}
                            className={team.status === "ready" ? "bg-green-500" : ""}
                          >
                            {team.status === "ready" ? "Ready" : "Forming"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Team Captain */}
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{team.captain_name}</p>
                            <p className="text-xs text-muted-foreground">Team Captain</p>
                          </div>
                          {team.captain_id === user?.id && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>

                        {/* Team Members */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Team Roster</p>
                            <span className="text-xs text-muted-foreground">
                              {team.players.length}/{tournament?.player_pool_settings?.players_per_team || 5} players
                            </span>
                          </div>
                          {team.players.map((player) => (
                            <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {player.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{player.username}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>ELO: {player.elo_rating}</span>
                                  {player.draft_cost && player.draft_cost > 0 && (
                                    <span className="text-green-600">${player.draft_cost}</span>
                                  )}
                                </div>
                              </div>
                              {player.id === user?.id && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Team Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-500">{team.average_elo}</div>
                            <div className="text-xs text-muted-foreground">Avg ELO</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-500">${team.total_budget_used}</div>
                            <div className="text-xs text-muted-foreground">Budget Used</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-green-500" />
                Team Formation Workflow
              </CardTitle>
              <CardDescription>Step-by-step process for forming tournament teams from draft results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Draft Completion</div>
                    <div className="text-sm text-muted-foreground">
                      Wait for the tournament draft to complete with all players assigned to teams
                    </div>
                    <div className="mt-1">
                      {formationStatus.draft_completed ? (
                        <Badge className="bg-green-500">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-medium text-yellow-700">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Team Creation</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically create teams from draft results with captains and rosters
                    </div>
                    <div className="mt-1">
                      {formationStatus.teams_created ? (
                        <Badge className="bg-green-500">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-700">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Roster Finalization</div>
                    <div className="text-sm text-muted-foreground">
                      Confirm all team rosters are complete and ready for tournament play
                    </div>
                    <div className="mt-1">
                      {formationStatus.rosters_finalized ? (
                        <Badge className="bg-green-500">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700">
                    4
                  </div>
                  <div>
                    <div className="font-medium">Tournament Transition</div>
                    <div className="text-sm text-muted-foreground">
                      Proceed to bracket generation and tournament matches
                    </div>
                    <div className="mt-1">
                      {formationStatus.ready_for_tournament ? (
                        <Badge className="bg-green-500">Ready</Badge>
                      ) : (
                        <Badge variant="secondary">Waiting</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Team Formation Settings
              </CardTitle>
              <CardDescription>Configuration and settings for the team formation process.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Tournament Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Teams:</span>
                      <span className="font-medium">{tournament?.player_pool_settings?.max_teams || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Players per Team:</span>
                      <span className="font-medium">
                        {tournament?.player_pool_settings?.players_per_team || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Draft Type:</span>
                      <Badge variant="outline">{tournament?.player_pool_settings?.draft_type || "Not set"}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Formation Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tournament Status:</span>
                      <Badge className={tournament?.status === "teams_formed" ? "bg-green-500" : "bg-blue-500"}>
                        {tournament?.status || "registration"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teams Formed:</span>
                      <span className="font-medium">{formationStatus.total_teams}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ready Teams:</span>
                      <span className="font-medium text-green-600">{formationStatus.confirmed_teams}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
