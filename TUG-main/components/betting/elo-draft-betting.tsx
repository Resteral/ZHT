"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Gamepad2, TrendingUp, Users, Trophy, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ELODraftMarket {
  id: string
  match_name: string
  status: string
  participants: Array<{
    user_id: string
    username: string
    elo_rating: number
    team_assignment: number | null
    wins: number
    losses: number
    total_games: number
    recent_goals?: number
    recent_assists?: number
    recent_save_percentage?: number
    recent_pass_accuracy?: number
  }>
  markets: Array<{
    type: "winner" | "total_score" | "highest_elo_wins" | "mvp" | "team_winner" | "player_passes" | "player_assists"
    description: string
    options: Array<{
      selection: string
      odds: number
      player_id?: string
    }>
  }>
  start_date: string
}

export function ELODraftBetting() {
  const [draftMarkets, setDraftMarkets] = useState<ELODraftMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBets, setSelectedBets] = useState<{
    [key: string]: { selection: string; odds: number; stake: number }
  }>({})
  const supabase = createClient()

  useEffect(() => {
    loadELODraftMarkets()
    const interval = setInterval(loadELODraftMarkets, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadELODraftMarkets = async () => {
    try {
      const { data: matches, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          status,
          start_date,
          match_type,
          max_participants,
          match_participants (
            user_id,
            users (
              username,
              display_name,
              elo_rating,
              wins,
              losses,
              total_games
            )
          )
        `)
        .in("match_type", ["4v4", "3v3", "2v2", "1v1", "5v5", "6v6", "4v4_draft"])
        .in("status", ["waiting", "active", "drafting"])
        .gte("start_date", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("start_date", { ascending: true })

      if (error) throw error

      const { data: performanceData } = await supabase
        .from("player_performance_cache")
        .select("user_id, recent_goals, recent_save_percentage, recent_pass_accuracy")

      const performanceMap = new Map()
      performanceData?.forEach((perf) => {
        performanceMap.set(perf.user_id, perf)
      })

      const markets: ELODraftMarket[] =
        matches?.map((match) => {
          const participants =
            match.match_participants?.map((p: any) => {
              const performance = performanceMap.get(p.user_id) || {}
              return {
                user_id: p.user_id,
                username: p.users?.username || "Unknown",
                elo_rating: p.users?.elo_rating || 1200,
                team_assignment: null, // Set to null since team_assignment column doesn't exist
                wins: p.users?.wins || 0,
                losses: p.users?.losses || 0,
                total_games: p.users?.total_games || 0,
                recent_goals: performance.recent_goals || 0,
                recent_assists: performance.recent_goals || 0, // Using goals as proxy for assists
                recent_save_percentage: performance.recent_save_percentage || 0,
                recent_pass_accuracy: performance.recent_pass_accuracy || 0,
              }
            }) || []

          const sortedByElo = [...participants].sort((a, b) => b.elo_rating - a.elo_rating)
          const avgElo = participants.reduce((sum, p) => sum + p.elo_rating, 0) / participants.length

          return {
            id: match.id,
            match_name: match.name || `${match.match_type?.toUpperCase()} Draft ${match.id.slice(0, 8)}`,
            status: match.status,
            participants,
            start_date: match.start_date,
            markets: [
              {
                type: "winner",
                description: "Match Winner",
                options: participants.map((p) => ({
                  selection: p.username,
                  odds: calculateWinnerOdds(p.elo_rating, avgElo, p.wins, p.losses, p.recent_goals),
                  player_id: p.user_id,
                })),
              },
              {
                type: "mvp",
                description: "Most Valuable Player",
                options: participants.map((p) => ({
                  selection: p.username,
                  odds: calculateMVPOdds(p.elo_rating, participants.length, p.total_games, p.recent_goals),
                  player_id: p.user_id,
                })),
              },
              {
                type: "highest_elo_wins",
                description: "Highest ELO Player Wins",
                options: [
                  {
                    selection: "Yes",
                    odds:
                      sortedByElo.length > 1 ? calculateHighestEloOdds(sortedByElo[0].elo_rating, avgElo, true) : -200,
                  },
                  {
                    selection: "No",
                    odds:
                      sortedByElo.length > 1 ? calculateHighestEloOdds(sortedByElo[0].elo_rating, avgElo, false) : +170,
                  },
                ],
              },
              {
                type: "total_score",
                description: "Total Match Score",
                options: [
                  { selection: "Over 50.5", odds: calculateTotalScoreOdds(avgElo, true) },
                  { selection: "Under 50.5", odds: calculateTotalScoreOdds(avgElo, false) },
                ],
              },
              {
                type: "player_passes",
                description: "Player Passes Over/Under",
                options: participants.flatMap((p) => [
                  {
                    selection: `${p.username} Over 15.5 Passes`,
                    odds: calculatePlayerStatOdds(p.elo_rating, p.total_games, "passes", true, p.recent_pass_accuracy),
                    player_id: p.user_id,
                  },
                  {
                    selection: `${p.username} Under 15.5 Passes`,
                    odds: calculatePlayerStatOdds(p.elo_rating, p.total_games, "passes", false, p.recent_pass_accuracy),
                    player_id: p.user_id,
                  },
                ]),
              },
              {
                type: "player_assists",
                description: "Player Assists Over/Under",
                options: participants.flatMap((p) => [
                  {
                    selection: `${p.username} Over 2.5 Assists`,
                    odds: calculatePlayerStatOdds(p.elo_rating, p.total_games, "assists", true, p.recent_assists),
                    player_id: p.user_id,
                  },
                  {
                    selection: `${p.username} Under 2.5 Assists`,
                    odds: calculatePlayerStatOdds(p.elo_rating, p.total_games, "assists", false, p.recent_assists),
                    player_id: p.user_id,
                  },
                ]),
              },
              {
                type: "team_winner",
                description: "Winning Team",
                options: [
                  { selection: "Team 1", odds: calculateTeamOdds(participants, 1) },
                  { selection: "Team 2", odds: calculateTeamOdds(participants, 2) },
                ],
              },
            ],
          }
        }) || []

      setDraftMarkets(markets)
    } catch (error) {
      console.error("Error loading ELO draft markets:", error)
      setDraftMarkets([])
    } finally {
      setLoading(false)
    }
  }

  const calculateWinnerOdds = (
    playerElo: number,
    avgElo: number,
    wins: number,
    losses: number,
    recentGoals?: number,
  ) => {
    const eloDiff = playerElo - avgElo
    const winRate = wins + losses > 0 ? wins / (wins + losses) : 0.5
    const baseOdds = 100
    const eloAdjustment = eloDiff * 1.5
    const formAdjustment = (winRate - 0.5) * 50
    const performanceAdjustment = recentGoals ? recentGoals * 5 : 0
    const finalOdds = Math.round(Math.max(baseOdds - eloAdjustment - formAdjustment - performanceAdjustment, -400))
    return finalOdds
  }

  const calculateMVPOdds = (playerElo: number, totalPlayers: number, totalGames: number, recentGoals?: number) => {
    const baseOdds = 100 / totalPlayers
    const eloBonus = (playerElo - 1200) / 12
    const experienceBonus = Math.min(totalGames / 50, 0.2) * 20
    const performanceBonus = recentGoals ? recentGoals * 2 : 0
    const adjustedOdds = Math.max(baseOdds + eloBonus + experienceBonus + performanceBonus, 5)
    return Math.round((100 / adjustedOdds - 1) * 100)
  }

  const calculateHighestEloOdds = (highestElo: number, avgElo: number, isYes: boolean) => {
    const eloDiff = highestElo - avgElo
    const advantage = Math.min(eloDiff / 100, 3)
    const yesOdds = Math.max(-300, -150 - advantage * 50)
    const noOdds = Math.min(+300, +130 + advantage * 30)
    return isYes ? yesOdds : noOdds
  }

  const calculateTotalScoreOdds = (avgElo: number, isOver: boolean) => {
    const eloFactor = (avgElo - 1200) / 200
    const baseOdds = -110
    const adjustment = eloFactor * 20
    return isOver ? baseOdds - adjustment : baseOdds + adjustment
  }

  const calculatePlayerStatOdds = (
    playerElo: number,
    totalGames: number,
    statType: "passes" | "assists",
    isOver: boolean,
    recentPerformance?: number,
  ) => {
    const eloFactor = (playerElo - 1200) / 100
    const experienceFactor = Math.min(totalGames / 100, 1)

    const baseOdds = -110
    let eloAdjustment = eloFactor * 15
    const experienceAdjustment = experienceFactor * 10
    const performanceAdjustment = recentPerformance ? recentPerformance * 3 : 0

    if (statType === "assists") {
      eloAdjustment *= 1.5
    }

    const totalAdjustment = eloAdjustment + experienceAdjustment + performanceAdjustment

    if (isOver) {
      return Math.round(Math.max(baseOdds - totalAdjustment, -300))
    } else {
      return Math.round(Math.min(baseOdds + totalAdjustment, +250))
    }
  }

  const calculateTeamOdds = (participants: any[], teamNumber: number) => {
    // Since team_assignment doesn't exist, we'll assign teams based on participant order
    const halfPoint = Math.ceil(participants.length / 2)
    const teamPlayers = teamNumber === 1 ? participants.slice(0, halfPoint) : participants.slice(halfPoint)
    const otherTeamPlayers = teamNumber === 1 ? participants.slice(halfPoint) : participants.slice(0, halfPoint)

    if (teamPlayers.length === 0 || otherTeamPlayers.length === 0) return -110

    const teamAvgElo = teamPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / teamPlayers.length
    const otherAvgElo = otherTeamPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / otherTeamPlayers.length

    const eloDiff = teamAvgElo - otherAvgElo
    const baseOdds = -110
    const adjustment = eloDiff / 10

    return Math.round(Math.max(baseOdds - adjustment, -300))
  }

  const placeELODraftBet = async (
    matchId: string,
    marketType: string,
    selection: string,
    odds: number,
    stake: number,
    playerId?: string,
  ) => {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (userError || !user.user) throw new Error("Not authenticated")

      const { data: wallet, error: walletError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.user.id)
        .single()

      if (walletError || !wallet || wallet.balance < stake) {
        throw new Error("Insufficient balance")
      }

      const { data: market, error: marketError } = await supabase
        .from("betting_markets")
        .upsert({
          game_id: matchId,
          market_type: marketType,
          description: `${marketType} - ${selection}`,
          status: "active",
        })
        .select()
        .single()

      if (marketError) throw marketError

      const potentialPayout = stake * (odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1)

      const { error: betError } = await supabase.from("bets").insert({
        user_id: user.user.id,
        market_id: market.id,
        bet_type: marketType,
        stake_amount: stake,
        odds: odds,
        potential_payout: potentialPayout,
        status: "pending",
        selection: selection,
      })

      if (betError) throw betError

      const { error: updateWalletError } = await supabase
        .from("user_wallets")
        .update({
          balance: wallet.balance - stake,
          total_wagered: supabase.raw("total_wagered + ?", [stake]),
        })
        .eq("user_id", user.user.id)

      if (updateWalletError) throw updateWalletError

      const betKey = `${matchId}-${marketType}-${selection}`
      setSelectedBets((prev) => {
        const newBets = { ...prev }
        delete newBets[betKey]
        return newBets
      })

      alert(`${marketType.toUpperCase()} bet placed successfully! $${stake} on ${selection}`)
      loadELODraftMarkets()
    } catch (error) {
      console.error("Error placing ELO draft bet:", error)
      alert(`Failed to place bet: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const getMarketIcon = (type: string) => {
    switch (type) {
      case "winner":
        return <Trophy className="h-4 w-4" />
      case "mvp":
        return <Target className="h-4 w-4" />
      case "highest_elo_wins":
        return <TrendingUp className="h-4 w-4" />
      case "player_passes":
      case "player_assists":
        return <Target className="h-4 w-4" />
      case "team_winner":
        return <Users className="h-4 w-4" />
      default:
        return <Gamepad2 className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading ELO draft betting markets...</p>
      </div>
    )
  }

  if (draftMarkets.length === 0) {
    return (
      <div className="text-center py-8">
        <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No ELO Draft Markets</h3>
        <p className="text-muted-foreground">No ELO draft games available for betting</p>
        <Button variant="outline" onClick={loadELODraftMarkets} className="mt-4 bg-transparent">
          Refresh Markets
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          ELO Draft Betting
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{draftMarkets.length} games available</Badge>
          <Button size="sm" variant="outline" onClick={loadELODraftMarkets}>
            Refresh
          </Button>
        </div>
      </div>

      {draftMarkets.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    draftMarkets.reduce(
                      (sum, m) => sum + m.participants.reduce((s, p) => s + p.elo_rating, 0) / m.participants.length,
                      0,
                    ) / draftMarkets.length,
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Average ELO</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {draftMarkets.reduce((sum, m) => sum + m.participants.length, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {draftMarkets.reduce((sum, m) => sum + m.markets.length, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Betting Markets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {draftMarkets.map((market) => (
          <Card key={market.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{market.match_name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={market.status === "active" ? "default" : "secondary"}>{market.status}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {market.participants.length} players
                  </div>
                </div>
              </div>
              <CardDescription>Starts: {new Date(market.start_date).toLocaleString()}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {market.markets.map((betMarket, marketIndex) => (
                <div key={marketIndex} className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    {getMarketIcon(betMarket.type)}
                    {betMarket.description}
                  </h4>

                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {betMarket.options.map((option, optionIndex) => {
                      const betKey = `${market.id}-${betMarket.type}-${option.selection}`
                      const selectedBet = selectedBets[betKey]

                      return (
                        <div key={optionIndex} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {option.player_id && (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={`/placeholder-32px.png?height=24&width=24`} />
                                  <AvatarFallback className="text-xs">
                                    {option.selection.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="text-sm font-medium">{option.selection}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {option.odds > 0 ? "+" : ""}
                              {option.odds}
                            </Badge>
                          </div>

                          {selectedBet ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-xs">Stake:</label>
                                <input
                                  type="number"
                                  value={selectedBet.stake}
                                  onChange={(e) =>
                                    setSelectedBets((prev) => ({
                                      ...prev,
                                      [betKey]: { ...selectedBet, stake: Number(e.target.value) || 0 },
                                    }))
                                  }
                                  className="w-16 h-6 text-xs text-center border rounded px-1"
                                  min="1"
                                  step="5"
                                />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    placeELODraftBet(
                                      market.id,
                                      betMarket.type,
                                      option.selection,
                                      option.odds,
                                      selectedBet.stake,
                                      option.player_id,
                                    )
                                  }
                                  className="flex-1 h-7 text-xs"
                                  disabled={selectedBet.stake <= 0}
                                >
                                  Bet ${selectedBet.stake}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedBets((prev) => {
                                      const newBets = { ...prev }
                                      delete newBets[betKey]
                                      return newBets
                                    })
                                  }
                                  className="h-7 text-xs"
                                >
                                  ×
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                To win: $
                                {(
                                  selectedBet.stake *
                                    (option.odds > 0 ? option.odds / 100 + 1 : 100 / Math.abs(option.odds) + 1) -
                                  selectedBet.stake
                                ).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedBets((prev) => ({
                                  ...prev,
                                  [betKey]: { selection: option.selection, odds: option.odds, stake: 10 },
                                }))
                              }
                              className="w-full h-7 text-xs"
                            >
                              Bet
                            </Button>
                          )}
                        </div>
                      )
                    })}
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
