"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, Target, Clock, Zap, Trophy } from "lucide-react"
import { LiveContests } from "./live-betting-markets"
import { UpcomingContests } from "./upcoming-bets"
import { BettingHistory } from "./betting-history"
import { ContestEntrySlip } from "./bet-slip"
import { ELODraftBetting } from "./elo-draft-betting"
import { BettingResults } from "./betting-results"
import { SponsorsList } from "@/components/sponsors/sponsors-list"
import { createClient } from "@/lib/supabase/client"

interface ContestStats {
  availableBalance: number
  activeEntries: number
  totalEntryFees: number
  winRate: number
  liveContests: number
  weeklyChange: number
}

export function BettingDashboard() {
  const [stats, setStats] = useState<ContestStats>({
    availableBalance: 0,
    activeEntries: 0,
    totalEntryFees: 0,
    winRate: 0,
    liveContests: 0,
    weeklyChange: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadContestStats()
  }, [])

  const loadContestStats = async () => {
    try {
      console.log("[v0] Loading contest dashboard stats...")

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

      // Get active bets (entries)
      const { data: activeBets, error: activeBetsError } = await supabase
        .from("bets")
        .select("stake_amount")
        .eq("user_id", user.user.id)
        .eq("status", "pending")

      if (activeBetsError) {
        console.error("[v0] Error fetching active entries:", activeBetsError)
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
        console.error("[v0] Error fetching contest history:", historyError)
      }

      // Get live markets (contests) count
      const { data: liveMarkets, error: marketsError } = await supabase
        .from("betting_markets")
        .select("id")
        .eq("status", "active")

      if (marketsError) {
        console.error("[v0] Error fetching live contests:", marketsError)
      }

      // Calculate stats
      const availableBalance = userData?.balance || 0
      const activeCount = activeBets?.length || 0
      const totalEntryFees = activeBets?.reduce((sum, bet) => sum + (bet.stake_amount || 0), 0) || 0

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

      const liveContestsCount = liveMarkets?.length || 0

      setStats({
        availableBalance,
        activeEntries: activeCount,
        totalEntryFees,
        winRate,
        liveContests: liveContestsCount,
        weeklyChange,
      })

      console.log("[v0] Contest stats loaded:", {
        availableBalance,
        activeEntries: activeCount,
        totalEntryFees,
        winRate,
        liveContests: liveContestsCount,
        weeklyChange,
      })
    } catch (error) {
      console.error("[v0] Error loading contest stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = () => {
    setLoading(true)
    loadContestStats()
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
            <CardTitle className="text-sm font-medium">Active Entries</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEntries}</div>
            <p className="text-xs text-muted-foreground">${stats.totalEntryFees.toFixed(2)} in entry fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">Last 50 contests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Contests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveContests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.liveContests > 0 ? "Contests available" : "No active contests"}
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
                  <span>Live Contests</span>
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
                <Badge variant="secondary">Live Updates</Badge>
                <Button size="sm" variant="outline" onClick={refreshStats}>
                  Refresh
                </Button>
                <Button size="sm" variant="default">
                  Create Contest
                </Button>
              </div>
            </div>

            <TabsContent value="live" className="space-y-6">
              <LiveContests />
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <UpcomingContests />
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Contests</CardTitle>
                  <CardDescription>Enter tournament prediction contests and player props</CardDescription>
                </CardHeader>
                <CardContent>
                  <ELODraftBetting />
                  {/* Should be refactored to ELODraftContests ideally */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="elo-lobbies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ELO Lobby Contests</CardTitle>
                  <CardDescription>Skill-based contests on ELO lobby matches</CardDescription>
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
          <ContestEntrySlip />

          <Card>
            <CardHeader>
              <CardTitle>Create Contest Group</CardTitle>
              <CardDescription>Anyone can create a contest group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-transparent" variant="outline">
                Create Tournament Contest
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Create ELO Lobby Contest
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Create Custom Contest
              </Button>
            </CardContent>
          </Card>

          <SponsorsList />

          <Card>
            <CardHeader>
              <CardTitle>Hot Tips</CardTitle>
              <CardDescription>Popular picks right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No trending picks available</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contest Limits</CardTitle>
              <CardDescription>Your current limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Daily Entry Limit</span>
                <span>$500 / $1,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Single Entry</span>
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
