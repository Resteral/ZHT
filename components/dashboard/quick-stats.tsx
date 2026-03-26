"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Trophy, Target, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Stats {
  walletBalance: number
  weeklyChange: number
  eloRating: number
  eloChange: number
  activeBets: number
  totalStake: number
  leagueRank: number
  totalTeams: number
}

export function QuickStats() {
  const [stats, setStats] = useState<Stats>({
    walletBalance: 0,
    weeklyChange: 0,
    eloRating: 1200,
    eloChange: 0,
    activeBets: 0,
    totalStake: 0,
    leagueRank: 0,
    totalTeams: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from("users")
        .select("wallet_balance, elo_rating")
        .eq("id", user.user.id)
        .single()

      const { data: eloHistory } = await supabase
        .from("elo_history")
        .select("elo_rating, created_at")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentEloChange =
        eloHistory && eloHistory.length > 1
          ? eloHistory[0].elo_rating - eloHistory[eloHistory.length - 1].elo_rating
          : 0

      const { data: rankings } = await supabase
        .from("users")
        .select("id, elo_rating, username")
        .order("elo_rating", { ascending: false })

      const userRank = rankings?.findIndex((r) => r.id === user.user.id) + 1 || 0

      const { data: activeBets } = await supabase
        .from("wager_matches")
        .select("stake_amount")
        .eq("user_id", user.user.id)
        .eq("status", "active")

      const { data: weeklyTransactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.user.id)
        .gte("created_at", weekAgo.toISOString())

      const { data: recentMatches } = await supabase
        .from("matches")
        .select("elo_change")
        .eq("user_id", user.user.id)
        .gte("created_at", weekAgo.toISOString())

      const weeklyChange =
        weeklyTransactions?.reduce((sum, t) => sum + (t.type === "credit" ? t.amount : -t.amount), 0) || 0

      const totalStake = activeBets?.reduce((sum, bet) => sum + bet.stake_amount, 0) || 0

      setStats({
        walletBalance: profile?.wallet_balance || 25,
        weeklyChange,
        eloRating: profile?.elo_rating || 1200,
        eloChange: recentEloChange,
        activeBets: activeBets?.length || 0,
        totalStake,
        leagueRank: userRank,
        totalTeams: rankings?.length || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">${stats.walletBalance.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {stats.weeklyChange >= 0 ? "+" : ""}${stats.weeklyChange.toFixed(2)} this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ELO Rating</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.eloRating}</div>
          <p className="text-xs text-muted-foreground">
            {stats.eloChange >= 0 ? "+" : ""}
            {stats.eloChange} this month
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
          <CardTitle className="text-sm font-medium">League Rank</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.leagueRank > 0 ? `#${stats.leagueRank}` : "Unranked"}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalTeams > 0 ? `of ${stats.totalTeams} players` : "No rankings yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
