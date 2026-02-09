"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Game {
  id: string
  game_title: string
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

export function UpcomingContests() {
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [futures, setFutures] = useState<Future[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadBettingData()
  }, [])

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const loadBettingData = async () => {
    try {
      setLoading(true)
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 800))

      const { MOCK_ESPORTS_MATCHES } = await import("@/lib/mock-esports-data")

      const upcoming = MOCK_ESPORTS_MATCHES
        .filter(m => m.status === "upcoming")
        .map(game => ({
          id: game.id,
          game_title: game.gameTitle,
          scheduled_time: game.scheduledTime,
          home_team: {
            name: game.homeTeam.name,
            avatar: undefined,
            record: game.homeTeam.record
          },
          away_team: {
            name: game.awayTeam.name,
            avatar: undefined,
            record: game.awayTeam.record
          },
          // Add game title to the object for UI rendering if needed, 
          // though the interface might need updating. For now mapping to existing structure.
          markets: game.markets.map(m => ({
            type: m.type,
            home_odds: m.homeOdds,
            away_odds: m.awayOdds,
            home_spread: m.homeSpread || "0",
            away_spread: m.awaySpread || "0",
            over: m.over || "TBD",
            under: m.under || "TBD",
            over_odds: m.overOdds || "EVEN",
            under_odds: m.underOdds || "EVEN"
          }))
        }))

      setUpcomingGames(upcoming)
      setFutures([]) // Mock futures as empty for now
    } catch (error) {
      console.error("Error loading betting data:", error)
      setUpcomingGames([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading contests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Games */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Contests</h3>
        {upcomingGames.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Upcoming Contests</h3>
            <p className="text-muted-foreground">No contests are currently scheduled.</p>
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
                  <div className="flex gap-2">
                    <Badge variant="secondary">{game.game_title}</Badge>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Prize Pool: $500+ {/* Mock value or from prop */}
                    </Badge>
                  </div>
                </div>

                <Link href={`/bet/${game.id}`} className="block hover:bg-slate-800/50 rounded-lg p-2 transition-colors -mx-2">
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
                </Link>
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
                    <p>Contest selection not yet available</p>
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
                  <CardDescription>Season-long contest market</CardDescription>
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
