"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp, Target, Clock, Star, Award, Zap, Crown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PlayerStats {
  overall: {
    total_matches: number
    wins: number
    losses: number
    draws: number
    win_rate: number
    current_elo: number
    peak_elo: number
    current_streak: number
    longest_win_streak: number
    total_earnings: number
    tournaments_won: number
    tournaments_participated: number
    total_playtime: number
  }
  by_game: {
    [game: string]: {
      matches_played: number
      wins: number
      losses: number
      win_rate: number
      current_elo: number
      peak_elo: number
      current_streak: number
      longest_win_streak: number
      earnings: number
      tournaments_won: number
      total_playtime: number
      last_played: string
    }
  }
  recent_performance: Array<{
    date: string
    elo_rating: number
    matches_played: number
    wins: number
    losses: number
  }>
}

interface PlayerStatsDashboardProps {
  userId: string
}

export function PlayerStatsDashboard({ userId }: PlayerStatsDashboardProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadPlayerStats()
  }, [userId])

  const loadPlayerStats = async () => {
    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("elo_rating, created_at")
        .eq("id", userId)
        .single()

      if (userError) throw userError

      // Get match statistics
      const { data: matchStats, error: matchError } = await supabase
        .from("match_participants")
        .select(`
          match_id,
          matches (
            status,
            winner_id,
            game,
            created_at,
            prize_pool
          )
        `)
        .eq("user_id", userId)

      if (matchError) throw matchError

      // Get tournament statistics
      const { data: tournamentStats, error: tournamentError } = await supabase
        .from("tournament_participants")
        .select(`
          tournament_id,
          tournaments (
            status,
            winner_id,
            created_at
          )
        `)
        .eq("user_id", userId)

      if (tournamentError) throw tournamentError

      const { data: eloHistory, error: eloHistoryError } = await supabase
        .from("elo_history")
        .select("elo_rating, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30)

      if (eloHistoryError) console.error("ELO history error:", eloHistoryError)

      const recentPerformance =
        eloHistory?.map((entry) => ({
          date: new Date(entry.created_at).toLocaleDateString(),
          elo_rating: entry.elo_rating,
          matches_played: 1, // Estimate
          wins: entry.elo_rating > 1200 ? 1 : 0, // Estimate based on ELO
          losses: entry.elo_rating <= 1200 ? 1 : 0,
        })) || []

      // Calculate statistics from real data
      const completedMatches = matchStats?.filter((m) => m.matches?.status === "completed") || []
      const wins = completedMatches.filter((m) => m.matches?.winner_id === userId).length
      const losses = completedMatches.length - wins
      const winRate = completedMatches.length > 0 ? (wins / completedMatches.length) * 100 : 0

      const tournamentsWon = tournamentStats?.filter((t) => t.tournaments?.winner_id === userId).length || 0
      const totalEarnings = completedMatches.reduce((sum, m) => {
        if (m.matches?.winner_id === userId) {
          return sum + (m.matches?.prize_pool || 0)
        }
        return sum
      }, 0)

      // Group by game
      const gameStats: { [game: string]: any } = {}
      completedMatches.forEach((match) => {
        const game = match.matches?.game || "unknown"
        if (!gameStats[game]) {
          gameStats[game] = {
            matches_played: 0,
            wins: 0,
            losses: 0,
            win_rate: 0,
            current_elo: user?.elo_rating || 1200,
            peak_elo: user?.elo_rating || 1200,
            current_streak: 0,
            longest_win_streak: 0,
            earnings: 0,
            tournaments_won: 0,
            total_playtime: 0,
            last_played: match.matches?.created_at || new Date().toISOString(),
          }
        }

        gameStats[game].matches_played++
        if (match.matches?.winner_id === userId) {
          gameStats[game].wins++
          gameStats[game].earnings += match.matches?.prize_pool || 0
        } else {
          gameStats[game].losses++
        }
        gameStats[game].win_rate = (gameStats[game].wins / gameStats[game].matches_played) * 100
      })

      const peakElo =
        eloHistory && eloHistory.length > 0
          ? Math.max(...eloHistory.map((h) => h.elo_rating))
          : user?.elo_rating || 1200

      const realStats: PlayerStats = {
        overall: {
          total_matches: completedMatches.length,
          wins,
          losses,
          draws: 0,
          win_rate: winRate,
          current_elo: user?.elo_rating || 1200,
          peak_elo: peakElo, // Use calculated peak ELO
          current_streak: 0,
          longest_win_streak: 0,
          total_earnings: totalEarnings,
          tournaments_won: tournamentsWon,
          tournaments_participated: tournamentStats?.length || 0,
          total_playtime: Math.floor(completedMatches.length * 0.5), // Estimate
        },
        by_game: gameStats,
        recent_performance: recentPerformance, // Use real ELO performance data
      }

      setStats(realStats)
    } catch (error) {
      console.error("Error loading player stats:", error)
      // Fallback to empty stats
      setStats({
        overall: {
          total_matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          win_rate: 0,
          current_elo: 1200,
          peak_elo: 1200,
          current_streak: 0,
          longest_win_streak: 0,
          total_earnings: 0,
          tournaments_won: 0,
          tournaments_participated: 0,
          total_playtime: 0,
        },
        by_game: {},
        recent_performance: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const getGameIcon = (game: string) => {
    const icons = {
      "Omega Strikers": "⚽",
      "Counter Strike": "💥",
      "Rainbow Six Siege": "🛡️",
      "Call of Duty": "🎯",
      "Zealot Hockey": "🏒",
    }
    return icons[game as keyof typeof icons] || "🎮"
  }

  const getGameName = (game: string) => {
    return game.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="by-game">By Game</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Key Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.overall.win_rate.toFixed(1)}%</div>
              <Progress value={stats.overall.win_rate} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.overall.wins}W / {stats.overall.losses}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current ELO</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.overall.current_elo}</div>
              <p className="text-xs text-muted-foreground mt-2">Peak: {stats.overall.peak_elo}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <Target className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">${stats.overall.total_earnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-2">{stats.overall.tournaments_won} tournaments won</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Playtime</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{stats.overall.total_playtime}h</div>
              <p className="text-xs text-muted-foreground mt-2">{stats.overall.total_matches} matches</p>
            </CardContent>
          </Card>
        </div>

        {/* Streaks and Achievements */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Current Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Streak</span>
                <Badge
                  variant={stats.overall.current_streak > 0 ? "default" : "destructive"}
                  className={stats.overall.current_streak > 0 ? "bg-green-500" : ""}
                >
                  {stats.overall.current_streak > 0 ? "+" : ""}
                  {stats.overall.current_streak}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Longest Win Streak</span>
                <Badge variant="outline" className="border-green-500 text-green-500">
                  {stats.overall.longest_win_streak}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tournament Win Rate</span>
                <Badge variant="outline">
                  {((stats.overall.tournaments_won / stats.overall.tournaments_participated) * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tournaments Won</span>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{stats.overall.tournaments_won}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Peak ELO Reached</span>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span className="font-bold">{stats.overall.peak_elo}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Games Mastered</span>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="font-bold">{Object.keys(stats.by_game).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="by-game" className="space-y-6">
        {Object.keys(stats.by_game).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No game statistics available</p>
              <p className="text-sm text-muted-foreground mt-2">Play some matches to see your game-specific stats!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(stats.by_game).map(([game, gameStats]) => (
              <Card key={game}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{getGameIcon(game)}</span>
                    {getGameName(game)}
                  </CardTitle>
                  <CardDescription>Last played: {new Date(gameStats.last_played).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{gameStats.current_elo}</div>
                      <div className="text-xs text-muted-foreground">Current ELO</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{gameStats.win_rate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Matches Played</span>
                      <span className="font-medium">{gameStats.matches_played}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Earnings</span>
                      <span className="font-medium text-green-600">${gameStats.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="performance" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Overview
            </CardTitle>
            <CardDescription>Your competitive gaming statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.overall.total_matches === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No performance data available</p>
                <p className="text-sm text-muted-foreground mt-2">Play some matches to see your performance trends!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.overall.total_matches}</div>
                    <div className="text-sm text-muted-foreground">Total Matches</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.overall.wins}</div>
                    <div className="text-sm text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.overall.losses}</div>
                    <div className="text-sm text-muted-foreground">Losses</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.overall.current_elo}</div>
                    <div className="text-sm text-muted-foreground">Current ELO</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
