"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Crown, Target, Trophy, Clock, Star, Play, Zap, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { toast } from "sonner"

interface EloStyleTournamentProps {
  tournamentId: string
  tournament: any
}

interface PlayerPoolEntry {
  user_id: string
  username: string
  elo_rating: number
  status: string
  captain_type?: string
  joined_at: string
}

interface DraftPick {
  pick_number: number
  captain_id: string
  player_id: string
  player_username: string
  round: number
}

interface Team {
  captain_id: string
  captain_username: string
  captain_elo: number
  captain_type: string
  players: Array<{
    user_id: string
    username: string
    elo_rating: number
  }>
}

export function EloStyleTournament({ tournamentId, tournament }: EloStyleTournamentProps) {
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([])
  const [currentPhase, setCurrentPhase] = useState<
    "registration" | "captain_selection" | "drafting" | "round_robin" | "completed"
  >("registration")
  const [captains, setCaptains] = useState<any[]>([])
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [currentDraftTurn, setCurrentDraftTurn] = useState<string>("")
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournamentData = async () => {
    try {
      console.log("[v0] Loading ELO-style tournament data:", tournamentId)

      // Load player pool
      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          created_at,
          users (username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolError) throw poolError

      const players: PlayerPoolEntry[] = (poolData || []).map((entry: any) => ({
        user_id: entry.user_id,
        username: entry.users?.username || "Unknown",
        elo_rating: entry.users?.elo_rating || 1200,
        status: entry.status,
        captain_type: entry.captain_type,
        joined_at: entry.created_at,
      }))

      setPlayerPool(players)

      // Determine current phase based on data
      const availablePlayers = players.filter((p) => p.status === "available")
      const captainPlayers = players.filter((p) => p.status === "captain")
      const draftedPlayers = players.filter((p) => p.status === "drafted")

      if (captainPlayers.length === 0 && availablePlayers.length >= 4) {
        setCurrentPhase("registration")
      } else if (captainPlayers.length === 2 && draftedPlayers.length === 0) {
        setCurrentPhase("captain_selection")
        setCaptains(captainPlayers)
      } else if (captainPlayers.length === 2 && draftedPlayers.length > 0) {
        setCurrentPhase("drafting")
        setCaptains(captainPlayers)
        await loadDraftData()
      } else if (draftedPlayers.length === availablePlayers.length + captainPlayers.length - 2) {
        setCurrentPhase("round_robin")
        setCaptains(captainPlayers)
        await loadTeamsAndMatches()
      }

      console.log("[v0] Current phase determined:", currentPhase)
    } catch (error) {
      console.error("[v0] Error loading tournament data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }

  const loadDraftData = async () => {
    try {
      const { data: picks, error } = await supabase
        .from("tournament_draft_picks")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("pick_number", { ascending: true })

      if (error && !error.message.includes("does not exist")) throw error

      setDraftPicks(picks || [])

      // Determine whose turn it is in snake draft
      const totalPicks = picks?.length || 0
      const playersPerTeam = Math.floor((playerPool.length - 2) / 2) + 1 // Including captain

      if (totalPicks < playersPerTeam * 2 - 2) {
        // -2 because captains don't get picked
        const isFirstTeamTurn = Math.floor(totalPicks / 2) % 2 === 0
        const lowEloCaptain = captains.find((c) => c.captain_type === "low_elo")
        const highEloCaptain = captains.find((c) => c.captain_type === "high_elo")

        // Low ELO captain gets first pick advantage
        setCurrentDraftTurn(isFirstTeamTurn ? lowEloCaptain?.user_id : highEloCaptain?.user_id)
      }
    } catch (error) {
      console.error("[v0] Error loading draft data:", error)
    }
  }

  const loadTeamsAndMatches = async () => {
    try {
      // Build teams from draft results
      const builtTeams = buildTeamsFromDraft()
      setTeams(builtTeams)

      // Load matches
      const { data: matchData, error } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (error && !error.message.includes("does not exist")) {
        console.error("[v0] Error loading matches:", error)
      } else {
        setMatches(matchData || [])
      }
    } catch (error) {
      console.error("[v0] Error loading teams and matches:", error)
    }
  }

  const buildTeamsFromDraft = (): Team[] => {
    const teams: Team[] = []

    captains.forEach((captain) => {
      const captainPicks = draftPicks.filter((pick) => pick.captain_id === captain.user_id)
      const teamPlayers = captainPicks.map((pick) => {
        const player = playerPool.find((p) => p.user_id === pick.player_id)
        return {
          user_id: pick.player_id,
          username: pick.player_username,
          elo_rating: player?.elo_rating || 1200,
        }
      })

      teams.push({
        captain_id: captain.user_id,
        captain_username: captain.username,
        captain_elo: captain.elo_rating,
        captain_type: captain.captain_type,
        players: teamPlayers,
      })
    })

    return teams
  }

  const joinTournament = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to join the tournament")
      return
    }

    setProcessing(true)
    try {
      // Check if already joined
      const existingEntry = playerPool.find((p) => p.user_id === user.id)
      if (existingEntry) {
        toast.info("You're already in this tournament")
        return
      }

      const { error } = await supabase.from("tournament_player_pool").insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: "available",
      })

      if (error) throw error

      toast.success("Joined tournament successfully!")
      await loadTournamentData()
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
      toast.error("Failed to join tournament")
    } finally {
      setProcessing(false)
    }
  }

  const autoSelectCaptains = async () => {
    setProcessing(true)
    try {
      console.log("[v0] Auto-selecting captains ELO-style")

      const result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

      if (result.success) {
        toast.success("Captains selected! Draft starting soon...")
        await loadTournamentData()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error auto-selecting captains:", error)
      toast.error("Failed to select captains")
    } finally {
      setProcessing(false)
    }
  }

  const makeDraftPick = async (playerId: string) => {
    if (!user || currentDraftTurn !== user.id) return

    setProcessing(true)
    try {
      const pickNumber = draftPicks.length + 1
      const round = Math.floor(pickNumber / 2) + 1
      const selectedPlayer = playerPool.find((p) => p.user_id === playerId)

      // Insert draft pick
      const { error: pickError } = await supabase.from("tournament_draft_picks").insert({
        tournament_id: tournamentId,
        pick_number: pickNumber,
        round: round,
        captain_id: user.id,
        player_id: playerId,
        player_username: selectedPlayer?.username || "Unknown",
      })

      if (pickError) throw pickError

      // Update player status to drafted
      const { error: statusError } = await supabase
        .from("tournament_player_pool")
        .update({ status: "drafted" })
        .eq("tournament_id", tournamentId)
        .eq("user_id", playerId)

      if (statusError) throw statusError

      toast.success(`Drafted ${selectedPlayer?.username}!`)
      await loadTournamentData()
    } catch (error) {
      console.error("[v0] Error making draft pick:", error)
      toast.error("Failed to make draft pick")
    } finally {
      setProcessing(false)
    }
  }

  const generateMatches = async () => {
    setProcessing(true)
    try {
      const matchups = []

      // Generate all possible team matchups
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matchups.push({
            tournament_id: tournamentId,
            team1_captain_id: teams[i].captain_id,
            team2_captain_id: teams[j].captain_id,
            status: "pending",
            match_number: matchups.length + 1,
          })
        }
      }

      const { error } = await supabase.from("tournament_matches").insert(matchups)

      if (error) throw error

      toast.success("Round robin matches generated!")
      await loadTeamsAndMatches()
    } catch (error) {
      console.error("[v0] Error generating matches:", error)
      toast.error("Failed to generate matches")
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    loadTournamentData()

    const subscription = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Tournament update detected")
          loadTournamentData()
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
          <p className="mt-2 text-muted-foreground">Loading tournament...</p>
        </CardContent>
      </Card>
    )
  }

  const availablePlayers = playerPool.filter((p) => p.status === "available")
  const userInTournament = playerPool.find((p) => p.user_id === user?.id)
  const isUserCaptain = userInTournament?.status === "captain"
  const canJoin = !userInTournament && currentPhase === "registration"
  const canAutoSelect = availablePlayers.length >= 4 && captains.length === 0

  return (
    <div className="space-y-6">
      {/* Tournament Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament Progress
            <Button onClick={loadTournamentData} variant="outline" size="sm" className="ml-auto bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>ELO-based tournament with automatic captain selection and snake draft</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{playerPool.length} Players Registered</span>
              </div>
              <Badge variant={currentPhase === "registration" ? "default" : "secondary"}>
                {currentPhase.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <Progress
              value={
                currentPhase === "registration"
                  ? 25
                  : currentPhase === "captain_selection"
                    ? 50
                    : currentPhase === "drafting"
                      ? 75
                      : currentPhase === "round_robin"
                        ? 90
                        : 100
              }
              className="w-full"
            />

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div
                className={`text-center ${currentPhase === "registration" ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Registration
              </div>
              <div
                className={`text-center ${currentPhase === "captain_selection" ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Captains
              </div>
              <div
                className={`text-center ${currentPhase === "drafting" ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Draft
              </div>
              <div
                className={`text-center ${currentPhase === "round_robin" ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Matches
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase-specific content */}
      {currentPhase === "registration" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Registration
            </CardTitle>
            <CardDescription>Join the tournament pool. Need 4+ players to start captain selection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canJoin && (
              <Button onClick={joinTournament} disabled={processing} className="w-full">
                <Users className="h-4 w-4 mr-2" />
                {processing ? "Joining..." : "Join Tournament"}
              </Button>
            )}

            {canAutoSelect && (
              <Button
                onClick={autoSelectCaptains}
                disabled={processing}
                className="w-full bg-transparent"
                variant="outline"
              >
                <Zap className="h-4 w-4 mr-2" />
                {processing ? "Selecting..." : "Auto-Select Captains & Start Draft"}
              </Button>
            )}

            <div className="space-y-2">
              {availablePlayers.map((player, index) => (
                <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{player.username}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {player.elo_rating} ELO
                    </div>
                  </div>
                  {player.user_id === user?.id && <Badge variant="outline">You</Badge>}
                </div>
              ))}
            </div>

            {availablePlayers.length < 4 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Need {4 - availablePlayers.length} more players to start captain selection
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {currentPhase === "captain_selection" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Captains Selected
            </CardTitle>
            <CardDescription>
              Captains have been selected based on ELO ratings. Draft will begin automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {captains.map((captain) => (
                <div
                  key={captain.user_id}
                  className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <div>
                      <div className="font-bold">{captain.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {captain.elo_rating} ELO • {captain.captain_type?.replace("_", " ")} Captain
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentPhase === "drafting" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Snake Draft in Progress
            </CardTitle>
            <CardDescription>
              Captains take turns drafting players. Lower ELO captain picks first for balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentDraftTurn && (
              <Alert>
                <Play className="h-4 w-4" />
                <AlertDescription>
                  {currentDraftTurn === user?.id
                    ? "Your turn to pick!"
                    : `Waiting for ${playerPool.find((p) => p.user_id === currentDraftTurn)?.username} to pick...`}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availablePlayers.map((player) => (
                <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{player.username}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {player.elo_rating} ELO
                    </div>
                  </div>
                  {currentDraftTurn === user?.id && (
                    <Button onClick={() => makeDraftPick(player.user_id)} disabled={processing} size="sm">
                      Draft
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentPhase === "round_robin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Round Robin Matches
            </CardTitle>
            <CardDescription>All teams play each other. Submit scores after each match.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length === 0 && (
              <Button onClick={generateMatches} disabled={processing} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {processing ? "Generating..." : "Generate Round Robin Matches"}
              </Button>
            )}

            <div className="space-y-3">
              {teams.map((team) => (
                <div key={team.captain_id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold">{team.captain_username}'s Team</span>
                    <Badge variant="outline" className="text-xs">
                      {team.captain_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Players: {team.players.map((p) => p.username).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
