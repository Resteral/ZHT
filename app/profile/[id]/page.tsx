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
  Users,
  Download,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProfileStats } from "@/components/profile/profile-stats"
import { PlayerStatsDashboard } from "@/components/profile/player-statistics-dashboard"
import { EnhancedMatchHistory } from "@/components/profile/enhanced-match-history"
import { ProfileAchievements } from "@/components/profile/profile-achievements"
import { CSVStatsService, type CSVPlayerStats } from "@/lib/services/csv-stats-service"

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
  account_id?: string
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

interface MVPAward {
  id: string
  match_id: string
  awarded_at: string
  match_name?: string
}

interface PlayerFlag {
  id: string
  flag_type: string
  flag_count: number
  last_flagged: string
}

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null)
  const [hockeyStats, setHockeyStats] = useState<HockeyStats | null>(null)
  const [csvStats, setCsvStats] = useState<CSVPlayerStats[]>([])
  const [mvpAwards, setMvpAwards] = useState<MVPAward[]>([])
  const [playerFlags, setPlayerFlags] = useState<PlayerFlag[]>([])
  const [loadingCsvStats, setLoadingCsvStats] = useState(false)
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
        .select(
          "id, username, display_name, elo_rating, wins, losses, total_games, balance, created_at, last_active, account_id",
        )
        .eq("id", userId)
        .single()

      if (userError) throw userError
      if (!user) throw new Error("Player not found")

      setProfile(user)

      await loadPlayerCSVStats(user.account_id)

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

      console.log("[v0] Loading MVP awards for user:", userId)
      const { data: mvpData, error: mvpError } = await supabase
        .from("player_mvp_awards")
        .select(`
          id,
          match_id,
          awarded_at,
          matches!inner(name)
        `)
        .eq("player_id", userId)
        .order("awarded_at", { ascending: false })

      if (!mvpError && mvpData) {
        const awards: MVPAward[] = mvpData.map((award) => ({
          id: award.id,
          match_id: award.match_id,
          awarded_at: award.awarded_at,
          match_name: award.matches?.name || "Unknown Match",
        }))
        setMvpAwards(awards)
        console.log("[v0] MVP awards loaded:", awards.length)
      } else if (mvpError) {
        console.error("[v0] Error loading MVP awards:", mvpError)
      }

      console.log("[v0] Loading player flags for user:", userId)
      const { data: flagData, error: flagError } = await supabase
        .from("player_flag_summary")
        .select("id, flag_type, flag_count, last_flagged")
        .eq("player_id", userId)
        .gt("flag_count", 0)

      if (!flagError && flagData) {
        setPlayerFlags(flagData)
        console.log("[v0] Player flags loaded:", flagData.length)
      } else if (flagError) {
        console.error("[v0] Error loading player flags:", flagError)
      }
    } catch (err) {
      console.error("Error loading player profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const loadPlayerCSVStats = async (accountId?: string) => {
    if (!accountId) return

    setLoadingCsvStats(true)
    try {
      const supabase = createClient()

      const { data: submissions, error } = await supabase
        .from("score_submissions")
        .select(`
          csv_code,
          match_id,
          submitted_at,
          matches!inner(name)
        `)
        .not("csv_code", "is", null)
        .neq("csv_code", "")

      if (error) throw error

      const playerStats: CSVPlayerStats[] = []

      for (const submission of submissions || []) {
        const matchStats = CSVStatsService.parseCSVData(
          submission.csv_code,
          submission.match_id,
          submission.matches?.name || "Unknown Match",
        )

        const playerMatchStats = matchStats.filter((stat) => stat.accountId === accountId)
        playerStats.push(...playerMatchStats)
      }

      const statsWithUsernames = await Promise.all(
        playerStats.map(async (stat) => {
          const username = await CSVStatsService.getUsernameForAccountId(supabase, stat.accountId)
          return { ...stat, username }
        }),
      )

      setCsvStats(statsWithUsernames)
      console.log(`[v0] Loaded ${statsWithUsernames.length} CSV stats for player ${accountId}`)
    } catch (error) {
      console.error("[v0] Error loading player CSV stats:", error)
    } finally {
      setLoadingCsvStats(false)
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
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/players")} className="bg-card hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Players
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-card to-muted border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage
                src={`/abstract-geometric-shapes.png?key=22rg7&height=96&width=96&query=${profile.username} avatar`}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{profile.display_name || profile.username}</h1>
                {profile.elo_rating >= 1600 && <Crown className="h-6 w-6 text-secondary" />}
                {mvpAwards.length > 0 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
                    <Trophy className="h-3 w-3 mr-1" />
                    {mvpAwards.length} MVP{mvpAwards.length !== 1 ? "s" : ""}
                  </Badge>
                )}
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
                {profile.account_id && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    CSV: {profile.account_id}
                  </Badge>
                )}
                {playerFlags.length > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                    ⚠️ {playerFlags.reduce((sum, flag) => sum + flag.flag_count, 0)} Flag
                    {playerFlags.reduce((sum, flag) => sum + flag.flag_count, 0) !== 1 ? "s" : ""}
                  </Badge>
                )}
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

        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MVP Awards</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{mvpAwards.length}</div>
            <Progress value={Math.min((mvpAwards.length / 5) * 100, 100)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">{csvStats.length} CSV games played</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 bg-muted">
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
          <TabsTrigger value="csv-stats" className="data-[state=active]:bg-card">
            CSV Stats
          </TabsTrigger>
          <TabsTrigger value="mvp-flags" className="data-[state=active]:bg-card">
            MVP & Flags
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

        <TabsContent value="csv-stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-chart-2" />
                CSV Hockey Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCsvStats ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading CSV statistics...</div>
                </div>
              ) : csvStats.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">
                      Showing {csvStats.length} game records for {profile.username}
                    </p>
                    <Button
                      onClick={() => {
                        const csvContent = [
                          "Account ID,Player Name,Team,Steals,Goals,Assists,Shots,Pickups,Passes,Passes Received,Save %,Shots on Goalie,Shots Saved,Goalie Minutes,Skater Minutes,Match,Submitted At",
                          ...csvStats.map(
                            (stat) =>
                              `${stat.accountId},"${stat.username}",${stat.team},${stat.steals},${stat.goals},${stat.assists},${stat.shots},${stat.pickups},${stat.passes},${stat.passesReceived},${stat.savePercentage},${stat.shotsOnGoalie},${stat.shotsSaved},${stat.goalieMinutes},${stat.skaterMinutes},"${stat.matchName}","${new Date(stat.submittedAt).toLocaleString()}"`,
                          ),
                        ].join("\n")

                        const blob = new Blob([csvContent], { type: "text/csv" })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${profile.username}-csv-stats-${new Date().toISOString().split("T")[0]}.csv`
                        a.click()
                        window.URL.revokeObjectURL(url)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-1">
                        {csvStats.reduce((sum, stat) => sum + stat.goals, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Goals</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-2">
                        {csvStats.reduce((sum, stat) => sum + stat.assists, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Assists</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-3">
                        {csvStats.reduce((sum, stat) => sum + stat.steals, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Steals</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-4">
                        {csvStats.reduce((sum, stat) => sum + stat.shots, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Shots</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-chart-5">
                        {csvStats.reduce((sum, stat) => sum + stat.pickups, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Pickups</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Match</th>
                          <th className="px-4 py-3 text-center font-semibold">Team</th>
                          <th className="px-4 py-3 text-center font-semibold">Goals</th>
                          <th className="px-4 py-3 text-center font-semibold">Assists</th>
                          <th className="px-4 py-3 text-center font-semibold">Steals</th>
                          <th className="px-4 py-3 text-center font-semibold">Shots</th>
                          <th className="px-4 py-3 text-center font-semibold">Pickups</th>
                          <th className="px-4 py-3 text-center font-semibold">Passes</th>
                          <th className="px-4 py-3 text-center font-semibold">Save %</th>
                          <th className="px-4 py-3 text-center font-semibold">Minutes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvStats.map((stat, index) => (
                          <tr key={`${stat.matchId}-${index}`} className="border-t hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{stat.matchName}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  stat.team === 1
                                    ? "bg-blue-100 text-blue-800"
                                    : stat.team === 2
                                      ? "bg-red-100 text-red-800"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                Team {stat.team}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{stat.goals}</td>
                            <td className="px-4 py-3 text-center">{stat.assists}</td>
                            <td className="px-4 py-3 text-center">{stat.steals}</td>
                            <td className="px-4 py-3 text-center">{stat.shots}</td>
                            <td className="px-4 py-3 text-center">{stat.pickups}</td>
                            <td className="px-4 py-3 text-center">{stat.passes}</td>
                            <td className="px-4 py-3 text-center">{stat.savePercentage.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center">{stat.skaterMinutes + stat.goalieMinutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground opacity-50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No CSV Statistics Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {profile.account_id
                      ? "CSV statistics will appear here once matches with CSV data are submitted."
                      : "This player needs an account ID mapping to display CSV statistics."}
                  </p>
                  {profile.account_id && (
                    <Button
                      onClick={() => loadPlayerCSVStats(profile.account_id)}
                      disabled={loadingCsvStats}
                      variant="outline"
                    >
                      {loadingCsvStats ? "Loading..." : "Refresh CSV Stats"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mvp-flags" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  MVP Awards ({mvpAwards.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mvpAwards.length > 0 ? (
                  <div className="space-y-3">
                    {mvpAwards.slice(0, 10).map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <div>
                            <div className="font-medium text-sm">{award.match_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(award.awarded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          MVP
                        </Badge>
                      </div>
                    ))}
                    {mvpAwards.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground">
                        ... and {mvpAwards.length - 10} more MVP awards
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No MVP awards yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      MVP awards are given to outstanding players in completed matches
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  Player Flags ({playerFlags.reduce((sum, flag) => sum + flag.flag_count, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerFlags.length > 0 ? (
                  <div className="space-y-3">
                    {playerFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-red-500">
                            {flag.flag_type === "toxicity" && "🗣️"}
                            {flag.flag_type === "griefing" && "😠"}
                            {flag.flag_type === "cheating" && "🚫"}
                            {flag.flag_type === "afk" && "💤"}
                          </span>
                          <div>
                            <div className="font-medium text-sm capitalize">{flag.flag_type.replace("_", " ")}</div>
                            <div className="text-xs text-muted-foreground">
                              Last flagged: {new Date(flag.last_flagged).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          {flag.flag_count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-12 w-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                    <p className="text-muted-foreground">Clean record</p>
                    <p className="text-sm text-muted-foreground mt-2">This player has no behavioral flags</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <ProfileAchievements userId={userId} />
        </TabsContent>
      </Tabs>

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
