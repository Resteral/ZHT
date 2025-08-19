"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Game {
  id: string
  home_team: { name: string; avatar?: string; record: string }
  away_team: { name: string; avatar?: string; record: string }
  scheduled_time: string
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
          scheduled_time,
          home_team:teams!games_home_team_id_fkey(name, logo_url),
          away_team:teams!games_away_team_id_fkey(name, logo_url),
          betting_markets(type, home_odds, away_odds, home_spread, away_spread, over, under, over_odds, under_odds)
        `)
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true })
        .limit(10)

      if (gamesError) throw gamesError

      const { data: futuresData, error: futuresError } = await supabase
        .from("betting_futures")
        .select("*")
        .eq("active", true)
        .order("odds", { ascending: true })
        .limit(10)

      if (futuresError) throw futuresError

      setUpcomingGames(gamesData || [])
      setFutures(futuresData || [])
    } catch (error) {
      console.error("Error loading betting data:", error)
      setUpcomingGames([])
      setFutures([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading betting markets...</div>
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Games */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Games</h3>
        {upcomingGames.length === 0 ? (
          <div className="text-center py-8">
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
                      <AvatarImage src={game.away_team.avatar || "/placeholder.svg"} alt={game.away_team.name} />
                      <AvatarFallback>{game.away_team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{game.away_team.name}</p>
                      <p className="text-xs text-muted-foreground">{game.away_team.record}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium">@</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium text-sm">{game.home_team.name}</p>
                      <p className="text-xs text-muted-foreground">{game.home_team.record}</p>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={game.home_team.avatar || "/placeholder.svg"} alt={game.home_team.name} />
                      <AvatarFallback>{game.home_team.name.slice(0, 2)}</AvatarFallback>
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
