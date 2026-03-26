"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Game {
  id: string
  scheduled_time: string
  home_team: { name: string; avatar?: string; record: string }
  away_team: { name: string; avatar?: string; record: string }
  markets: Array<{
    type: string
    home_odds?: string
    away_odds?: string
    home_spread?: string
    away_spread?: string
    over?: string
    under?: string
    over_odds?: string
    under_odds?: string
  }>
}

interface Future {
  market: string
  team?: string
  player?: string
  odds: string
  probability: string
}

export function UpcomingBets() {
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [futures, setFutures] = useState<Future[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadBettingData()
  }, [])

  const loadBettingData = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(`
          id,
          game_date,
          home_score,
          away_score,
          status,
          home_user:users!games_home_user_id_fkey(username, display_name, wins, losses),
          away_user:users!games_away_user_id_fkey(username, display_name, wins, losses),
          betting_markets(market_type, odds_home, odds_away, spread_line, total_line)
        `)
        .gte("game_date", new Date().toISOString())
        .order("game_date", { ascending: true })
        .limit(10)

      if (gamesError) throw gamesError

      const transformedGames =
        gamesData?.map((game) => ({
          id: game.id,
          scheduled_time: game.game_date,
          home_team: {
            name: game.home_user?.username || "Unknown Player",
            avatar: undefined,
            record: `${game.home_user?.wins || 0}-${game.home_user?.losses || 0}`,
          },
          away_team: {
            name: game.away_user?.username || "Unknown Player",
            avatar: undefined,
            record: `${game.away_user?.wins || 0}-${game.away_user?.losses || 0}`,
          },
          markets:
            game.betting_markets?.map((market: any) => ({
              type: market.market_type,
              home_odds: market.odds_home ? `${market.odds_home > 0 ? "+" : ""}${market.odds_home}` : "EVEN",
              away_odds: market.odds_away ? `${market.odds_away > 0 ? "+" : ""}${market.odds_away}` : "EVEN",
              home_spread: market.spread_line ? `${market.spread_line > 0 ? "+" : ""}${market.spread_line}` : "0",
              away_spread: market.spread_line ? `${-market.spread_line > 0 ? "+" : ""}${-market.spread_line}` : "0",
              over: market.total_line?.toString() || "TBD",
              under: market.total_line?.toString() || "TBD",
              over_odds: "EVEN",
              under_odds: "EVEN",
            })) || [],
        })) || []

      setUpcomingGames(transformedGames)

      const { data: futuresData } = await supabase
        .from("betting_markets")
        .select("*")
        .eq("market_type", "futures")
        .eq("status", "active")

      const transformedFutures =
        futuresData?.map((future) => ({
          market: future.description || "Season Winner",
          team: future.description?.includes("Team") ? "TBD" : undefined,
          player: future.description?.includes("Player") ? "TBD" : undefined,
          odds: future.odds_home ? `+${future.odds_home}` : "TBD",
          probability: "TBD",
        })) || []

      setFutures(transformedFutures)
    } catch (error) {
      console.error("Error loading betting data:", error)
      setUpcomingGames([])
      setFutures([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading betting markets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Games */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Games</h3>
        {upcomingGames.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Upcoming Games</h3>
            <p className="text-muted-foreground">No games are currently scheduled for betting.</p>
          </div>
        ) : (
          upcomingGames.map((game) => (
            <Card key={game.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{new Date(game.scheduled_time).toLocaleString()}</span>
                  </div>
                  <Badge variant="outline">Pre-game</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{game.away_team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{game.away_team.name}</p>
                      <p className="text-xs text-muted-foreground">{game.away_team.record}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium">vs</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium text-sm">{game.home_team.name}</p>
                      <p className="text-xs text-muted-foreground">{game.home_team.record}</p>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{game.home_team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {game.markets && game.markets.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {game.markets.slice(0, 3).map((market, index) => (
                      <div key={index} className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          {market.type === "moneyline" ? "Moneyline" : market.type === "spread" ? "Spread" : "Total"}
                        </p>
                        {market.type === "moneyline" && (
                          <div className="space-y-2">
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              {game.away_team.name} {market.away_odds}
                            </Button>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              {game.home_team.name} {market.home_odds}
                            </Button>
                          </div>
                        )}
                        {market.type === "spread" && (
                          <div className="space-y-2">
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              {game.away_team.name} {market.away_spread} ({market.away_odds})
                            </Button>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              {game.home_team.name} {market.home_spread} ({market.home_odds})
                            </Button>
                          </div>
                        )}
                        {market.type === "total" && (
                          <div className="space-y-2">
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              O {market.over} ({market.over_odds})
                            </Button>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              U {market.under} ({market.under_odds})
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Betting markets not yet available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Futures Markets */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Futures & Specials</h3>
        {futures.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Futures Available</h3>
            <p className="text-muted-foreground">No futures markets are currently active.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {futures.map((future, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{future.market}</CardTitle>
                  <CardDescription>Season-long betting market</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{future.team || future.player}</p>
                      <p className="text-xs text-muted-foreground">Implied: {future.probability}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      {future.odds}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
