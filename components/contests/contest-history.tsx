"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, TrendingUp, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ContestHistoryItem {
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
  isELODraft?: boolean
  matchName?: string
  matchType?: string
  market_description?: string
  player_stats?: any
}

export function ContestHistory() {
  const [contestHistory, setContestHistory] = useState<ContestHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showELODraftOnly, setShowELODraftOnly] = useState(false)
  const [eloDraftStats, setEloDraftStats] = useState({
    totalELOBets: 0,
    eloWinRate: 0,
    avgELOStake: 0,
    bestELOWin: 0,
  })
  const [stats, setStats] = useState({
    totalBets: 0,
    winRate: 0,
    totalWagered: 0,
    netProfit: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadContestHistory()
  }, [showELODraftOnly])

  const loadContestHistory = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from("bets")
        .select(`
          *,
          betting_markets (
            id,
            game_id,
            market_type,
            description,
            matches (
              id,
              name,
              match_type,
              status
            )
          )
        `)
        .eq("user_id", user.user.id)
        .order("placed_at", { ascending: false })
        .limit(50)

      if (error) throw error

      const transformedData: ContestHistoryItem[] = (data || []).map((bet) => ({
        id: bet.id,
        market_id: bet.market_id || "",
        bet_type: bet.bet_type || bet.selection || "Unknown",
        selection: bet.bet_type || bet.selection || "Unknown",
        stake_amount: bet.stake_amount || bet.stake || 0,
        odds: bet.odds || 0,
        potential_payout: bet.potential_payout || 0,
        status: bet.status || "pending",
        created_at: bet.placed_at || bet.created_at,
        settled_at: bet.settled_at,
        isELODraft:
          bet.betting_markets?.matches?.match_type?.includes("draft") ||
          bet.bet_type?.includes("elo") ||
          bet.betting_markets?.market_type?.includes("elo") ||
          bet.betting_markets?.description?.toLowerCase().includes("elo"),
        matchName: bet.betting_markets?.matches?.name || "Unknown Match",
        matchType: bet.betting_markets?.matches?.match_type || "Unknown",
      }))

      const filteredData = showELODraftOnly ? transformedData.filter((bet) => bet.isELODraft) : transformedData

      setContestHistory(filteredData)

      const eloDraftBets = transformedData.filter((bet) => bet.isELODraft)
      const eloDraftWon = eloDraftBets.filter((bet) => bet.status === "won")
      const eloDraftLost = eloDraftBets.filter((bet) => bet.status === "lost")
      const eloDraftSettled = [...eloDraftWon, ...eloDraftLost]

      setEloDraftStats({
        totalELOBets: eloDraftBets.length,
        eloWinRate: eloDraftSettled.length > 0 ? Math.round((eloDraftWon.length / eloDraftSettled.length) * 100) : 0,
        avgELOStake:
          eloDraftBets.length > 0
            ? eloDraftBets.reduce((sum, bet) => sum + bet.stake_amount, 0) / eloDraftBets.length
            : 0,
        bestELOWin:
          eloDraftWon.length > 0 ? Math.max(...eloDraftWon.map((bet) => bet.potential_payout - bet.stake_amount)) : 0,
      })

      const totalBets = transformedData.length
      const wonBets = transformedData.filter((bet) => bet.status === "won").length
      const lostBets = transformedData.filter((bet) => bet.status === "lost").length
      const totalWagered = transformedData.reduce((sum, bet) => sum + bet.stake_amount, 0)
      const totalWon = transformedData
        .filter((bet) => bet.status === "won")
        .reduce((sum, bet) => sum + bet.potential_payout, 0)
      const totalLost = transformedData
        .filter((bet) => bet.status === "lost")
        .reduce((sum, bet) => sum + bet.stake_amount, 0)

      setStats({
        totalBets,
        winRate: totalBets > 0 && wonBets + lostBets > 0 ? Math.round((wonBets / (wonBets + lostBets)) * 100) : 0,
        totalWagered,
        netProfit: totalWon - totalLost,
      })
    } catch (error) {
      console.error("Error loading betting history:", error)
      setContestHistory([])
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

  const getProfitLoss = (bet: ContestHistoryItem) => {
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
        <p className="text-muted-foreground">Loading contest history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {eloDraftStats.totalELOBets > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              ELO Draft Contest Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{eloDraftStats.totalELOBets}</div>
                <div className="text-xs text-muted-foreground">ELO Draft Bets</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${eloDraftStats.eloWinRate > 50 ? "text-green-500" : "text-red-500"}`}
                >
                  {eloDraftStats.eloWinRate}%
                </div>
                <div className="text-xs text-muted-foreground">ELO Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">${eloDraftStats.avgELOStake.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Avg ELO Stake</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${eloDraftStats.bestELOWin.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Best ELO Win</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Bets</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showELODraftOnly ? "default" : "outline"}
            onClick={() => setShowELODraftOnly(!showELODraftOnly)}
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            {showELODraftOnly ? "Show All Bets" : "ELO Draft Only"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {contestHistory.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Contest History</h3>
            <p className="text-muted-foreground">
              {showELODraftOnly
                ? "No ELO draft contest history found"
                : "Your contest history will appear here once you enter contests"}
            </p>
          </div>
        ) : (
          contestHistory.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <Badge variant={getStatusVariant(item.status)}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                    {item.isELODraft && (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                        ELO Draft
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{item.market_description}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.bet_type === "mvp" ? "MVP Selection" : item.selection}
                    </p>
                    {item.isELODraft && item.player_stats && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Details: {JSON.stringify(item.player_stats).slice(0, 50)}...
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {item.status === "won" ? (
                        <span className="text-green-500">
                          +${(item.potential_payout - item.stake_amount).toFixed(2)}
                        </span>
                      ) : item.status === "lost" ? (
                        <span className="text-red-500">-${item.stake_amount.toFixed(2)}</span>
                      ) : (
                        <span>${item.stake_amount.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.odds > 0 ? `+${item.odds}` : item.odds}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {
        contestHistory.length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={loadContestHistory}>
              Load More History
            </Button>
          </div>
        )
      }
    </div >
  )
}
