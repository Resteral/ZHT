"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Users, Clock, Crown, Gamepad2, Target, Zap, Download, TrendingUp, DollarSign, Wallet } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"
import { lobbyQueueService, type LobbyQueue } from "@/lib/services/lobby-queue-service"
import { toast } from "sonner"

interface Lobby {
  id: string
  name: string
  game_mode: string
  max_participants: number
  current_participants: number
  entry_fee: number
  prize_pool: number
  status: string
  created_at: string
  type: "lobby" | "tournament"
  tournament_type?: string
}

interface ELOLeaguePlayer {
  id: string
  username: string
  elo_rating: number
  wins: number
  losses: number
  goals: number
  assists: number
  steals: number
  turnovers: number
  goals_saved: number
  goals_allowed: number
  pick_ups: number
  total_games: number
  win_percentage: number
  rank: number
}

export default function LobbiesPage() {
  const [activeLobbies, setActiveLobbies] = useState<Lobby[]>([])
  const [queues, setQueues] = useState<LobbyQueue[]>([])
  const [eloLeaguePlayers, setEloLeaguePlayers] = useState<ELOLeaguePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningQueue, setJoiningQueue] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<string>("Omega Strikers")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchQueues = useCallback(async () => {
    try {
      const allQueues = await lobbyQueueService.getAllQueues()
      setQueues(allQueues)
    } catch (error) {
      console.error("Error fetching queues:", error)
    }
  }, [])

  const fetchActiveLobbies = useCallback(async () => {
    try {
      const { data: matchesData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "drafting")
        .order("created_at", { ascending: false })

      const { data: legacyMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })

      const formattedActiveLobbies = [
        ...(matchesData || []).map((t) => ({
          id: t.id,
          name: t.name,
          game_mode: t.player_pool_settings?.draft_mode || "Draft",
          max_participants: t.max_participants,
          current_participants: 0,
          entry_fee: t.entry_fee || 0,
          prize_pool: t.prize_pool || 0,
          status: t.status,
          created_at: t.created_at,
          type: "tournament" as const,
          game: t.game || "Omega Strikers"
        })),
        ...(legacyMatches || []).map((match) => ({
          id: match.id,
          name: match.name || `${match.match_type} Lobby`,
          game_mode: match.match_type || "ELO Draft",
          max_participants: match.max_participants || 8,
          current_participants: match.current_participants || 0,
          entry_fee: 0,
          prize_pool: match.prize_pool || 0,
          status: match.status,
          created_at: match.created_at,
          type: "lobby" as const,
          game: "Omega Strikers"
        }))
      ]

      setActiveLobbies(formattedActiveLobbies)
    } catch (error) {
      console.error("Error fetching active lobbies:", error)
    }
  }, [])

  const fetchELOLeagueData = useCallback(async () => {
    try {
      const { data: playersData } = await supabase
        .from("users")
        .select(`
          id,
          username,
          elo_rating,
          wins,
          losses,
          total_games,
          goals,
          assists,
          steals,
          turnovers,
          goals_saved,
          goals_allowed,
          pick_ups
        `)
        .gte("total_games", 1) // Only players who have played games
        .order("elo_rating", { ascending: false })
        .limit(100)

      const formattedPlayers: ELOLeaguePlayer[] = (playersData || []).map((player, index) => ({
        id: player.id,
        username: player.username || "Unknown",
        elo_rating: player.elo_rating || 1200,
        wins: player.wins || 0,
        losses: player.losses || 0,
        goals: player.goals || 0,
        assists: player.assists || 0,
        steals: player.steals || 0,
        turnovers: player.turnovers || 0,
        goals_saved: player.goals_saved || 0,
        goals_allowed: player.goals_allowed || 0,
        pick_ups: player.pick_ups || 0,
        total_games: player.total_games || 0,
        win_percentage: player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0,
        rank: index + 1,
      }))

      setEloLeaguePlayers(formattedPlayers)
    } catch (error) {
      console.error("Error fetching ELO league data:", error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchQueues(), fetchActiveLobbies(), fetchELOLeagueData()])

      // Ensure persistent lobbies exist
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await lobbyQueueService.ensurePersistentLobbies(user.id)
        // Refetch to show the newly created lobbies
        fetchActiveLobbies()
      }

      setLoading(false)
    }

    loadData()

    const queueSub = supabase.channel('lobby_queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_queue' }, fetchQueues)
      .subscribe()

    const matchesSubscription = supabase
      .channel("matches-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, fetchActiveLobbies)
      .subscribe()

    const usersSubscription = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchELOLeagueData)
      .subscribe()

    return () => {
      queueSub.unsubscribe()
      matchesSubscription.unsubscribe()
      usersSubscription.unsubscribe()
    }
  }, [fetchQueues, fetchActiveLobbies, fetchELOLeagueData])

  const handleJoinQueue = async (queue: LobbyQueue) => {
    try {
      setJoiningQueue(`${queue.queue_type}-${queue.entry_fee}`)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please login to join a queue")
        return
      }

      await lobbyQueueService.joinQueue(
        user.id,
        selectedGame,
        queue.queue_type,
        queue.game_format as any,
        queue.player_count,
        queue.entry_fee
      )
      toast.success(`Joined ${selectedGame} ${queue.entry_fee > 0 ? `$${queue.entry_fee}` : "Free"} Queue!`)
      fetchQueues()
    } catch (error: any) {
      toast.error(error.message || "Failed to join queue")
    } finally {
      setJoiningQueue(null)
    }
  }

  const handleLeaveQueue = async () => {
    try {
      setJoiningQueue("leave")
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await lobbyQueueService.leaveQueue(user.id)
      toast.success("Left queue")
      fetchQueues()
    } catch (error: any) {
      toast.error("Failed to leave queue")
    } finally {
      setJoiningQueue(null)
    }
  }

  // ... (exportToCSV, getStatusColor, getGameModeIcon unchanged)

  const displayedQueues = queues.filter(q => q.game === selectedGame)
  const displayedLobbies = activeLobbies.filter(l => (l as any).game === selectedGame || (!l.tournament_type && selectedGame === "Omega Strikers"))

  const LobbyCard = ({ lobby }: { lobby: Lobby }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getGameModeIcon(lobby.game_mode)}
            {lobby.name}
          </CardTitle>
          <Badge className={`${getStatusColor(lobby.status)} text-white`}>
            {lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {lobby.max_participants} Slots
          </span>
          {lobby.entry_fee > 0 ? (
            <Badge variant="outline" className="border-green-500 text-green-500">
              ${lobby.entry_fee} Entry
            </Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </div>

        {lobby.prize_pool > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-green-500 font-semibold">
              <Trophy className="h-4 w-4" />
              Prize: ${lobby.prize_pool}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-slate-200">
          <Clock className="h-3 w-3" />
          Created {new Date(lobby.created_at).toLocaleTimeString()}
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" className="flex-1 bg-primary hover:bg-primary/90">
            <Link href={lobby.type === 'tournament' ? `/draft/room/${lobby.id}` : `/leagues/lobby/${lobby.id}`}>
              <Zap className="h-3 w-3 mr-1" />
              Join Lobby
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const QueueCard = ({ queue }: { queue: LobbyQueue }) => {
    const isFree = queue.entry_fee === 0
    const isMaxed = queue.queue_type === "maxed"

    return (
      <Card className={`relative overflow-hidden border-2 transition-all hover:scale-105 ${!isFree ? "border-amber-500/50 hover:border-amber-500" : "hover:border-primary/50"
        }`}>
        {/* Background Gradient */}
        <div className={`absolute inset-0 opacity-10 ${!isFree ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-blue-500 to-cyan-500"
          }`} />

        <CardHeader>
          <CardTitle className="flex justify-between items-start">
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-1">
                {queue.game_format.replace("_", " ")}
              </div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {isFree ? "Free Play" : `$${queue.entry_fee} Entry`}
                {!isFree && <DollarSign className="h-5 w-5 text-amber-500" />}
              </div>
            </div>
            {isMaxed && <Badge variant="secondary">Ranked</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Queue</span>
            </div>
            <div className="text-lg font-bold">
              {queue.current_players} <span className="text-muted-foreground text-sm">/ {queue.required_players}</span>
            </div>
          </div>

          {!isFree && (
            <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">Prize Pool</span>
              </div>
              <div className="text-lg font-bold text-amber-500">
                ${queue.entry_fee * queue.required_players}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className={`w-full ${!isFree ? "bg-amber-600 hover:bg-amber-700" : ""}`}
            onClick={() => handleJoinQueue(queue)}
            disabled={joiningQueue !== null}
          >
            {joiningQueue === `${queue.queue_type}-${queue.entry_fee}` ? (
              <span className="animate-pulse">Joining...</span>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Join {isFree ? "Free" : `$${queue.entry_fee}`} Queue
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-200">Loading lobbies...</p>
        </div>
      </div>
    )
  }

  const getGameModeIcon = (mode: string) => {
    switch (mode) {
      case "snake_draft":
        return <Users className="h-4 w-4" />
      case "captain_pick":
        return <Crown className="h-4 w-4" />
      default:
        return <Gamepad2 className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "waiting":
        return "bg-yellow-500"
      case "completed":
        return "bg-slate-500"
      default:
        return "bg-slate-500"
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Rank,Username,ELO,Wins,Losses,Win %,Goals,Assists,Steals,Turnovers,Saves,Goals Allowed,Pickups",
    ]
    const rows = eloLeaguePlayers.map((p) =>
      [
        p.rank,
        p.username,
        p.elo_rating,
        p.wins,
        p.losses,
        `${p.win_percentage}%`,
        p.goals,
        p.assists,
        p.steals,
        p.turnovers,
        p.goals_saved,
        p.goals_allowed,
        p.pick_ups,
      ].join(","),
    )

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "elo_league_standings.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Lobbies & ELO League</h1>
          <p className="text-slate-200">Join active lobbies and compete in the ELO League</p>
        </div>

        {/* Game Selector */}
        <div className="bg-muted p-1 rounded-lg flex gap-1">
          {["Omega Strikers", "Deadlock"].map(game => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedGame === game
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                }`}
            >
              {game}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" />
            Play {selectedGame} Now
          </h2>
          {queues.some(q => q.queued_users.some(u => true)) && (
            <Button variant="outline" onClick={handleLeaveQueue} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
              Leave All Queues
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedQueues.length > 0 ? displayedQueues.map((queue, i) => (
            <QueueCard key={i} queue={queue} />
          )) : (
            <div className="col-span-full text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              No active queues found for {selectedGame}.
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="lobbies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lobbies">Active Lobbies ({displayedLobbies.length})</TabsTrigger>
          <TabsTrigger value="elo-league">ELO League</TabsTrigger>
        </TabsList>

        <TabsContent value="lobbies" className="mt-6">
          {displayedLobbies.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Lobbies for {selectedGame}</h3>
                <p className="text-slate-200 mb-4">Join a queue above to start a match!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeLobbies.map((lobby) => (
                // @ts-ignore
                <LobbyCard key={lobby.id} lobby={lobby} />
              ))}
            </div>
          )}
        </TabsContent>


        <TabsContent value="elo-league" className="mt-6">
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      ELO League - Automatic Leaderboard
                    </CardTitle>
                    <CardDescription>
                      Rankings based on win/loss ratio and comprehensive player statistics
                    </CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{eloLeaguePlayers.length}</div>
                    <div className="text-sm text-muted-foreground">Active Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {eloLeaguePlayers.length > 0
                        ? Math.round(
                          eloLeaguePlayers.reduce((sum, p) => sum + p.elo_rating, 0) / eloLeaguePlayers.length,
                        )
                        : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Average ELO</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {eloLeaguePlayers.reduce((sum, p) => sum + p.total_games, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Games</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Rank</th>
                        <th className="text-left p-2">Player</th>
                        <th className="text-left p-2">ELO</th>
                        <th className="text-left p-2">W/L</th>
                        <th className="text-left p-2">Win %</th>
                        <th className="text-left p-2">Goals</th>
                        <th className="text-left p-2">Assists</th>
                        <th className="text-left p-2">Steals</th>
                        <th className="text-left p-2">Turnovers</th>
                        <th className="text-left p-2">Saves</th>
                        <th className="text-left p-2">GA</th>
                        <th className="text-left p-2">Pickups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eloLeaguePlayers.slice(0, 50).map((player) => (
                        <tr key={player.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {player.rank <= 3 && (
                                <Trophy
                                  className={`h-4 w-4 ${player.rank === 1
                                    ? "text-yellow-500"
                                    : player.rank === 2
                                      ? "text-gray-400"
                                      : "text-amber-600"
                                    }`}
                                />
                              )}
                              #{player.rank}
                            </div>
                          </td>
                          <td className="p-2 font-medium">{player.username}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {player.elo_rating}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {player.wins}-{player.losses}
                          </td>
                          <td className="p-2">
                            <span
                              className={`font-medium ${player.win_percentage >= 70
                                ? "text-green-600"
                                : player.win_percentage >= 50
                                  ? "text-yellow-600"
                                  : "text-red-600"
                                }`}
                            >
                              {player.win_percentage}%
                            </span>
                          </td>
                          <td className="p-2">{player.goals}</td>
                          <td className="p-2">{player.assists}</td>
                          <td className="p-2">{player.steals}</td>
                          <td className="p-2">{player.turnovers}</td>
                          <td className="p-2">{player.goals_saved}</td>
                          <td className="p-2">{player.goals_allowed}</td>
                          <td className="p-2">{player.pick_ups}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {eloLeaguePlayers.length > 50 && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing top 50 players. Export CSV for complete rankings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
