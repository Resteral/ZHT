"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, TrendingUp, Target, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface BettingMarket {
  id: string
  game_id: string
  market_type: string
  description: string
  status: string
  odds_home?: number
  odds_away?: number
  spread_line?: number
  total_line?: number
  created_at: string
  updated_at: string
}

export default function BettingMarketManagement() {
  const [markets, setMarkets] = useState<BettingMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeMarkets: 0,
    totalVolume: 0,
    totalBets: 0,
    profitMargin: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadBettingMarkets()
    loadBettingStats()
  }, [])

  const loadBettingMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from("betting_markets")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setMarkets(data || [])
    } catch (error) {
      console.error("Error loading betting markets:", error)
      setMarkets([])
    } finally {
      setLoading(false)
    }
  }

  const loadBettingStats = async () => {
    try {
      const { data: activeMarketsData } = await supabase
        .from("betting_markets")
        .select("id", { count: "exact" })
        .eq("status", "active")

      const { data: betsData } = await supabase
        .from("bets")
        .select("stake_amount", { count: "exact" })
        .eq("status", "pending")

      const totalVolume = betsData?.reduce((sum, bet) => sum + (bet.stake_amount || 0), 0) || 0

      setStats({
        activeMarkets: activeMarketsData?.length || 0,
        totalVolume,
        totalBets: betsData?.length || 0,
        profitMargin: totalVolume > 0 ? 8.5 : 0,
      })
    } catch (error) {
      console.error("Error loading betting stats:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "closed":
        return "secondary"
      case "settled":
        return "outline"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading betting markets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Betting Market Management</h1>
          <p className="text-muted-foreground">Create and manage all betting markets and odds</p>
        </div>
        <Link href="/admin/betting/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Market
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMarkets}</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBets}</div>
            <p className="text-xs text-muted-foreground">Active bets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitMargin}%</div>
            <p className="text-xs text-muted-foreground">Average margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search markets by title, game, or type..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Type</Button>
            <Button variant="outline">Filter by Status</Button>
            <Button variant="outline">Filter by Game</Button>
          </div>
        </CardContent>
      </Card>

      {/* Markets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Betting Markets</CardTitle>
          <CardDescription>{markets.length} markets total</CardDescription>
        </CardHeader>
        <CardContent>
          {markets.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Betting Markets</h3>
              <p className="text-muted-foreground">Create your first betting market to get started</p>
              <Link href="/admin/betting/create">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Market
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market Details</TableHead>
                  <TableHead>Game/Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((market) => (
                  <TableRow key={market.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{market.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(market.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">Game {market.game_id?.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{market.market_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {market.odds_home && market.odds_away && (
                          <span>
                            {market.odds_home} / {market.odds_away}
                          </span>
                        )}
                        {market.spread_line && <span>±{market.spread_line}</span>}
                        {market.total_line && <span>O/U {market.total_line}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(market.status)}>{market.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/betting/${market.id}/edit`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {market.status === "active" && (
                          <Button size="sm" variant="outline">
                            Close
                          </Button>
                        )}
                        {market.status === "closed" && <Button size="sm">Settle</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
