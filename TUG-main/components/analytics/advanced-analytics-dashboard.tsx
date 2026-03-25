"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client"
import { Trophy, TrendingUp, Target, Zap, Award, Flame } from "lucide-react"

interface PlayerStats {
  id: string
  username: string
  elo_rating: number
  matches_played: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_damage: number
  avg_accuracy: number
  wins: number
  losses: number
  win_percentage: number
  avg_performance_rating: number
  total_mvp_votes: number
}

interface PlayerStreak {
  user_id: string
  username: string
  streak_type: string
  current_streak: number
  best_streak: number
}

interface EloHistory {
  date: string
  elo: number
  username: string
}

export default function AdvancedAnalyticsDashboard() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [streaks, setStreaks] = useState<PlayerStreak[]>([])
  const [eloHistory, setEloHistory] = useState<EloHistory[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAdvancedAnalytics()
  }, [])

  const loadAdvancedAnalytics = async () => {
    try {
      // Load advanced player stats
      const { data: stats } = await supabase
        .from("player_advanced_stats")
        .select("*")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (stats) setPlayerStats(stats)

      // Load player streaks
      const { data: streakData } = await supabase
        .from("player_streaks")
        .select(`
          *,
          users!inner(username)
        `)
        .order("current_streak", { ascending: false })

      if (streakData) {
        const formattedStreaks = streakData.map((streak) => ({
          ...streak,
          username: streak.users.username,
        }))
        setStreaks(formattedStreaks)
      }

      // Load ELO history (sample data for demonstration)
      const sampleEloHistory = [
        { date: "2024-01", elo: 1200, username: "DavidPameten" },
        { date: "2024-02", elo: 1250, username: "DavidPameten" },
        { date: "2024-03", elo: 1300, username: "DavidPameten" },
        { date: "2024-04", elo: 1380, username: "DavidPameten" },
        { date: "2024-05", elo: 1447, username: "DavidPameten" },
        { date: "2024-01", elo: 1100, username: "Cerv" },
        { date: "2024-02", elo: 1180, username: "Cerv" },
        { date: "2024-03", elo: 1250, username: "Cerv" },
        { date: "2024-04", elo: 1320, username: "Cerv" },
        { date: "2024-05", elo: 1371, username: "Cerv" },
      ]
      setEloHistory(sampleEloHistory)
    } catch (error) {
      console.error("Error loading advanced analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const topPerformers = playerStats.slice(0, 5)
  const winRateData = playerStats.map((p) => ({
    name: p.username,
    winRate: p.win_percentage || 0,
    matches: p.matches_played || 0,
  }))

  const performanceData = playerStats.slice(0, 8).map((p) => ({
    username: p.username,
    kills: p.avg_kills || 0,
    deaths: p.avg_deaths || 0,
    assists: p.avg_assists || 0,
    damage: (p.avg_damage || 0) / 100, // Scale for radar chart
    accuracy: p.avg_accuracy || 0,
  }))

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading advanced analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="elo-trends">ELO Trends</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top ELO Player</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{topPerformers[0]?.username || "N/A"}</div>
                <p className="text-xs text-muted-foreground">{topPerformers[0]?.elo_rating || 0} ELO</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.max(...playerStats.map((p) => p.win_percentage || 0)).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {playerStats.find(
                    (p) => p.win_percentage === Math.max(...playerStats.map((p) => p.win_percentage || 0)),
                  )?.username || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most MVPs</CardTitle>
                <Award className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.max(...playerStats.map((p) => p.total_mvp_votes || 0))}</div>
                <p className="text-xs text-muted-foreground">
                  {playerStats.find(
                    (p) => p.total_mvp_votes === Math.max(...playerStats.map((p) => p.total_mvp_votes || 0)),
                  )?.username || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Players</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerStats.length}</div>
                <p className="text-xs text-muted-foreground">With match history</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Win Rate Distribution</CardTitle>
                <CardDescription>Player win percentages across all matches</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    winRate: {
                      label: "Win Rate %",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={winRateData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="winRate" fill="var(--color-winRate)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Highest ELO players and their stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : "secondary"}>#{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{player.username}</div>
                          <div className="text-sm text-muted-foreground">{player.matches_played || 0} matches</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{player.elo_rating}</div>
                        <div className="text-sm text-muted-foreground">
                          {(player.win_percentage || 0).toFixed(1)}% WR
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Performance Radar</CardTitle>
              <CardDescription>Multi-dimensional performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  performance: {
                    label: "Performance",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={performanceData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="username" />
                    <PolarRadiusAxis />
                    <Radar name="Kills" dataKey="kills" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} />
                    <Radar name="Assists" dataKey="assists" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {["win", "mvp", "loss"].map((streakType) => (
              <Card key={streakType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {streakType.charAt(0).toUpperCase() + streakType.slice(1)} Streaks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {streaks
                      .filter((s) => s.streak_type === streakType)
                      .slice(0, 5)
                      .map((streak, index) => (
                        <div
                          key={`${streak.user_id}-${streak.streak_type}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? "default" : "outline"}>#{index + 1}</Badge>
                            <span className="font-medium">{streak.username}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{streak.current_streak}</div>
                            <div className="text-xs text-muted-foreground">Best: {streak.best_streak}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="elo-trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ELO Progression</CardTitle>
              <CardDescription>Player ELO changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  elo: {
                    label: "ELO Rating",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eloHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="elo" stroke="var(--color-elo)" strokeWidth={2} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Outcome Predictions</CardTitle>
              <CardDescription>AI-powered match result forecasting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Prediction Engine</h3>
                <p className="text-muted-foreground">
                  Advanced match outcome predictions will appear here once more match data is available.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
