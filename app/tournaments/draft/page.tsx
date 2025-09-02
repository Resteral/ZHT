"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Users, Crown, Target, Trophy, ArrowLeft, Shuffle, TrendingUp, Zap } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { tournamentDraftService } from "@/lib/services/tournament-draft-service"

interface Player {
  id: string
  username: string
  elo_rating: number
  status: string
  captain_type?: string
}

interface DraftSettings {
  captain_selection_method: "top_elo" | "random" | "manual"
  draft_type: "snake" | "linear" | "auction"
  players_per_team: number
  max_teams: number
}

export default function TournamentDraftPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get("tournament")

  const [tournament, setTournament] = useState<any>(null)
  const [playerPool, setPlayerPool] = useState<Player[]>([])
  const [captains, setCaptains] = useState<Player[]>([])
  const [draftSettings, setDraftSettings] = useState<DraftSettings>({
    captain_selection_method: "top_elo",
    draft_type: "snake",
    players_per_team: 6,
    max_teams: 2,
  })
  const [draftState, setDraftState] = useState<any>(null)
  const [currentTurn, setCurrentTurn] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"setup" | "captain_selection" | "drafting" | "complete">("setup")

  const supabase = createClient()

  useEffect(() => {
    if (!tournamentId) {
      router.push("/tournaments")
      return
    }
    loadTournamentData()
  }, [tournamentId])

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading tournament draft data for:", tournamentId)

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      setTournament(tournamentData)
      console.log("[v0] Tournament loaded:", tournamentData.name)

      // Load player pool
      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolError) throw poolError

      const players =
        poolData?.map((entry: any) => ({
          id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
          status: entry.status,
          captain_type: entry.captain_type,
        })) || []

      setPlayerPool(players)

      const currentCaptains = players.filter((p) => p.status === "captain")
      setCaptains(currentCaptains)

      // Determine current phase
      if (currentCaptains.length === 0) {
        setPhase("captain_selection")
      } else if (currentCaptains.length === 2) {
        // Check if draft has started
        const { data: draftData } = await tournamentDraftService.getDraftState(tournamentId)
        if (draftData?.status === "active") {
          setPhase("drafting")
          setDraftState(draftData)
        } else {
          setPhase("captain_selection")
        }
      }

      console.log("[v0] Player pool loaded:", players.length, "players")
      console.log("[v0] Current captains:", currentCaptains.length)

      setLoading(false)
    } catch (err) {
      console.error("[v0] Error loading tournament data:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
      setLoading(false)
    }
  }

  const handleCaptainSelection = async () => {
    try {
      console.log("[v0] Starting captain selection with method:", draftSettings.captain_selection_method)

      let result
      if (draftSettings.captain_selection_method === "top_elo") {
        result = await captainSelectionService.selectCaptainsAutomatically(tournamentId!)
      } else if (draftSettings.captain_selection_method === "random") {
        // Implement random selection
        const availablePlayers = playerPool.filter((p) => p.status === "available")
        if (availablePlayers.length < 2) {
          throw new Error("Need at least 2 players for captain selection")
        }

        // Randomly select 2 players
        const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5)
        const randomCaptains = shuffled.slice(0, 2)

        result = await captainSelectionService.selectCaptainsManually(
          tournamentId!,
          randomCaptains.map((p) => p.id),
        )
      }

      if (result?.success) {
        setCaptains(result.captains)
        setPhase("drafting")
        console.log("[v0] Captains selected successfully:", result.captains)
      } else {
        throw new Error(result?.message || "Failed to select captains")
      }
    } catch (err) {
      console.error("[v0] Error selecting captains:", err)
      setError(err instanceof Error ? err.message : "Failed to select captains")
    }
  }

  const startDraft = async () => {
    try {
      console.log("[v0] Starting draft for tournament:", tournamentId)
      const result = await tournamentDraftService.startDraft(tournamentId!, user?.id!)

      if (result) {
        setDraftState(result)
        setPhase("drafting")
        console.log("[v0] Draft started successfully")
      }
    } catch (err) {
      console.error("[v0] Error starting draft:", err)
      setError(err instanceof Error ? err.message : "Failed to start draft")
    }
  }

  const draftPlayer = async (playerId: string) => {
    if (!draftState || !user) return

    try {
      console.log("[v0] Drafting player:", playerId)
      const currentTeam = draftState.teams?.[draftState.current_team_index]

      if (currentTeam) {
        const result = await tournamentDraftService.draftPlayer(tournamentId!, playerId, currentTeam.id, user.id)

        if (result) {
          setDraftState(result)
          setSelectedPlayer(null)
          console.log("[v0] Player drafted successfully")
        }
      }
    } catch (err) {
      console.error("[v0] Error drafting player:", err)
      setError(err instanceof Error ? err.message : "Failed to draft player")
    }
  }

  const isUserTurn = () => {
    if (!draftState || !user) return false
    const currentTeam = draftState.teams?.[draftState.current_team_index]
    return currentTeam?.captain_id === user.id
  }

  const availablePlayers = playerPool.filter((p) => p.status === "available")
  const draftedPlayers = playerPool.filter((p) => p.status === "drafted")

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tournament draft...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error || "Tournament not found"}</p>
          <Button onClick={() => router.push("/tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/tournaments")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tournaments
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <p className="text-lg text-muted-foreground">Tournament Draft Room</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {phase.replace("_", " ")}
          </Badge>
          <Badge variant="secondary">{playerPool.length} Players</Badge>
        </div>
      </div>

      {/* Phase: Captain Selection Setup */}
      {phase === "captain_selection" && captains.length === 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-blue-500" />
              Captain Selection Settings
            </CardTitle>
            <CardDescription>Configure how captains will be selected from the player pool</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Captain Selection Method</label>
                <Select
                  value={draftSettings.captain_selection_method}
                  onValueChange={(value: any) =>
                    setDraftSettings((prev) => ({ ...prev, captain_selection_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top_elo">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Top ELO Players
                      </div>
                    </SelectItem>
                    <SelectItem value="random">
                      <div className="flex items-center gap-2">
                        <Shuffle className="h-4 w-4" />
                        Random Selection
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Draft Type</label>
                <Select
                  value={draftSettings.draft_type}
                  onValueChange={(value: any) => setDraftSettings((prev) => ({ ...prev, draft_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snake">Snake Draft</SelectItem>
                    <SelectItem value="linear">Linear Draft</SelectItem>
                    <SelectItem value="auction">Auction Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Ready to Select Captains</p>
                <p className="text-sm text-muted-foreground">
                  {availablePlayers.length} players available for captain selection
                </p>
              </div>
              <Button
                onClick={handleCaptainSelection}
                disabled={availablePlayers.length < 2}
                className="flex items-center gap-2"
              >
                {draftSettings.captain_selection_method === "top_elo" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                Select Captains
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase: Captains Selected, Ready to Draft */}
      {phase === "captain_selection" && captains.length === 2 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-green-500" />
              Captains Selected
            </CardTitle>
            <CardDescription>Captains have been chosen and are ready to start drafting players</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {captains.map((captain, index) => (
                <div key={captain.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{captain.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{captain.username}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>ELO: {captain.elo_rating}</span>
                      <Badge variant="outline" className="text-xs">
                        {captain.captain_type === "high_elo" ? "High ELO" : "Low ELO"}
                      </Badge>
                    </div>
                  </div>
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
              ))}
            </div>

            <Button onClick={startDraft} className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Start Draft
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase: Active Drafting */}
      {phase === "drafting" && draftState && (
        <div className="space-y-6">
          {/* Draft Status */}
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Draft in Progress
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Round {draftState.current_round}</Badge>
                  <Badge variant="outline">Pick {draftState.current_pick}</Badge>
                </div>
              </CardTitle>
              <CardDescription>
                {isUserTurn() ? "It's your turn to draft!" : "Waiting for captain to make their pick"}
              </CardDescription>
            </CardHeader>
            {draftState.time_remaining && (
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Time Remaining</span>
                  <span className="text-lg font-bold">
                    {Math.floor(draftState.time_remaining / 60)}:
                    {(draftState.time_remaining % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <Progress value={((120 - draftState.time_remaining) / 120) * 100} />
              </CardContent>
            )}
          </Card>

          {/* Available Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Available Players ({availablePlayers.length})
              </CardTitle>
              <CardDescription>Players available for drafting, ranked by ELO rating</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {availablePlayers
                  .sort((a, b) => b.elo_rating - a.elo_rating)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedPlayer === player.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedPlayer(player.id)}
                    >
                      <Badge variant="secondary" className="min-w-[2rem]">
                        #{index + 1}
                      </Badge>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{player.username}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Target className="h-3 w-3" />
                          <span>ELO: {player.elo_rating}</span>
                        </div>
                      </div>
                      {isUserTurn() && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            draftPlayer(player.id)
                          }}
                        >
                          Draft
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Rosters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Team Rosters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {draftState.teams?.map((team: any, index: number) => (
                  <Card
                    key={team.id}
                    className={`${draftState.current_team_index === index ? "border-amber-500 bg-amber-50" : ""}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Captain: {team.captain_name}</p>
                        </div>
                        <Badge variant="outline">
                          {team.players?.length || 0}/{draftSettings.players_per_team}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 min-h-[120px]">
                        {team.players?.length > 0 ? (
                          team.players.map((player: any) => (
                            <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {player.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{player.username}</p>
                                <p className="text-xs text-muted-foreground">ELO: {player.elo_rating}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No players drafted</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player Pool Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Player Pool Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{availablePlayers.length}</div>
              <div className="text-sm text-blue-800">Available</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{captains.length}</div>
              <div className="text-sm text-amber-800">Captains</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{draftedPlayers.length}</div>
              <div className="text-sm text-green-800">Drafted</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
