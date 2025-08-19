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
          home_team_name,
          away_team_name,
          home_score,
          away_score,
          time_remaining,
          quarter,
          volume,
          status,
          betting_odds (
            bet_type,
            home_odds,
            away_odds,
            home_spread,
            away_spread,
            over_total,
            under_total,
            over_odds,
            under_odds,
            trend
          )
        `)
        .eq("status", "live")
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedMarkets: LiveMarket[] =
        marketsData?.map((market) => ({
          id: market.id,
          gameId: market.game_id,
          homeTeam: {
            name: market.home_team_name,
            avatar: "/placeholder.svg?height=32&width=32",
            score: market.home_score,
          },
          awayTeam: {
            name: market.away_team_name,
            avatar: "/placeholder.svg?height=32&width=32",
            score: market.away_score,
          },
          timeRemaining: market.time_remaining || "00:00",
          quarter: market.quarter || "Q1",
          markets:
            market.betting_odds?.map((odds: any) => ({
              type: odds.bet_type,
              homeOdds: odds.home_odds,
              awayOdds: odds.away_odds,
              homeSpread: odds.home_spread,
              awaySpread: odds.away_spread,
              over: odds.over_total,
              under: odds.under_total,
              overOdds: odds.over_odds,
              underOdds: odds.under_odds,
              trend: odds.trend,
            })) || [],
          volume: market.volume || 0,
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
