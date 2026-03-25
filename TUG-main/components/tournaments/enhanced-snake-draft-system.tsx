"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Crown,
  Star,
  Timer,
  Users,
  Target,
  TrendingUp,
  Brain,
  Zap,
  Shield,
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface SnakeDraftSystemProps {
  tournamentId: string
  playerPool: any[]
  userTeam?: {
    id: string
    name: string
    captain_id: string
    draft_order: number
  }
}

interface DraftState {
  status: "waiting" | "captain_selection" | "active" | "completed"
  current_round: number
  current_pick: number
  current_team_index: number
  current_team_id: string | null
  time_remaining: number
  draft_order: string[]
  pick_history: DraftPick[]
  teams: DraftTeam[]
}

interface DraftPick {
  pick_number: number
  team_id: string
  team_name: string
  player_id: string
  player_name: string
  player_elo: number
  timestamp: string
  round: number
}

interface DraftTeam {
  id: string
  name: string
  captain_id: string
  captain_name: string
  draft_order: number
  players: DraftPlayer[]
  team_value: number
  strategy_notes?: string
}

interface DraftPlayer {
  id: string
  username: string
  elo_rating: number
  position?: string
  csv_stats: {
    goals: number
    assists: number
    saves: number
    games_played: number
  }
  total_score: number
  draft_round?: number
}

export function EnhancedSnakeDraftSystem({ tournamentId, playerPool, userTeam }: SnakeDraftSystemProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<DraftPlayer[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [draftAnalytics, setDraftAnalytics] = useState<any>(null)
  const [pickSuggestions, setPickSuggestions] = useState<DraftPlayer[]>([])
  const [showAdvancedView, setShowAdvancedView] = useState<boolean>(false)
  const [draftTimer, setDraftTimer] = useState<number>(120)
  const [autoPickEnabled, setAutoPickEnabled] = useState<boolean>(false)

  const { user } = useAuth()
  const supabase = createClient()

  const isUserCaptain = userTeam?.captain_id === user?.id
  const isUserTurn = draftState?.current_team_id === userTeam?.id

  useEffect(() => {
    initializeDraft()
    setupRealTimeSubscriptions()
  }, [tournamentId])

  useEffect(() => {
    if (draftState?.status === "active") {
      generatePickSuggestions()
      updateDraftAnalytics()
    }
  }, [draftState, availablePlayers])

  useEffect(() => {
    if (isUserTurn && autoPickEnabled && draftTimer <= 10) {
      handleAutoPick()
    }
  }, [isUserTurn, autoPickEnabled, draftTimer])

  const initializeDraft = async () => {
    try {
      // Load tournament teams and draft order
      const { data: teams } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          draft_order,
          users!tournament_teams_team_captain_fkey(username)
        `)
        .eq("tournament_id", tournamentId)
        .order("draft_order")

      if (!teams || teams.length === 0) {
        throw new Error("No teams found for tournament")
      }

      // Initialize draft state
      const initialState: DraftState = {
        status: "waiting",
        current_round: 1,
        current_pick: 1,
        current_team_index: 0,
        current_team_id: teams[0].id,
        time_remaining: 120,
        draft_order: generateSnakeDraftOrder(teams),
        pick_history: [],
        teams: teams.map((team) => ({
          id: team.id,
          name: team.team_name,
          captain_id: team.team_captain,
          captain_name: team.users?.username || "Unknown",
          draft_order: team.draft_order,
          players: [],
          team_value: 0,
        })),
      }

      setDraftState(initialState)
      setAvailablePlayers(
        playerPool.map((player) => ({
          ...player,
          total_score:
            (player.csv_stats?.goals || 0) + (player.csv_stats?.assists || 0) + (player.csv_stats?.saves || 0),
        })),
      )
    } catch (error) {
      console.error("Error initializing draft:", error)
      toast.error("Failed to initialize draft")
    }
  }

  const generateSnakeDraftOrder = (teams: any[]): string[] => {
    const teamIds = teams.map((t) => t.id)
    const rounds = 6 // Assuming 6 rounds of drafting
    const order: string[] = []

    for (let round = 0; round < rounds; round++) {
      if (round % 2 === 0) {
        // Normal order (1, 2, 3, 4...)
        order.push(...teamIds)
      } else {
        // Reverse order (4, 3, 2, 1...)
        order.push(...[...teamIds].reverse())
      }
    }

    return order
  }

  const setupRealTimeSubscriptions = () => {
    const channel = supabase.channel(`snake-draft-${tournamentId}`)

    channel
      .on("broadcast", { event: "draft_update" }, (payload) => {
        setDraftState(payload.draft_state)
        if (payload.action === "player_picked") {
          updateAvailablePlayers(payload.player_id)
        }
      })
      .on("broadcast", { event: "timer_update" }, (payload) => {
        setDraftTimer(payload.time_remaining)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const startDraft = async () => {
    if (!isUserCaptain || !draftState) return

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_draft",
        }),
      })

      if (response.ok) {
        const updatedState = { ...draftState, status: "active" as const }
        setDraftState(updatedState)
        toast.success("Snake draft started!")
      }
    } catch (error) {
      console.error("Error starting draft:", error)
      toast.error("Failed to start draft")
    }
  }

  const draftPlayer = async (playerId: string) => {
    if (!isUserCaptain || !isUserTurn || !draftState) return

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_player",
          playerId: playerId,
          teamId: userTeam?.id,
        }),
      })

      if (response.ok) {
        const player = availablePlayers.find((p) => p.id === playerId)
        if (player) {
          const pick: DraftPick = {
            pick_number: draftState.current_pick,
            team_id: userTeam?.id || "",
            team_name: userTeam?.name || "",
            player_id: playerId,
            player_name: player.username,
            player_elo: player.elo_rating,
            timestamp: new Date().toISOString(),
            round: draftState.current_round,
          }

          // Update draft state
          const newState = calculateNextDraftState(draftState, pick)
          setDraftState(newState)
          updateAvailablePlayers(playerId)

          toast.success(`Drafted ${player.username}!`)
        }
      }
    } catch (error) {
      console.error("Error drafting player:", error)
      toast.error("Failed to draft player")
    }
  }

  const calculateNextDraftState = (currentState: DraftState, pick: DraftPick): DraftState => {
    const nextPick = currentState.current_pick + 1
    const totalPicks = currentState.draft_order.length
    const teamsCount = currentState.teams.length

    if (nextPick > totalPicks) {
      return {
        ...currentState,
        status: "completed",
        current_pick: nextPick,
        current_team_id: null,
        current_team_index: -1,
        pick_history: [...currentState.pick_history, pick],
      }
    }

    const nextTeamIndex = (nextPick - 1) % teamsCount
    const nextTeamId = currentState.draft_order[nextPick - 1]
    const nextRound = Math.ceil(nextPick / teamsCount)

    return {
      ...currentState,
      current_pick: nextPick,
      current_round: nextRound,
      current_team_index: nextTeamIndex,
      current_team_id: nextTeamId,
      time_remaining: 120,
      pick_history: [...currentState.pick_history, pick],
    }
  }

  const updateAvailablePlayers = (draftedPlayerId: string) => {
    setAvailablePlayers((prev) => prev.filter((p) => p.id !== draftedPlayerId))
  }

  const generatePickSuggestions = () => {
    if (!draftState || !userTeam) return

    const userTeamData = draftState.teams.find((t) => t.id === userTeam.id)
    if (!userTeamData) return

    // Simple suggestion algorithm based on team needs and player value
    const suggestions = availablePlayers
      .sort((a, b) => {
        // Prioritize by total score and ELO
        const aValue = a.total_score * 0.7 + (a.elo_rating / 2000) * 0.3
        const bValue = b.total_score * 0.7 + (b.elo_rating / 2000) * 0.3
        return bValue - aValue
      })
      .slice(0, 5)

    setPickSuggestions(suggestions)
  }

  const updateDraftAnalytics = () => {
    if (!draftState) return

    const analytics = {
      averageEloByTeam: draftState.teams.map((team) => ({
        teamName: team.name,
        averageElo:
          team.players.length > 0 ? team.players.reduce((sum, p) => sum + p.elo_rating, 0) / team.players.length : 0,
      })),
      topPicks: draftState.pick_history.slice(0, 10),
      draftProgress: (draftState.current_pick / draftState.draft_order.length) * 100,
    }

    setDraftAnalytics(analytics)
  }

  const handleAutoPick = () => {
    if (pickSuggestions.length > 0) {
      draftPlayer(pickSuggestions[0].id)
    }
  }

  const getTeamByDraftOrder = (order: number) => {
    return draftState?.teams.find((t) => t.draft_order === order)
  }

  const getCurrentPickingTeam = () => {
    if (!draftState) return null
    return draftState.teams.find((t) => t.id === draftState.current_team_id)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!draftState) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading snake draft...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Draft Status Header */}
      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-green-600" />
            Snake Draft Tournament
            <Badge
              variant="secondary"
              className={`${
                draftState.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {draftState.status === "active" ? "Live Draft" : draftState.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            {draftState.status === "active"
              ? `Round ${draftState.current_round} • Pick ${draftState.current_pick} of ${draftState.draft_order.length}`
              : "Snake draft with alternating pick order each round"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{draftState.current_round}</div>
              <div className="text-sm text-muted-foreground">Current Round</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{draftState.current_pick}</div>
              <div className="text-sm text-muted-foreground">Current Pick</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{availablePlayers.length}</div>
              <div className="text-sm text-muted-foreground">Players Left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatTime(draftTimer)}</div>
              <div className="text-sm text-muted-foreground">Time Remaining</div>
            </div>
          </div>

          {draftState.status === "active" && (
            <div className="mt-4">
              <Progress value={(draftState.current_pick / draftState.draft_order.length) * 100} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1 text-center">
                Draft Progress: {Math.round((draftState.current_pick / draftState.draft_order.length) * 100)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Pick Status */}
      {draftState.status === "active" && (
        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-yellow-600" />
              Current Pick
              {draftTimer <= 30 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Time Running Out!
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isUserTurn ? "Your turn to pick!" : `${getCurrentPickingTeam()?.name} is picking`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarFallback className="text-lg font-bold">
                    {getCurrentPickingTeam()?.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-lg">{getCurrentPickingTeam()?.name}</div>
                  <div className="text-sm text-muted-foreground">Captain: {getCurrentPickingTeam()?.captain_name}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-600">{formatTime(draftTimer)}</div>
                <div className="text-sm text-muted-foreground">Pick Timer</div>
              </div>
            </div>

            {isUserTurn && (
              <div className="mt-4 p-4 bg-yellow-100 rounded-lg border-2 border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-yellow-800">Your Turn to Pick!</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-yellow-700">Auto-pick if time runs out:</label>
                    <input
                      type="checkbox"
                      checked={autoPickEnabled}
                      onChange={(e) => setAutoPickEnabled(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>
                {selectedPlayer && (
                  <Button
                    onClick={() => draftPlayer(selectedPlayer)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Draft Selected Player
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players">Available Players</TabsTrigger>
          <TabsTrigger value="teams">Team Rosters</TabsTrigger>
          <TabsTrigger value="history">Draft History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Available Players
                <Badge variant="secondary">{availablePlayers.length} remaining</Badge>
              </CardTitle>
              {isUserTurn && pickSuggestions.length > 0 && (
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Suggested picks based on team needs and player value
                  </div>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="grid gap-3">
                  {availablePlayers.map((player, index) => {
                    const isSuggested = pickSuggestions.some((p) => p.id === player.id)
                    const isSelected = selectedPlayer === player.id

                    return (
                      <Card
                        key={player.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : isSuggested
                              ? "border-purple-300 bg-purple-50"
                              : "hover:shadow-md hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-bold min-w-[2rem]">
                                  #{index + 1}
                                </Badge>
                                {isSuggested && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    <Brain className="h-3 w-3 mr-1" />
                                    Suggested
                                  </Badge>
                                )}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-sm font-medium">
                                  {player.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">{player.username}</div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    <span>ELO: {player.elo_rating}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    <span>Score: {player.total_score}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                G:{player.csv_stats?.goals || 0} A:{player.csv_stats?.assists || 0} S:
                                {player.csv_stats?.saves || 0}
                              </div>
                              {isUserTurn && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    draftPlayer(player.id)
                                  }}
                                  className="mt-2"
                                >
                                  Draft
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {draftState.teams.map((team, index) => {
              const isUserTeamCard = team.id === userTeam?.id
              const teamValue = team.players.reduce((sum, p) => sum + p.total_score, 0)
              const averageElo =
                team.players.length > 0
                  ? Math.round(team.players.reduce((sum, p) => sum + p.elo_rating, 0) / team.players.length)
                  : 0

              return (
                <Card
                  key={team.id}
                  className={`transition-all duration-300 ${
                    isUserTeamCard ? "border-blue-500 bg-blue-50 shadow-lg" : "hover:shadow-md"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className={`h-5 w-5 ${isUserTeamCard ? "text-blue-600" : "text-gray-500"}`} />
                      {team.name}
                      {isUserTeamCard && (
                        <Badge variant="default" className="bg-blue-600">
                          Your Team
                        </Badge>
                      )}
                      <Badge variant="outline" className="ml-auto">
                        Pick #{team.draft_order}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Captain: {team.captain_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">{team.players.length}</div>
                          <div className="text-xs text-muted-foreground">Players</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">{averageElo}</div>
                          <div className="text-xs text-muted-foreground">Avg ELO</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">{teamValue}</div>
                          <div className="text-xs text-muted-foreground">Team Value</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Roster</div>
                        <ScrollArea className="h-32">
                          <div className="space-y-1">
                            {team.players.length === 0 ? (
                              <div className="text-center text-muted-foreground py-4">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No players drafted yet</p>
                              </div>
                            ) : (
                              team.players.map((player, playerIndex) => (
                                <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {player.username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm flex-1">{player.username}</span>
                                  <Badge variant="outline" className="text-xs">
                                    R{player.draft_round}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {player.elo_rating}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                Draft History
                <Badge variant="secondary">{draftState.pick_history.length} picks made</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {draftState.pick_history.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No picks made yet</p>
                    <p className="text-sm">Draft history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftState.pick_history.map((pick, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-bold">
                            #{pick.pick_number}
                          </Badge>
                          <div>
                            <div className="font-medium">{pick.player_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {pick.team_name} • Round {pick.round} • ELO: {pick.player_elo}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(pick.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Draft Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{Math.round((draftState.current_pick / draftState.draft_order.length) * 100)}%</span>
                    </div>
                    <Progress value={(draftState.current_pick / draftState.draft_order.length) * 100} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{draftState.current_round}</div>
                      <div className="text-sm text-muted-foreground">Current Round</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{6 - draftState.current_round}</div>
                      <div className="text-sm text-muted-foreground">Rounds Left</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Team Strength
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {draftAnalytics?.averageEloByTeam?.map((team: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{team.teamName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{Math.round(team.averageElo)}</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${(team.averageElo / 2000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Draft Controls */}
      {draftState.status === "waiting" && isUserCaptain && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={startDraft} className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Start Snake Draft
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
