"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, Trophy, Crown, Target, Zap, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentDraftIntegrationProps {
  tournamentId: string
  onDraftStarted?: (draftId: string) => void
}

export function TournamentDraftIntegration({ tournamentId, onDraftStarted }: TournamentDraftIntegrationProps) {
  const [tournament, setTournament] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [captains, setCaptains] = useState<any[]>([])
  const [teamsWithCaptains, setTeamsWithCaptains] = useState<any[]>([])
  const [requiredTeams, setRequiredTeams] = useState(4)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { user } = useAuth()

  const loadTournamentData = async () => {
    try {
      console.log("[v0] Loading tournament data for draft integration:", tournamentId)

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(`
          id,
          name,
          tournament_type,
          max_participants,
          max_teams,
          prize_pool,
          status,
          created_by,
          player_pool_settings,
          tournament_participants (
            user_id,
            status,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      setTournament(tournamentData)
      setParticipants(tournamentData.tournament_participants || [])

      const maxTeams = tournamentData.max_teams || tournamentData.player_pool_settings?.max_teams || 4
      const playersPerTeam = tournamentData.player_pool_settings?.players_per_team || 4
      setRequiredTeams(maxTeams)

      const { data: teams, error: teamsError } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          captain_id,
          users:captain_id(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .not("captain_id", "is", null)

      if (teamsError) {
        console.error("[v0] Error loading teams with captains:", teamsError)
      } else {
        setTeamsWithCaptains(teams || [])
        console.log("[v0] Teams with captains:", teams?.length || 0, "Required:", maxTeams)
      }

      const { data: existingDraft } = await supabase
        .from("captain_drafts")
        .select("id, status")
        .eq("tournament_id", tournamentId)
        .single()

      if (existingDraft && existingDraft.status === "drafting") {
        console.log("[v0] Found existing draft, redirecting:", existingDraft.id)
        if (onDraftStarted) {
          onDraftStarted(existingDraft.id)
        } else {
          router.push(`/draft/room/${existingDraft.id}`)
        }
        return
      }

      console.log("[v0] Tournament data loaded successfully")
    } catch (err) {
      console.error("[v0] Error loading tournament data:", err)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }

  const startTournamentDraft = async () => {
    if (!tournament || !user) return

    setStarting(true)
    try {
      console.log("[v0] Starting tournament draft with enhanced captain validation")

      const { data: captainsCheck, error: captainsError } = await supabase
        .from("tournament_player_pool")
        .select("user_id, captain_type, users(username, elo_rating)")
        .eq("tournament_id", tournamentId)
        .not("captain_type", "is", null)

      if (captainsError) {
        console.error("[v0] Error checking captains:", captainsError)
        toast.error("Failed to validate captains")
        return
      }

      if (!captainsCheck || captainsCheck.length < 2) {
        toast.error("Need at least 2 captains selected before starting draft")
        return
      }

      console.log("[v0] Found captains:", captainsCheck.length)

      const participantIds = participants.map((p) => p.user_id)

      const { data: existingDraftParticipants, error: conflictError } = await supabase
        .from("captain_draft_participants")
        .select(`
          user_id,
          captain_drafts!inner(status, id)
        `)
        .in("user_id", participantIds)
        .in("captain_drafts.status", ["waiting", "drafting", "active"])

      if (conflictError) {
        console.error("[v0] Error checking for draft conflicts:", conflictError)
      }

      if (existingDraftParticipants && existingDraftParticipants.length > 0) {
        const conflictingUsers = existingDraftParticipants.map((p) => p.user_id)
        const conflictingUsernames = participants
          .filter((p) => conflictingUsers.includes(p.user_id))
          .map((p) => p.users?.username)
          .join(", ")

        toast.error(`Cannot start draft: ${conflictingUsernames} are already in active drafts`)
        return
      }

      const sortedCaptains = captainsCheck.sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))
      const highestEloCaptain = sortedCaptains[0]
      const lowestEloCaptain = sortedCaptains[sortedCaptains.length - 1]

      console.log(
        "[v0] Using selected captains - Owner (highest ELO):",
        highestEloCaptain.users?.username,
        "ELO:",
        highestEloCaptain.users?.elo_rating,
        "First pick (lowest ELO):",
        lowestEloCaptain.users?.username,
        "ELO:",
        lowestEloCaptain.users?.elo_rating,
      )

      const { data: captainDraft, error: draftError } = await supabase
        .from("captain_drafts")
        .insert({
          tournament_id: tournament.id,
          captain1_id: lowestEloCaptain.user_id,
          captain2_id: highestEloCaptain.user_id,
          format: tournament.tournament_type.replace("_draft", ""),
          max_rounds: Math.floor(participants.length / 2),
          current_round: 1,
          current_pick: 1,
          current_captain: lowestEloCaptain.user_id,
          status: "drafting",
          tournament_owner: highestEloCaptain.user_id,
          tournament_mode: true,
          elo_difference: (highestEloCaptain.users?.elo_rating || 1200) - (lowestEloCaptain.users?.elo_rating || 1200),
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (draftError) throw draftError

      const { error: statusError } = await supabase
        .from("tournaments")
        .update({
          status: "drafting",
          start_date: new Date().toISOString(),
        })
        .eq("id", tournament.id)

      if (statusError) throw statusError

      const { error: poolUpdateError } = await supabase
        .from("tournament_participants")
        .update({
          status: "drafting",
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)
        .in("user_id", participantIds)

      if (poolUpdateError) {
        console.error("[v0] Error updating player pool status:", poolUpdateError)
      }

      await supabase
        .from("tournament_participants")
        .update({
          status: "captain",
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)
        .in("user_id", [highestEloCaptain.user_id, lowestEloCaptain.user_id])

      const draftParticipants = participants.map((p) => ({
        draft_id: captainDraft.id,
        user_id: p.user_id,
        is_captain: captainsCheck.some((c) => c.user_id === p.user_id),
        team: null,
        elo_rating: p.users?.elo_rating || 1200,
      }))

      const { error: participantsError } = await supabase.from("captain_draft_participants").insert(draftParticipants)

      if (participantsError) throw participantsError

      console.log("[v0] Tournament draft created successfully with proper captain validation:", captainDraft.id)
      toast.success("Tournament draft started! All players moved to draft system...")

      if (onDraftStarted) {
        onDraftStarted(captainDraft.id)
      } else {
        router.push(`/draft/room/${captainDraft.id}`)
      }
    } catch (err) {
      console.error("[v0] Error starting tournament draft:", err)
      toast.error(err instanceof Error ? err.message : "Failed to start tournament draft")
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament draft integration...</p>
        </CardContent>
      </Card>
    )
  }

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Tournament not found</p>
        </CardContent>
      </Card>
    )
  }

  const currentParticipants = participants.length
  const isCreator = tournament.created_by === user?.id
  const hasEnoughTeamsWithCaptains = teamsWithCaptains.length >= requiredTeams || captains.length >= 2
  const hasEnoughPlayers =
    currentParticipants >= requiredTeams * (tournament?.player_pool_settings?.players_per_team || 4)
  const canStartDraft =
    hasEnoughTeamsWithCaptains &&
    hasEnoughPlayers &&
    (tournament.status === "registration" || tournament.status === "captain_selection")

  const sortedParticipants = [...participants].sort(
    (a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200),
  )
  const highestEloPlayer = sortedParticipants[0]
  const lowestEloPlayer = sortedParticipants[sortedParticipants.length - 1]

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            Tournament Draft Integration
          </CardTitle>
          <CardDescription>
            Seamlessly transition from player pool to captain draft with ELO-based selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-700">{currentParticipants}</div>
              <div className="text-sm text-blue-600">Players Registered</div>
            </div>
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-700">{tournament.max_participants}</div>
              <div className="text-sm text-green-600">Max Capacity</div>
            </div>
            <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-purple-700">${tournament.prize_pool}</div>
              <div className="text-sm text-purple-600">Prize Pool</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Draft Readiness</span>
              <span className="font-medium">
                {Math.min(currentParticipants, requiredTeams * 4)}/{requiredTeams * 4} minimum players
              </span>
            </div>
            <Progress
              value={(Math.min(currentParticipants, requiredTeams * 4) / (requiredTeams * 4)) * 100}
              className="h-2"
            />
          </div>

          {canStartDraft && isCreator && (
            <Button onClick={startTournamentDraft} disabled={starting} className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              {starting ? "Starting Draft..." : "Start Tournament Draft"}
            </Button>
          )}

          {!canStartDraft && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">
                {!hasEnoughTeamsWithCaptains
                  ? `Need ${requiredTeams - teamsWithCaptains.length} more teams with captains assigned (${teamsWithCaptains.length}/${requiredTeams})`
                  : !hasEnoughPlayers
                    ? `Need ${requiredTeams * (tournament?.player_pool_settings?.players_per_team || 4) - currentParticipants} more players to fill all teams`
                    : tournament.status !== "registration" && tournament.status !== "captain_selection"
                      ? "Tournament has already started or captain selection is not complete"
                      : !isCreator
                        ? "Only the tournament creator can start the draft"
                        : "Ready to start draft"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {currentParticipants >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Captain Selection Preview
            </CardTitle>
            <CardDescription>Preview of ELO-based captain assignments for the draft</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">Tournament Owner</div>
                    <div className="text-sm text-yellow-600">Highest ELO Player</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-yellow-700">
                      {(highestEloPlayer?.users?.username || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{highestEloPlayer?.users?.username || "TBD"}</div>
                    <div className="text-sm text-muted-foreground">
                      {highestEloPlayer?.users?.elo_rating || 1200} ELO
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-800">First Pick Captain</div>
                    <div className="text-sm text-blue-600">Lowest ELO Player</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-blue-700">
                      {(lowestEloPlayer?.users?.username || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{lowestEloPlayer?.users?.username || "TBD"}</div>
                    <div className="text-sm text-muted-foreground">
                      {lowestEloPlayer?.users?.elo_rating || 1200} ELO
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ELO Difference:</span>
                <span className="font-medium">
                  {(highestEloPlayer?.users?.elo_rating || 1200) - (lowestEloPlayer?.users?.elo_rating || 1200)} points
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Draft Advantage:</span>
                <span className="font-medium text-blue-600">Lower ELO gets first pick</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-green-500" />
            Draft Flow Integration
          </CardTitle>
          <CardDescription>How the tournament integrates with the draft system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                1
              </div>
              <div>
                <div className="font-medium">Player Pool Registration</div>
                <div className="text-sm text-muted-foreground">
                  Players join the tournament player pool and are ranked by ELO
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-medium text-yellow-700">
                2
              </div>
              <div>
                <div className="font-medium">Captain Selection</div>
                <div className="text-sm text-muted-foreground">
                  Highest ELO becomes owner, lowest ELO gets first pick advantage
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-700">
                3
              </div>
              <div>
                <div className="font-medium">Draft Room Transition</div>
                <div className="text-sm text-muted-foreground">
                  Seamless transition to captain draft room with all participants
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700">
                4
              </div>
              <div>
                <div className="font-medium">Team Formation</div>
                <div className="text-sm text-muted-foreground">
                  Teams are automatically created from draft results for tournament play
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
