"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Search, Trophy, Target, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface BettingResult {
  id: string
  market_id: string
  game_id: string
  bet_type: string
  selection: string
  stake_amount: number
  odds: number
  potential_payout: number
  actual_payout: number
  status: "won" | "lost" | "pending" | "cancelled"
  placed_at: string
  settled_at?: string
  game_name?: string
  match_name?: string
  team1_name?: string
  team2_name?: string
  final_score?: string
  winning_team?: string
}

interface BettingResultsStats {
  totalBets: number
  wonBets: number
  lostBets: number
  pendingBets: number
  totalWagered: number
  totalWon: number
  netProfit: number
  winRate: number
  avgOdds: number
  biggestWin: number
  biggestLoss: number
}

export function BettingResults() {
  const [results, setResults] = useState<BettingResult[]>([])
  const [stats, setStats] = useState<BettingResultsStats>({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    pendingBets: 0,
    totalWagered: 0,
    totalWon: 0,
    netProfit: 0,
    winRate: 0,
    avgOdds: 0,
    biggestWin: 0,
    biggestLoss: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all")

  const supabase = createClient()

  useEffect(() => {
    loadBettingResults()
  }, [])

  const loadBettingResults = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: betsData, error: betsError } = await supabase
        .from("bets")
        .select(`
          *,
          betting_markets (
            id,
            game_id,
            market_type,
            selection
          )
        `)
        .eq("user_id", user.user.id)
        .order("placed_at", { ascending: false })
        .limit(100)

      if (betsError) throw betsError

      const gameIds = [...new Set((betsData || []).map((bet) => bet.betting_markets?.game_id).filter(Boolean))]

      let matchesData: any[] = []
      if (gameIds.length > 0) {
        const { data: matches, error: matchesError } = await supabase
          .from("matches")
          .select(`
            id,
            name,
            status,
            game,
            match_type,
            created_at
          `)
          .in("id", gameIds)

        if (!matchesError) {
          matchesData = matches || []
        }
      }

      const transformedResults: BettingResult[] = (betsData || []).map((bet) => {
        const matchData = matchesData.find((m) => m.id === bet.betting_markets?.game_id)

        return {
          id: bet.id,
          market_id: bet.market_id || "",
          game_id: bet.betting_markets?.game_id || "",
          bet_type: bet.bet_type || bet.selection || "Unknown",
          selection: bet.bet_type || bet.selection || "Unknown",
          stake_amount: bet.stake_amount || bet.stake || 0,
          odds: bet.odds || 0,
          potential_payout: bet.potential_payout || 0,
          actual_payout: bet.status === "won" ? bet.potential_payout || 0 : 0,
          status: bet.status,
          placed_at: bet.placed_at || bet.created_at,
          settled_at: bet.settled_at,
          game_name: matchData?.name || `Game ${bet.betting_markets?.game_id?.slice(0, 8) || "Unknown"}`,
          match_name: matchData?.name || "Unknown Match",
          team1_name: "Team 1", // Default team names since columns don't exist
          team2_name: "Team 2",
          final_score: undefined, // Remove score display until proper scoring system is implemented
          winning_team: matchData?.winner || matchData?.winning_team,
        }
      })

      setResults(transformedResults)

      // Calculate statistics
      const totalBets = transformedResults.length
      const wonBets = transformedResults.filter((r) => r.status === "won").length
      const lostBets = transformedResults.filter((r) => r.status === "lost").length
      const pendingBets = transformedResults.filter((r) => r.status === "pending").length

      const totalWagered = transformedResults.reduce((sum, r) => sum + r.stake_amount, 0)
      const totalWon = transformedResults.filter((r) => r.status === "won").reduce((sum, r) => sum + r.actual_payout, 0)
      const netProfit = totalWon - totalWagered
      const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0

      const avgOdds = totalBets > 0 ? transformedResults.reduce((sum, r) => sum + Math.abs(r.odds), 0) / totalBets : 0
      const biggestWin = Math.max(
        0,
        ...transformedResults.filter((r) => r.status === "won").map((r) => r.actual_payout - r.stake_amount),
      )
      const biggestLoss = Math.max(
        0,
        ...transformedResults.filter((r) => r.status === "lost").map((r) => r.stake_amount),
      )

      setStats({
        totalBets,
        wonBets,
        lostBets,
        pendingBets,
        totalWagered,
        totalWon,
        netProfit,
        winRate,
        avgOdds,
        biggestWin,
        biggestLoss,
      })
    } catch (error) {
      console.error("Error loading betting results:", error)
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
        return <XCircle className="h-4 w-4 text-gray-500" />
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

  const getProfitLoss = (result: BettingResult) => {
    if (result.status === "won") {
      return result.actual_payout - result.stake_amount
    } else if (result.status === "lost") {
      return -result.stake_amount
    }
    return 0
  }

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.game_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.selection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.bet_type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || result.status === filterStatus

    let matchesTime = true
    if (timeFilter !== "all") {
      const resultDate = new Date(result.placed_at)
      const now = new Date()

      switch (timeFilter) {
        case "today":
          matchesTime = resultDate.toDateString() === now.toDateString()
          break
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesTime = resultDate >= weekAgo
          break
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesTime = resultDate >= monthAgo
          break
      }
    }

    return matchesSearch && matchesStatus && matchesTime
  })

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading betting results...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Net Profit</CardTitle>
            {stats.netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {stats.netProfit >= 0 ? "+" : ""}${stats.netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-emerald-700">
              {stats.wonBets}W - {stats.lostBets}L - {stats.pendingBets}P
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.winRate > 50 ? "text-emerald-700" : "text-red-700"}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-blue-600">{stats.totalBets} total bets</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Total Wagered</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">${stats.totalWagered.toFixed(2)}</div>
            <p className="text-xs text-purple-600">
              Avg: ${stats.totalBets > 0 ? (stats.totalWagered / stats.totalBets).toFixed(2) : "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Biggest Win</CardTitle>
            <Trophy className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">${stats.biggestWin.toFixed(2)}</div>
            <p className="text-xs text-orange-600">Biggest loss: ${stats.biggestLoss.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by game, bet type, or selection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="won">Won</TabsTrigger>
                <TabsTrigger value="lost">Lost</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Betting Results ({filteredResults.length})</h3>

        {filteredResults.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                {results.length === 0
                  ? "You haven't placed any bets yet"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredResults.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <Badge variant={getStatusVariant(result.status)} className="font-medium">
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(result.placed_at).toLocaleDateString()} at{" "}
                      {new Date(result.placed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-right">
                    {result.status !== "pending" && (
                      <div
                        className={`text-lg font-bold ${getProfitLoss(result) > 0 ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {getProfitLoss(result) > 0 ? "+" : ""}${getProfitLoss(result).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">{result.game_name}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        <strong>Bet Type:</strong> {result.bet_type}
                      </div>
                      <div>
                        <strong>Selection:</strong> {result.selection}
                      </div>
                      <div>
                        <strong>Match:</strong> {result.team1_name} vs {result.team2_name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Stake</div>
                        <div className="font-semibold">${result.stake_amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Odds</div>
                        <div className="font-semibold">
                          {result.odds > 0 ? "+" : ""}
                          {result.odds}
                        </div>
                      </div>
                    </div>

                    {result.status === "pending" && (
                      <div className="text-sm">
                        <div className="text-muted-foreground">Potential Payout</div>
                        <div className="font-semibold text-emerald-700">${result.potential_payout.toFixed(2)}</div>
                      </div>
                    )}

                    {result.settled_at && (
                      <div className="text-xs text-muted-foreground">
                        Settled: {new Date(result.settled_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredResults.length > 0 && filteredResults.length < results.length && (
        <div className="text-center">
          <Button variant="outline" onClick={loadBettingResults}>
            Load More Results
          </Button>
        </div>
      )}
    </div>
  )
}
