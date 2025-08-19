"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface BettingHistoryItem {
  id: string
  market_id: string
  bet_type: string
  selection: string
  stake_amount: number
  odds: number
  potential_payout: number
  status: string
  created_at: string
  settled_at?: string
}

export function BettingHistory() {
  const [bettingHistory, setBettingHistory] = useState<BettingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalBets: 0,
    winRate: 0,
    totalWagered: 0,
    netProfit: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadBettingHistory()
  }, [])

  const loadBettingHistory = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error

      setBettingHistory(data || [])

      const totalBets = data?.length || 0
      const wonBets = data?.filter((bet) => bet.status === "won").length || 0
      const totalWagered = data?.reduce((sum, bet) => sum + bet.stake_amount, 0) || 0
      const totalWon =
        data?.filter((bet) => bet.status === "won").reduce((sum, bet) => sum + bet.potential_payout, 0) || 0

      setStats({
        totalBets,
        winRate: totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0,
        totalWagered,
        netProfit: totalWon - totalWagered,
      })
    } catch (error) {
      console.error("Error loading betting history:", error)
      setBettingHistory([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "lost":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "won":
        return "default"
      case "lost":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getProfitLoss = (bet: BettingHistoryItem) => {
    if (bet.status === "won") {
      return bet.potential_payout - bet.stake_amount
    } else if (bet.status === "lost") {
      return -bet.stake_amount
    }
    return 0
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading betting history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.winRate > 50 ? "text-green-500" : "text-red-500"}`}>
              {stats.winRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Wagered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalWagered.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center ${stats.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {stats.netProfit >= 0 ? "+" : ""}${stats.netProfit.toFixed(2)}
              {stats.netProfit >= 0 && <TrendingUp className="h-4 w-4 ml-1" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bet History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Bets</h3>
        {bettingHistory.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Betting History</h3>
            <p className="text-muted-foreground">Your betting history will appear here once you place bets</p>
          </div>
        ) : (
          bettingHistory.map((bet) => (
            <Card key={bet.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(bet.status)}
                    <Badge variant={getStatusVariant(bet.status)}>
                      {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(bet.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    {bet.status !== "pending" && (
                      <div
                        className={`text-sm font-medium ${getProfitLoss(bet) > 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {getProfitLoss(bet) > 0 ? "+" : ""}${getProfitLoss(bet).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{bet.selection}</p>
                    <p className="text-xs text-muted-foreground">
                      {bet.bet_type.replace("_", " ").toUpperCase()} • {bet.odds > 0 ? "+" : ""}
                      {bet.odds}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${bet.stake_amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {bet.status === "pending"
                        ? `To win $${(bet.potential_payout - bet.stake_amount).toFixed(2)}`
                        : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {bettingHistory.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadBettingHistory}>
            Load More History
          </Button>
        </div>
      )}
    </div>
  )
}
