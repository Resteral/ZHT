"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  TrendingUp,
  Target,
  Clock,
  Crown,
  ArrowLeft,
  Calendar,
  DollarSign,
  Gamepad2,
  BarChart3,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProfileStats } from "@/components/profile/profile-stats"
import { PlayerStatsDashboard } from "@/components/profile/player-statistics-dashboard"
import { EnhancedMatchHistory } from "@/components/profile/enhanced-match-history"
import { ProfileAchievements } from "@/components/profile/profile-achievements"

interface PlayerProfile {
  id: string
  username: string
  display_name?: string
  elo_rating: number
  wins: number
  losses: number
  total_games: number
  balance: number
  created_at: string
  last_active?: string
}

interface BettingStats {
  totalBets: number
  wonBets: number
  lostBets: number
  totalWagered: number
  totalWon: number
  winRate: number
  netProfit: number
}

interface HockeyStats {
  totalGoals: number
  totalAssists: number
  totalSaves: number
  gamesPlayed: number
  averageScore: number
  bestGame: number
}

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null)
  const [hockeyStats, setHockeyStats] = useState<HockeyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = params.id as string

  useEffect(() => {
    if (userId) {
      loadPlayerProfile()
    }
  }, [userId])

  const loadPlayerProfile = async () => {
    const supabase = createClient()

    try {
      console.log("[v0] Loading player profile for user:", userId)

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, username, display_name, elo_rating, wins, losses, total_games, balance, created_at, last_active")
        .eq("id", userId)
        .single()

      if (userError) throw userError
      if (!user) throw new Error("Player not found")

      setProfile(user)

      console.log("[v0] Loading betting stats for user:", userId)
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select("stake_amount, potential_payout, status, placed_at")
        .eq("user_id", userId)

      if (!betsError && bets) {
        const totalBets = bets.length
        const wonBets = bets.filter((bet) => bet.status === "won").length
        const lostBets = bets.filter((bet) => bet.status === "lost").length
        const totalWagered = bets.reduce((sum, bet) => sum + (bet.stake_amount || 0), 0)
        const totalWon = bets
          .filter((bet) => bet.status === "won")
          .reduce((sum, bet) => sum + (bet.potential_payout || 0), 0)
        const settledBets = wonBets + lostBets
        const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0
        const netProfit = totalWon - totalWagered

        setBettingStats({
          totalBets,
          wonBets,
          lostBets,
          totalWagered,
          totalWon,
          winRate,
          netProfit,
        })

        console.log("[v0] Betting stats loaded:", {
          totalBets,
          wonBets,
          lostBets,
          totalWagered,
          totalWon,
          winRate: winRate.toFixed(1),
          netProfit: netProfit.toFixed(2),
        })
      } else if (betsError) {
        console.error("[v0] Error loading betting stats:", betsError)
      }

      const { data: performances, error: performancesError } = await supabase
        .from("player_performances")
        .select("stats")
        .eq("player_id", userId)

      if (!performancesError && performances) {
        let totalGoals = 0
        let totalAssists = 0
        let totalSaves = 0
        const gamesPlayed = performances.length
        let totalScore = 0
        let bestGame = 0

        performances.forEach((perf) => {
          if (perf.stats) {
            const stats = perf.stats as any
            totalGoals += stats.goals || 0
            totalAssists += stats.assists || 0
            totalSaves += stats.saves || 0
            totalScore += stats.score || 0
            bestGame = Math.max(bestGame, stats.score || 0)
          }
        })

        setHockeyStats({
          totalGoals,
          totalAssists,
          totalSaves,
          gamesPlayed,
          averageScore: gamesPlayed > 0 ? totalScore / gamesPlayed : 0,
          bestGame,
        })
      }
    } catch (err) {
      console.error("Error loading player profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading player profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{error || "Player not found"}</p>
          <Button onClick={() => router.push("/players")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Players
          </Button>
        </div>
      </div>
    )
  }

  const winRate = profile.total_games > 0 ? (profile.wins / profile.total_games) * 100 : 0
  const rank =
    profile.elo_rating >= 1800
      ? "Diamond"
      : profile.elo_rating >= 1600
        ? "Platinum"
        : profile.elo_rating >= 1400
          ? "Gold"
          : profile.elo_rating >= 1200
            ? "Silver"
            : "Bronze"

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/players")} className="bg-card hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Players
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-card to-muted border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={`/abstract-geometric-shapes.png?height=96&width=96&query=${profile.username} avatar`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{profile.display_name || profile.username}</h1>
                {profile.elo_rating >= 1600 && <Crown className="h-6 w-6 text-secondary" />}
              </div>

              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                  {rank}
                </Badge>
                <Badge variant="outline" className="border-primary text-primary">
                  ELO: {profile.elo_rating}
                </Badge>
                <Badge variant="outline">
                  {profile.wins}W - {profile.losses}L
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-chart-1" />
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-medium">{winRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-chart-4" />
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium">${profile.balance?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-chart-2" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-chart-3" />
                  <span className="text-muted-foreground">Last Active:</span>
                  <span className="font-medium">
                    {profile.last_active ? new Date(profile.last_active).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-chart-1/10 to-chart-1/5 border-chart-1/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current ELO</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-1">{profile.elo_rating}</div>
            <Progress value={Math.min(((profile.elo_rating - 1000) / 1000) * 100, 100)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Rank: {rank}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-5/10 to-chart-5/5 border-chart-5/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-5">{winRate.toFixed(1)}%</div>
            <Progress value={winRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {profile.wins}W / {profile.losses}L
            </p>
          </CardContent>
        </Card>

        {bettingStats && (
          <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Betting Profit</CardTitle>
              <Target className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${bettingStats.netProfit >= 0 ? "text-chart-5" : "text-destructive"}`}
              >
                ${bettingStats.netProfit.toFixed(2)}
              </div>
              <Progress value={Math.min(bettingStats.winRate, 100)} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">{bettingStats.winRate.toFixed(1)}% win rate</p>
            </CardContent>
          </Card>
        )}

        {hockeyStats && (
          <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hockey Score</CardTitle>
              <Gamepad2 className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">{hockeyStats.averageScore.toFixed(1)}</div>
              <Progress value={Math.min((hockeyStats.averageScore / 100) * 100, 100)} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">Best: {hockeyStats.bestGame}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Statistics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-muted">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card">
            Overview
          </TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-card">
            Statistics
          </TabsTrigger>
          <TabsTrigger value="matches" className="data-[state=active]:bg-card">
            Match History
          </TabsTrigger>
          <TabsTrigger value="betting" className="data-[state=active]:bg-card">
            Betting
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-card">
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProfileStats
            user={{
              wins: profile.wins,
              losses: profile.losses,
              winRate,
              totalGames: profile.total_games,
              wallet_balance: profile.balance || 0,
              elo_rating: profile.elo_rating,
              level: Math.floor(profile.elo_rating / 100),
              rank,
            }}
          />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <PlayerStatsDashboard userId={userId} />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <EnhancedMatchHistory userId={userId} />
        </TabsContent>

        <TabsContent value="betting" className="space-y-6">
          {bettingStats ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-chart-4" />
                    Betting Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-1">{bettingStats.totalBets}</div>
                      <div className="text-sm text-muted-foreground">Total Bets</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-5">{bettingStats.wonBets}</div>
                      <div className="text-sm text-muted-foreground">Won Bets</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Wagered</span>
                      <span className="font-bold">${bettingStats.totalWagered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Won</span>
                      <span className="font-bold text-chart-5">${bettingStats.totalWon.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span
                        className={`font-bold ${bettingStats.netProfit >= 0 ? "text-chart-5" : "text-destructive"}`}
                      >
                        ${bettingStats.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-chart-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Win Rate</span>
                        <span className="font-bold">{bettingStats.winRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={bettingStats.winRate} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">ROI</span>
                        <span
                          className={`font-bold ${bettingStats.netProfit >= 0 ? "text-chart-5" : "text-destructive"}`}
                        >
                          {bettingStats.totalWagered > 0
                            ? ((bettingStats.netProfit / bettingStats.totalWagered) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Math.min(Math.abs((bettingStats.netProfit / bettingStats.totalWagered) * 100), 100)}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No betting history available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <ProfileAchievements userId={userId} />
        </TabsContent>
      </Tabs>

      {/* Hockey Statistics */}
      {hockeyStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-chart-2" />
              Hockey Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-chart-1">{hockeyStats.totalGoals}</div>
                <div className="text-sm text-muted-foreground">Total Goals</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-chart-2">{hockeyStats.totalAssists}</div>
                <div className="text-sm text-muted-foreground">Total Assists</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-chart-3">{hockeyStats.totalSaves}</div>
                <div className="text-sm text-muted-foreground">Total Saves</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-chart-4">{hockeyStats.gamesPlayed}</div>
                <div className="text-sm text-muted-foreground">Games Played</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-chart-5">{hockeyStats.averageScore.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
