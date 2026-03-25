"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, Target, Clock, Zap, Trophy } from "lucide-react"
import { LiveBettingMarkets } from "./live-betting-markets"
import { UpcomingBets } from "./upcoming-bets"
import { BettingHistory } from "./betting-history"
import { BetSlip } from "./bet-slip"
import { ELODraftBetting } from "./elo-draft-betting"
import { BettingResults } from "./betting-results"
import { createClient } from "@/lib/supabase/client"

interface BettingStats {
  availableBalance: number
  activeBets: number
  totalStake: number
  winRate: number
  liveMarkets: number
  weeklyChange: number
}

export function BettingDashboard() {
  const [stats, setStats] = useState<BettingStats>({
    availableBalance: 0,
    activeBets: 0,
    totalStake: 0,
    winRate: 0,
    liveMarkets: 0,
    weeklyChange: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadBettingStats()
  }, [])

  const loadBettingStats = async () => {
    try {
      console.log("[v0] Loading betting dashboard stats...")

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        console.log("[v0] No authenticated user found")
        setLoading(false)
        return
      }

      // Get user balance
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.user.id)
        .single()

      if (userError) {
        console.error("[v0] Error fetching user data:", userError)
      }

      // Get active bets
      const { data: activeBets, error: activeBetsError } = await supabase
        .from("bets")
        .select("stake_amount")
        .eq("user_id", user.user.id)
        .eq("status", "pending")

      if (activeBetsError) {
        console.error("[v0] Error fetching active bets:", activeBetsError)
      }

      // Get betting history for win rate calculation
      const { data: bettingHistory, error: historyError } = await supabase
        .from("bets")
        .select("status, stake_amount, potential_payout, placed_at")
        .eq("user_id", user.user.id)
        .in("status", ["won", "lost"])
        .order("placed_at", { ascending: false })
        .limit(50)

      if (historyError) {
        console.error("[v0] Error fetching betting history:", historyError)
      }

      // Get live markets count
      const { data: liveMarkets, error: marketsError } = await supabase
        .from("betting_markets")
        .select("id")
        .eq("status", "active")

      if (marketsError) {
        console.error("[v0] Error fetching live markets:", marketsError)
      }

      // Calculate stats
      const availableBalance = userData?.balance || 0
      const activeCount = activeBets?.length || 0
      const totalStake = activeBets?.reduce((sum, bet) => sum + (bet.stake_amount || 0), 0) || 0

      let winRate = 0
      let weeklyChange = 0

      if (bettingHistory && bettingHistory.length > 0) {
        const wonBets = bettingHistory.filter((bet) => bet.status === "won").length
        const totalSettledBets = bettingHistory.length
        winRate = totalSettledBets > 0 ? Math.round((wonBets / totalSettledBets) * 100) : 0

        // Calculate weekly change
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const weeklyBets = bettingHistory.filter((bet) => new Date(bet.placed_at) >= oneWeekAgo)

        const weeklyWon = weeklyBets
          .filter((bet) => bet.status === "won")
          .reduce((sum, bet) => sum + (bet.potential_payout || 0), 0)

        const weeklyLost = weeklyBets
          .filter((bet) => bet.status === "lost")
          .reduce((sum, bet) => sum + (bet.stake_amount || 0), 0)

        weeklyChange = weeklyWon - weeklyLost
      }

      const liveMarketsCount = liveMarkets?.length || 0

      setStats({
        availableBalance,
        activeBets: activeCount,
        totalStake,
        winRate,
        liveMarkets: liveMarketsCount,
        weeklyChange,
      })

      console.log("[v0] Betting stats loaded:", {
        availableBalance,
        activeBets: activeCount,
        totalStake,
        winRate,
        liveMarkets: liveMarketsCount,
        weeklyChange,
      })
    } catch (error) {
      console.error("[v0] Error loading betting stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = () => {
    setLoading(true)
    loadBettingStats()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.availableBalance.toFixed(2)}</div>
            <p className={`text-xs ${stats.weeklyChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              {stats.weeklyChange >= 0 ? "+" : ""}${stats.weeklyChange.toFixed(2)} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBets}</div>
            <p className="text-xs text-muted-foreground">${stats.totalStake.toFixed(2)} total stake</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">Last 50 bets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Markets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveMarkets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.liveMarkets > 0 ? "Markets available" : "No active markets"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Tabs defaultValue="live" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="live" className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Live Markets</span>
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
                <TabsTrigger value="elo-lobbies">ELO Lobbies</TabsTrigger>
                <TabsTrigger value="results" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Results</span>
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Real-time odds</Badge>
                <Button size="sm" variant="outline" onClick={refreshStats}>
                  Refresh Markets
                </Button>
                <Button size="sm" variant="default">
                  Create Market
                </Button>
              </div>
            </div>

            <TabsContent value="live" className="space-y-6">
              <LiveBettingMarkets />
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <UpcomingBets />
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Betting Markets</CardTitle>
                  <CardDescription>Bet on tournament outcomes and player performances</CardDescription>
                </CardHeader>
                <CardContent>
                  <ELODraftBetting />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="elo-lobbies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ELO Lobby Betting Markets</CardTitle>
                  <CardDescription>Bet on ELO lobby matches and player statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ELODraftBetting />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <BettingResults />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <BettingHistory />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <BetSlip />

          <Card>
            <CardHeader>
              <CardTitle>Create Betting Market</CardTitle>
              <CardDescription>Anyone can create betting markets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-transparent" variant="outline">
                Create Tournament Market
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Create ELO Lobby Market
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Create Custom Market
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hot Tips</CardTitle>
              <CardDescription>Popular bets right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No trending bets available</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Betting Limits</CardTitle>
              <CardDescription>Your current limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Daily Limit</span>
                <span>$500 / $1,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Single Bet</span>
                <span>$250 max</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Weekly Limit</span>
                <span>$1,200 / $2,500</span>
              </div>
              <Button size="sm" variant="outline" className="w-full bg-transparent">
                Adjust Limits
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
