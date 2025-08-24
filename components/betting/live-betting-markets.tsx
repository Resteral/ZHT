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
  isELOLobby?: boolean
  entryFee?: number
  prizePool?: number
  participantCount?: number
  maxParticipants?: number
  averageElo?: number
}

export function LiveBettingMarkets() {
  const { markets, odds } = useRealtimeBetting()
  const [liveMarkets, setLiveMarkets] = useState<LiveMarket[]>([])
  const [eloLobbies, setEloLobbies] = useState<LiveMarket[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadLiveMarkets()
    loadELOLobbies()
  }, [])

  const loadELOLobbies = async () => {
    try {
      console.log("[v0] Loading ELO lobbies for live betting...")

      const { data: lobbies, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          status,
          start_date,
          match_type,
          max_participants,
          entry_fee,
          prize_pool,
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .in("match_type", ["4v4_draft", "3v3_draft", "2v2_draft", "1v1_draft", "5v5_draft", "6v6_draft"])
        .in("status", ["waiting", "active", "drafting"])
        .order("start_date", { ascending: true })

      if (error) throw error

      const formattedLobbies: LiveMarket[] =
        lobbies?.map((lobby) => {
          const participants = lobby.match_participants || []
          const avgElo =
            participants.length > 0
              ? participants.reduce((sum, p) => sum + (p.users?.elo_rating || 1200), 0) / participants.length
              : 1200

          return {
            id: lobby.id,
            gameId: lobby.id,
            homeTeam: {
              name: `ELO Lobby ${lobby.id.slice(0, 8)}`,
              score: participants.length,
            },
            awayTeam: {
              name: `${lobby.match_type?.toUpperCase()} Draft`,
              score: lobby.max_participants || 8,
            },
            timeRemaining: lobby.status === "waiting" ? "Waiting for players" : "Draft starting",
            quarter: lobby.status === "waiting" ? "Lobby" : "Draft",
            markets: [
              {
                type: "lobby_fill",
                homeOdds: participants.length >= (lobby.max_participants || 8) * 0.8 ? "-200" : "+150",
                awayOdds: participants.length >= (lobby.max_participants || 8) * 0.8 ? "+170" : "-180",
                trend: participants.length > (lobby.max_participants || 8) * 0.5 ? "up" : "stable",
              },
              {
                type: "avg_elo",
                over: `${Math.round(avgElo + 50)}.5`,
                under: `${Math.round(avgElo + 50)}.5`,
                overOdds: avgElo > 1300 ? "-120" : "+110",
                underOdds: avgElo > 1300 ? "+100" : "-130",
                trend: avgElo > 1250 ? "up" : "down",
              },
            ],
            volume: Math.floor(Math.random() * 20) + 5,
            isELOLobby: true,
            entryFee: lobby.entry_fee || 0,
            prizePool: lobby.prize_pool || 0,
            participantCount: participants.length,
            maxParticipants: lobby.max_participants || 8,
            averageElo: Math.round(avgElo),
          }
        }) || []

      setEloLobbies(formattedLobbies)
      console.log("[v0] Loaded ELO lobbies:", formattedLobbies.length)
    } catch (error) {
      console.error("Error loading ELO lobbies:", error)
      setEloLobbies([])
    }
  }

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
            name: `Team A`,
            score: 0,
          },
          awayTeam: {
            name: `Team B`,
            score: 0,
          },
          timeRemaining: "00:00",
          quarter: "Final",
          markets: [
            {
              type: "moneyline",
              homeOdds: market.odds_home?.toString() || "EVEN",
              awayOdds: market.odds_away?.toString() || "EVEN",
              trend: "stable",
            },
          ],
          volume: 0,
        })) || []

      setLiveMarkets(formattedMarkets)
    } catch (error) {
      console.error("Error loading live markets:", error)
      setLiveMarkets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (markets.length > 0) {
      setLiveMarkets(markets)
    }
  }, [markets])

  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveMarkets()
      loadELOLobbies()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  const allMarkets = [...liveMarkets, ...eloLobbies]

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading live markets...</p>
      </div>
    )
  }

  if (allMarkets.length === 0) {
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
        <h3 className="text-lg font-semibold">Live Games & ELO Lobbies</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live Updates</span>
          <Badge variant="secondary">{eloLobbies.length} ELO Lobbies</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {allMarkets.map((market) => (
          <Card key={market.id} className={market.isELOLobby ? "border-purple-200 dark:border-purple-800" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge
                    variant="secondary"
                    className={market.isELOLobby ? "bg-purple-500/10 text-purple-500" : "bg-red-500/10 text-red-500"}
                  >
                    {market.isELOLobby ? "ELO LOBBY" : "LIVE"}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {market.quarter} - {market.timeRemaining}
                    </span>
                  </div>
                  {market.isELOLobby && (
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>Avg ELO: {market.averageElo}</span>
                      <span>•</span>
                      <span>
                        {market.participantCount}/{market.maxParticipants}
                      </span>
                      {market.entryFee > 0 && (
                        <>
                          <span>•</span>
                          <span>${market.entryFee} entry</span>
                        </>
                      )}
                    </div>
                  )}
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
                      {bet.type === "lobby_fill"
                        ? "Lobby Fills"
                        : bet.type === "avg_elo"
                          ? "Average ELO"
                          : bet.type === "moneyline"
                            ? "Moneyline"
                            : bet.type === "spread"
                              ? "Spread"
                              : "Total"}
                    </p>
                    {bet.type === "lobby_fill" && (
                      <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          Yes {bet.homeOdds}
                        </Button>
                        <Button size="sm" variant="outline" className="w-full bg-transparent">
                          No {bet.awayOdds}
                        </Button>
                      </div>
                    )}
                    {bet.type === "avg_elo" && (
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
