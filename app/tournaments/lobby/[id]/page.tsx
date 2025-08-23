"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Trophy, DollarSign, Crown, Target, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { TournamentDraftIntegration } from "@/components/tournaments/tournament-draft-integration"
import { TournamentBracket } from "@/components/tournaments/tournament-bracket"
import { liveBracketIntegrationService } from "@/lib/services/live-bracket-integration-service"

interface TournamentLobby {
  id: string
  name: string
  match_type: string
  max_participants: number
  prize_pool: number
  status: string
  created_at: string
  start_date?: string
  tournament_mode: boolean
  creator_id: string
  match_participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
}

export default function TournamentLobbyPage({ params }: { params: { id: string } }) {
  const [lobby, setLobby] = useState<TournamentLobby | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBracket, setShowBracket] = useState(false)
  const [bracketGenerated, setBracketGenerated] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadLobby = async () => {
    try {
      console.log("[v0] Loading tournament lobby:", params.id)

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          max_participants,
          prize_pool,
          status,
          created_at,
          start_date,
          tournament_mode,
          creator_id,
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", params.id)
        .single()

      if (matchError) throw matchError

      console.log("[v0] Loaded tournament lobby:", match)
      setLobby(match)
    } catch (err) {
      console.error("[v0] Error loading tournament lobby:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament lobby")
    } finally {
      setLoading(false)
    }
  }

  const joinPlayerPool = async () => {
    if (!isAuthenticated || !user || !lobby) {
      toast.error("Please log in to join the player pool")
      return
    }

    setJoining(true)
    try {
      console.log("[v0] Joining player pool for tournament:", lobby.id)

      const { data: existingParticipant, error: participantCheckError } = await supabase
        .from("match_participants")
        .select("id")
        .eq("match_id", lobby.id)
        .eq("user_id", user.id)
        .single()

      if (participantCheckError && participantCheckError.code !== "PGRST116") {
        throw participantCheckError
      }

      if (existingParticipant) {
        toast.success("You're already in the player pool!")
        return
      }

      const { error: joinError } = await supabase.from("match_participants").insert({
        match_id: lobby.id,
        user_id: user.id,
      })

      if (joinError) throw joinError

      toast.success("Successfully joined the player pool!")
      loadLobby() // Refresh lobby data
    } catch (err) {
      console.error("[v0] Error joining player pool:", err)
      toast.error(err instanceof Error ? err.message : "Failed to join player pool")
    } finally {
      setJoining(false)
    }
  }

  const startTournament = async () => {
    if (!lobby || lobby.creator_id !== user?.id) return

    try {
      console.log("[v0] Starting tournament with ELO-based captain selection")

      const participants = lobby.match_participants || []
      if (participants.length < 4) {
        toast.error("Need at least 4 players to start tournament")
        return
      }

      const sortedByElo = participants.sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))

      const highestElo = sortedByElo[0] // Highest ELO becomes tournament owner
      const lowestElo = sortedByElo[sortedByElo.length - 1] // Lowest ELO gets first pick

      console.log(
        "[v0] Selected captains - Highest ELO (owner):",
        highestElo.users?.username,
        "ELO:",
        highestElo.users?.elo_rating,
        "Lowest ELO (first pick):",
        lowestElo.users?.username,
        "ELO:",
        lowestElo.users?.elo_rating,
      )

      const { data: captainDraft, error: draftError } = await supabase
        .from("captain_drafts")
        .insert({
          match_id: lobby.id,
          captain1_id: lowestElo.user_id, // Lowest ELO gets first pick advantage
          captain2_id: highestElo.user_id, // Highest ELO is tournament owner
          format: lobby.match_type.replace("_draft", ""),
          max_rounds: Math.floor(participants.length / 2),
          current_round: 1,
          current_pick: 1,
          current_captain: lowestElo.user_id, // Lowest ELO starts drafting (first pick advantage)
          status: "drafting",
          tournament_owner: highestElo.user_id, // Highest ELO is tournament owner
          elo_difference: (highestElo.users?.elo_rating || 1200) - (lowestElo.users?.elo_rating || 1200),
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (draftError) throw draftError

      const draftParticipants = participants.map((p) => ({
        draft_id: captainDraft.id,
        user_id: p.user_id,
        is_captain: p.user_id === highestElo.user_id || p.user_id === lowestElo.user_id,
        team: null, // Will be assigned during draft
      }))

      const { error: participantsError } = await supabase.from("captain_draft_participants").insert(draftParticipants)

      if (participantsError) throw participantsError

      const { error: statusError } = await supabase
        .from("matches")
        .update({
          status: "drafting",
          start_date: new Date().toISOString(),
        })
        .eq("id", lobby.id)

      if (statusError) throw statusError

      toast.success("Tournament started! Redirecting to draft room...")
      router.push(`/draft/room/${captainDraft.id}`)
    } catch (err) {
      console.error("[v0] Error starting tournament:", err)
      toast.error(err instanceof Error ? err.message : "Failed to start tournament")
    }
  }

  const handleDraftStarted = (draftId: string) => {
    console.log("[v0] Draft started, redirecting to draft room:", draftId)
    router.push(`/draft/room/${draftId}`)
  }

  const handleGenerateBracket = async () => {
    if (!lobby) return

    try {
      console.log("[v0] Generating live bracket for tournament:", lobby.id)
      const result = await liveBracketIntegrationService.generateTournamentBracket(lobby.id)

      if (result.success) {
        setBracketGenerated(true)
        setShowBracket(true)
        toast.success("Live bracket generated successfully!")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error generating bracket:", error)
      toast.error("Failed to generate tournament bracket")
    }
  }

  useEffect(() => {
    loadLobby()
    const interval = setInterval(loadLobby, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading tournament lobby...</div>
      </div>
    )
  }

  if (error || !lobby) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">{error || "Tournament lobby not found"}</p>
            <Button onClick={() => router.push("/tournaments")} className="mt-4">
              Back to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentParticipants = lobby.match_participants?.length || 0
  const progressPercentage = (currentParticipants / lobby.max_participants) * 100
  const isCreator = lobby.creator_id === user?.id
  const isParticipant = lobby.match_participants?.some((p) => p.user_id === user?.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{lobby.name}</h1>
            <p className="text-muted-foreground">Tournament Player Pool</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {currentParticipants}/{lobby.max_participants} Players
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />${lobby.prize_pool} Prize Pool
          </Badge>
          <Badge variant={lobby.status === "waiting" ? "default" : "destructive"}>
            {lobby.status === "waiting" ? "Registration Open" : lobby.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Player Pool Progress
              </CardTitle>
              <CardDescription>Join the player pool to be drafted by team captains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Players Registered</span>
                  <span>
                    {currentParticipants}/{lobby.max_participants}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {!isParticipant && lobby.status === "waiting" && (
                <Button
                  onClick={joinPlayerPool}
                  disabled={joining || currentParticipants >= lobby.max_participants}
                  className="w-full"
                  size="lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {joining ? "Joining..." : "Join Player Pool"}
                </Button>
              )}

              {isParticipant && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">You're in the player pool!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Wait for the tournament to start and captains to draft you
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {currentParticipants >= 2 && (
            <TournamentDraftIntegration tournamentId={lobby.id} onDraftStarted={handleDraftStarted} />
          )}

          {currentParticipants >= 4 && lobby.status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Live Tournament Bracket
                </CardTitle>
                <CardDescription>
                  Real-time bracket with live match progression and spectator functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!bracketGenerated ? (
                  <div className="text-center py-6">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Generate the tournament bracket to start live matches</p>
                    {isCreator && (
                      <Button onClick={handleGenerateBracket} size="lg">
                        <Trophy className="h-4 w-4 mr-2" />
                        Generate Live Bracket
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Trophy className="h-3 w-3 mr-1" />
                          Live Bracket Active
                        </Badge>
                      </div>
                      <Button onClick={() => setShowBracket(!showBracket)} variant="outline" size="sm">
                        {showBracket ? "Hide Bracket" : "Show Bracket"}
                      </Button>
                    </div>

                    {showBracket && <TournamentBracket tournamentId={lobby.id} tournament={lobby} />}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Registered Players</CardTitle>
              <CardDescription>Players available for captain draft</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lobby.match_participants?.map((participant, index) => (
                  <div
                    key={participant.user_id}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                        {(participant.users?.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{participant.users?.username || "Unknown Player"}</div>
                        <div className="text-xs text-muted-foreground">{participant.users?.elo_rating || 1200} ELO</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                      {participant.user_id === lobby.creator_id && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Host
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {Array.from({ length: lobby.max_participants - currentParticipants }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border-dashed border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground">Waiting for player...</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{lobby.match_type.replace("_", " ").toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(lobby.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={lobby.status === "waiting" ? "default" : "destructive"}>{lobby.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tournament Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Crown className="h-4 w-4 mt-0.5 text-yellow-500" />
                <div>
                  <div className="font-medium">Captain Selection</div>
                  <div className="text-muted-foreground">Highest ELO becomes tournament owner</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <div className="font-medium">Draft Order</div>
                  <div className="text-muted-foreground">Lowest ELO captain gets first pick</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Trophy className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <div className="font-medium">Prize Distribution</div>
                  <div className="text-muted-foreground">Winners split the prize pool</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isCreator && lobby.status === "waiting" && currentParticipants >= 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium text-green-800 mb-2">Ready to Draft!</p>
                  <p className="text-sm text-green-600">Tournament has enough players to start the captain draft</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
