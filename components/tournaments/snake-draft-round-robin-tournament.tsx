"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Users, Target, Clock, CheckCircle, ArrowRight, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { UnifiedCaptainSelection } from "./unified-captain-selection"
import { RoundRobinBracket } from "./round-robin-bracket"

interface SnakeDraftRoundRobinTournamentProps {
  tournamentId: string
  tournament: any
  isOrganizer?: boolean
}

interface TournamentPhase {
  id: string
  name: string
  description: string
  status: "pending" | "active" | "completed"
  progress: number
}

export function SnakeDraftRoundRobinTournament({
  tournamentId,
  tournament,
  isOrganizer = false,
}: SnakeDraftRoundRobinTournamentProps) {
  const [currentPhase, setCurrentPhase] = useState<string>("registration")
  const [phases, setPhases] = useState<TournamentPhase[]>([])
  const [captains, setCaptains] = useState<any[]>([])
  const [draftCompleted, setDraftCompleted] = useState(false)
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tournamentSettings, setTournamentSettings] = useState<any>(null)
  const [requiredCaptains, setRequiredCaptains] = useState(3)
  const supabase = createClient()
  const { user } = useAuth()

  const loadTournamentSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from("tournament_settings")
        .select("player_pool_settings")
        .eq("tournament_id", tournamentId)
        .single()

      if (error) {
        console.log("[v0] No tournament settings found, using defaults")
        setRequiredCaptains(3)
        return
      }

      const numTeams = settings?.player_pool_settings?.num_teams || 3
      setRequiredCaptains(numTeams)
      setTournamentSettings(settings)
      console.log("[v0] Snake draft tournament requires", numTeams, "captains")
    } catch (error) {
      console.error("[v0] Error loading tournament settings:", error)
      setRequiredCaptains(3)
    }
  }

  const initializePhases = () => {
    const tournamentPhases: TournamentPhase[] = [
      {
        id: "registration",
        name: "Player Registration",
        description: "Players join the tournament player pool",
        status: tournament.status === "registration" ? "active" : "completed",
        progress: tournament.status === "registration" ? 75 : 100,
      },
      {
        id: "captain_selection",
        name: "Captain Selection",
        description: `Select ${requiredCaptains} team captains for the snake draft`,
        status: captains.length === 0 ? "pending" : captains.length < requiredCaptains ? "active" : "completed",
        progress: captains.length === 0 ? 0 : (captains.length / requiredCaptains) * 100,
      },
      {
        id: "snake_draft",
        name: "Snake Draft",
        description: "Captains draft players in snake order",
        status: !draftCompleted ? "pending" : "completed",
        progress: draftCompleted ? 100 : 0,
      },
      {
        id: "round_robin",
        name: "Round Robin Matches",
        description: "All teams play each other",
        status: draftCompleted ? "active" : "pending",
        progress: 0,
      },
    ]

    setPhases(tournamentPhases)

    const activePhase = tournamentPhases.find((p) => p.status === "active")
    if (activePhase) {
      setCurrentPhase(activePhase.id)
    }
  }

  const loadTournamentData = async () => {
    let teamData: any[] = []
    try {
      console.log("[v0] Loading snake draft tournament data for:", tournamentId)

      const { data: captainData, error: captainError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          captain_type,
          users (username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "captain")

      if (captainError) {
        console.error("[v0] Error loading captains:", captainError)
      } else {
        const processedCaptains = (captainData || []).map((entry: any) => ({
          id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
          captain_type: entry.captain_type || "high_elo",
        }))
        setCaptains(processedCaptains)
        console.log("[v0] Loaded snake draft captains:", processedCaptains.length)
      }

      const { data: draftData, error: draftError } = await supabase
        .from("tournament_drafts")
        .select("status")
        .eq("tournament_id", tournamentId)
        .single()

      if (draftError && draftError.code !== "PGRST116") {
        console.error("[v0] Error loading draft data:", draftError)
      } else {
        const completed = draftData?.status === "completed"
        setDraftCompleted(completed)
        console.log("[v0] Snake draft completed:", completed)
      }

      if (draftData?.status === "completed") {
        const { data, error: teamError } = await supabase
          .from("tournament_teams")
          .select(`
            *,
            team_members:tournament_team_members (
              users (username, elo_rating)
            )
          `)
          .eq("tournament_id", tournamentId)

        if (teamError) {
          console.error("[v0] Error loading teams:", teamError)
        } else {
          teamData = data || []
          console.log("[v0] Loaded snake draft teams:", teamData.length)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading snake draft tournament data:", error)
    } finally {
      setLoading(false)
      setTeams(teamData)
    }
  }

  const startSnakeDraft = async () => {
    if (captains.length < requiredCaptains) {
      toast.error(`Need ${requiredCaptains} captains to start snake draft`)
      return
    }

    try {
      console.log("[v0] Starting snake draft with", captains.length, "captains")

      const { data: draftRoom, error } = await supabase
        .from("tournament_drafts")
        .insert({
          tournament_id: tournamentId,
          draft_type: "snake_draft",
          status: "active",
          current_pick: 1,
          current_captain: captains[0].id,
          pick_time_limit: tournamentSettings?.player_pool_settings?.pick_time_limit || 60,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from("tournaments").update({ status: "drafting" }).eq("id", tournamentId)

      toast.success("Snake draft started! Captains can now draft players.")
      setCurrentPhase("snake_draft")
    } catch (error) {
      console.error("[v0] Error starting snake draft:", error)
      toast.error("Failed to start snake draft")
    }
  }

  const generateRoundRobinBracket = async () => {
    if (!draftCompleted || teams.length < 2) {
      toast.error("Need completed draft with at least 2 teams")
      return
    }

    try {
      const matches = []
      let matchNumber = 1

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const roundNumber = Math.ceil(matchNumber / Math.floor(teams.length / 2)) || 1

          matches.push({
            tournament_id: tournamentId,
            round_number: roundNumber,
            match_number: matchNumber,
            team1_id: teams[i].id,
            team2_id: teams[j].id,
            status: "ready",
            scheduled_time: new Date(Date.now() + matchNumber * 2 * 60 * 60 * 1000).toISOString(),
          })
          matchNumber++
        }
      }

      const { error } = await supabase.from("tournament_matches").insert(matches)

      if (error) throw error

      await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)

      toast.success(`Generated ${matches.length} round robin matches!`)
      setCurrentPhase("round_robin")
    } catch (error) {
      console.error("[v0] Error generating round robin bracket:", error)
      toast.error("Failed to generate round robin bracket")
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await loadTournamentSettings()
      await loadTournamentData()
    }
    loadData()
  }, [tournamentId])

  useEffect(() => {
    initializePhases()
  }, [tournament, captains, draftCompleted, requiredCaptains])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading snake draft tournament...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            Snake Draft + Round Robin Tournament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    phase.status === "completed"
                      ? "bg-green-500 border-green-500 text-white"
                      : phase.status === "active"
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 text-gray-400"
                  }`}
                >
                  {phase.status === "completed" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{phase.name}</h4>
                    <Badge
                      variant={
                        phase.status === "completed" ? "default" : phase.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {phase.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  {phase.status === "active" && phase.progress > 0 && (
                    <Progress value={phase.progress} className="mt-2 h-2" />
                  )}
                </div>

                {index < phases.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentPhase} onValueChange={setCurrentPhase}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="captain_selection">Captains</TabsTrigger>
          <TabsTrigger value="snake_draft">Draft</TabsTrigger>
          <TabsTrigger value="round_robin">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="registration" className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Players join the tournament pool. Once enough players register, captains will be selected.
              {tournament.participant_count >= 8 && " Ready for captain selection!"}
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Player Registration Phase</h3>
              <p className="text-muted-foreground mb-4">
                {tournament.participant_count || 0} players registered
                {tournament.max_teams && ` of ${tournament.max_teams} maximum`}
              </p>
              <div className="space-y-4">
                <Progress
                  value={tournament.max_teams ? (tournament.participant_count / tournament.max_teams) * 100 : 0}
                  className="w-full max-w-md mx-auto"
                />
                <Badge
                  variant={tournament.status === "registration" ? "default" : "secondary"}
                  className="text-lg px-4 py-2"
                >
                  Registration {tournament.status === "registration" ? "Open" : "Closed"}
                </Badge>
                {tournament.participant_count >= 8 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-medium">✅ Minimum players reached! Ready to select captains.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captain_selection" className="space-y-4">
          <UnifiedCaptainSelection
            tournamentId={tournamentId}
            tournament={tournament}
            draftType="snake"
            isOrganizer={isOrganizer}
            isTournamentCreator={tournament?.created_by === user?.id}
            onCaptainsSelected={setCaptains}
            onStartDraft={startSnakeDraft}
          />
        </TabsContent>

        <TabsContent value="snake_draft" className="space-y-4">
          {!draftCompleted ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Snake draft in progress. Captains take turns picking players in snake order (1-2-2-1).
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Snake draft completed! Teams are formed and ready for round robin matches.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="text-center py-8">
              <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Snake Draft Phase</h3>
              <p className="text-muted-foreground mb-4">
                {draftCompleted ? "Draft completed!" : "Captains are drafting players..."}
              </p>

              {draftCompleted && teams.length >= 2 && isOrganizer && (
                <Button
                  onClick={generateRoundRobinBracket}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-blue-600"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Generate Round Robin Bracket
                </Button>
              )}
            </CardContent>
          </Card>

          {teams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {team.team_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {team.team_members?.map((member: any) => (
                        <div key={member.users.username} className="flex items-center justify-between">
                          <span>{member.users.username}</span>
                          <Badge variant="outline">{member.users.elo_rating} ELO</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="round_robin" className="space-y-4">
          {draftCompleted ? (
            <RoundRobinBracket tournamentId={tournamentId} tournament={tournament} />
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>Round robin matches will begin after the snake draft is completed.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
