"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Users, Clock, Crown, Gamepad2, Target, Zap, Download, TrendingUp } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"

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
  const [eloLeaguePlayers, setEloLeaguePlayers] = useState<ELOLeaguePlayer[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchActiveLobbies = useCallback(async () => {
    try {
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "waiting") // Only waiting lobbies
        .order("created_at", { ascending: false })

      const formattedActiveLobbies = (matchesData || []).map((match) => ({
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
      }))

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
      await Promise.all([fetchActiveLobbies(), fetchELOLeagueData()])
      setLoading(false)
    }

    loadData()

    const matchesSubscription = supabase
      .channel("matches-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchActiveLobbies()
      })
      .subscribe()

    const usersSubscription = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        fetchELOLeagueData()
      })
      .subscribe()

    return () => {
      matchesSubscription.unsubscribe()
      usersSubscription.unsubscribe()
    }
  }, [fetchActiveLobbies, fetchELOLeagueData])

  const exportToCSV = () => {
    const headers = [
      "Rank",
      "Username",
      "ELO Rating",
      "Wins",
      "Losses",
      "Win %",
      "Total Games",
      "Goals",
      "Assists",
      "Steals",
      "Turnovers",
      "Goals Saved",
      "Goals Allowed",
      "Pick Ups",
    ]

    const csvContent = [
      headers.join(","),
      ...eloLeaguePlayers.map((player) =>
        [
          player.rank,
          player.username,
          player.elo_rating,
          player.wins,
          player.losses,
          player.win_percentage,
          player.total_games,
          player.goals,
          player.assists,
          player.steals,
          player.turnovers,
          player.goals_saved,
          player.goals_allowed,
          player.pick_ups,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `elo-league-stats-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500"
      case "active":
      case "drafting":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getGameModeIcon = (gameMode: string) => {
    if (gameMode.includes("1v1")) return <Target className="h-4 w-4" />
    if (gameMode.includes("2v2")) return <Users className="h-4 w-4" />
    if (gameMode.includes("3v3")) return <Crown className="h-4 w-4" />
    if (gameMode.includes("4v4")) return <Trophy className="h-4 w-4" />
    return <Gamepad2 className="h-4 w-4" />
  }

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
            {lobby.current_participants}/{lobby.max_participants} Players
          </span>
        </div>

        {lobby.prize_pool > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-green-600 font-semibold">
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
            <Link href={`/leagues/lobby/${lobby.id}`}>
              <Zap className="h-3 w-3 mr-1" />
              Join Lobby
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Lobbies & ELO League</h1>
        <p className="text-slate-200">Join active lobbies and compete in the ELO League</p>
      </div>

      <div className="mb-8 grid md:grid-cols-1 gap-6">
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Create ELO Draft Lobby
            </CardTitle>
            <CardDescription>Start a new ELO draft in any format (1v1 to 6v6)</CardDescription>
          </CardHeader>
          <CardContent>
            <UnifiedDraftSelector buttonText="Create Draft Lobby" buttonSize="lg" className="w-full" mode="create" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lobbies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lobbies">Active Lobbies ({activeLobbies.length})</TabsTrigger>
          <TabsTrigger value="elo-league">ELO League</TabsTrigger>
        </TabsList>

        <TabsContent value="lobbies" className="mt-6">
          {activeLobbies.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Lobbies</h3>
                <p className="text-slate-200 mb-4">Create a new ELO draft lobby to get started!</p>
                <UnifiedDraftSelector buttonText="Create ELO Draft" mode="create" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeLobbies.map((lobby) => (
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
                                  className={`h-4 w-4 ${
                                    player.rank === 1
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
                              className={`font-medium ${
                                player.win_percentage >= 70
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
