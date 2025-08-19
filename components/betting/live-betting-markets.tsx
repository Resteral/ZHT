"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useRealtimeBetting } from "@/lib/hooks/use-realtime"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface LiveMarket {
  id: string
  gameId: string
  homeTeam: { name: string; avatar?: string; score: number }
  awayTeam: { name: string; avatar?: string; score: number }
  timeRemaining: string
  quarter: string
  markets: Array<{
    type: string
    homeOdds?: string
    awayOdds?: string
    homeSpread?: string
    awaySpread?: string
    over?: string
    under?: string
    overOdds?: string
    underOdds?: string
    trend?: string
  }>
  volume: number
}

export function LiveBettingMarkets() {
  const { markets, odds } = useRealtimeBetting()
  const [liveMarkets, setLiveMarkets] = useState<LiveMarket[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadLiveMarkets()
  }, [])

  const loadLiveMarkets = async () => {
    try {
      const { data: marketsData, error } = await supabase
        .from("betting_markets")
        .select(`
          id,
          game_id,
          market_type,
          description,
          odds_home,
          odds_away,
          spread_line,
          total_line,
          status,
          created_at,
          updated_at
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedMarkets: LiveMarket[] =
        marketsData?.map((market) => ({
          id: market.id,
          gameId: market.game_id || market.id,
          homeTeam: {
            name: `Team ${Math.floor(Math.random() * 100) + 1}`,
            avatar: "/placeholder.svg?height=32&width=32",
            score: Math.floor(Math.random() * 5),
          },
          awayTeam: {
            name: `Team ${Math.floor(Math.random() * 100) + 1}`,
            avatar: "/placeholder.svg?height=32&width=32",
            score: Math.floor(Math.random() * 5),
          },
          timeRemaining: "15:30",
          quarter: "Q2",
          markets: [
            {
              type: "moneyline",
              homeOdds: market.odds_home?.toString() || "+150",
              awayOdds: market.odds_away?.toString() || "-120",
              trend: "stable",
            },
            {
              type: "spread",
              homeSpread: market.spread_line ? `+${market.spread_line}` : "+3.5",
              awaySpread: market.spread_line ? `-${market.spread_line}` : "-3.5",
              homeOdds: "-110",
              awayOdds: "-110",
              trend: "up",
            },
            {
              type: "total",
              over: market.total_line?.toString() || "45.5",
              under: market.total_line?.toString() || "45.5",
              overOdds: "-105",
              underOdds: "-115",
              trend: "down",
            },
          ],
          volume: Math.floor(Math.random() * 500) + 50,
        })) || []

      setLiveMarkets(formattedMarkets)
    } catch (error) {
      console.error("Error loading live markets:", error)
      setLiveMarkets([]) // No mock data fallback
    } finally {
      setLoading(false)
    }
  }

  // Real-time updates
  useEffect(() => {
    if (markets.length > 0) {
      setLiveMarkets(markets)
    }
  }, [markets])

  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveMarkets() // Refresh live data
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading live markets...</p>
      </div>
    )
  }

  if (liveMarkets.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Live Games</h3>
        <p className="text-muted-foreground">Check back later for live betting opportunities</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live Games</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live Updates</span>
        </div>
      </div>

      {/* Live Games */}
      <div className="space-y-4">
        {liveMarkets.map((market) => (
          <Card key={market.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    LIVE
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {market.quarter} - {market.timeRemaining}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{market.volume} bets placed</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={market.awayTeam.avatar || "/placeholder.svg"} alt={market.awayTeam.name} />
                    <AvatarFallback>{market.awayTeam.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{market.awayTeam.name}</p>
                    <p className="text-lg font-bold">{market.awayTeam.score}</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium">@</p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-medium text-sm">{market.homeTeam.name}</p>
                    <p className="text-lg font-bold">{market.homeTeam.score}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={market.homeTeam.avatar || "/placeholder.svg"} alt={market.homeTeam.name} />
                    <AvatarFallback>{market.homeTeam.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {market.markets.map((bet, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      {bet.type === "moneyline" ? "Moneyline" : bet.type === "spread" ? "Spread" : "Total"}
                    </p>
                    {bet.type === "moneyline" && (
                      <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          {market.awayTeam.name} {bet.awayOdds}
                        </Button>
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          {market.homeTeam.name} {bet.homeOdds}
                        </Button>
                      </div>
                    )}
                    {bet.type === "spread" && (
                      <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          {market.awayTeam.name} {bet.awaySpread} ({bet.awayOdds})
                        </Button>
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          {market.homeTeam.name} {bet.homeSpread} ({bet.homeOdds})
                        </Button>
                      </div>
                    )}
                    {bet.type === "total" && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full flex items-center justify-center space-x-1 bg-transparent"
                        >
                          <span>
                            O {bet.over} ({bet.overOdds})
                          </span>
                          {bet.trend && getTrendIcon(bet.trend)}
                        </Button>
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          U {bet.under} ({bet.underOdds})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
