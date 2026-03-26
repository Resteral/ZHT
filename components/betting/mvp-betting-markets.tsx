"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Users, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface MVPMarket {
  id: string
  match_id: string
  match_name: string
  status: string
  participants: Array<{
    user_id: string
    username: string
    elo_rating: number
    odds: number
  }>
  total_bets: number
  closes_at: string
}

export function MVPBettingMarkets() {
  const [mvpMarkets, setMvpMarkets] = useState<MVPMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBets, setSelectedBets] = useState<{
    [key: string]: { player_id: string; odds: number; stake: number }
  }>({})
  const supabase = createClient()

  useEffect(() => {
    loadMVPMarkets()
  }, [])

  const loadMVPMarkets = async () => {
    try {
      const { data: matches, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          status,
          start_date,
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .in("status", ["waiting", "active", "drafting"])
        .order("start_date", { ascending: true })

      if (error) throw error

      const markets: MVPMarket[] =
        matches?.map((match) => {
          const participants =
            match.match_participants?.map((p: any) => ({
              user_id: p.user_id,
              username: p.users?.username || "Unknown",
              elo_rating: p.users?.elo_rating || 1200,
              odds: calculateMVPOdds(p.users?.elo_rating || 1200, match.match_participants?.length || 1),
            })) || []

          return {
            id: match.id,
            match_id: match.id,
            match_name: match.name || `Match ${match.id.slice(0, 8)}`,
            status: match.status,
            participants,
            total_bets: 0,
            closes_at: match.start_date || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }
        }) || []

      setMvpMarkets(markets)
    } catch (error) {
      console.error("Error loading MVP markets:", error)
      setMvpMarkets([])
    } finally {
      setLoading(false)
    }
  }

  const calculateMVPOdds = (playerElo: number, totalPlayers: number) => {
    const baseOdds = 100 / totalPlayers // Equal odds baseline
    const eloBonus = (playerElo - 1200) / 10 // ELO adjustment
    const adjustedOdds = Math.max(baseOdds + eloBonus, 10) // Minimum 10% chance
    return Math.round((100 / adjustedOdds - 1) * 100) // Convert to American odds
  }

  const placeMVPBet = async (matchId: string, playerId: string, odds: number, stake: number) => {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (userError || !user.user) throw new Error("Not authenticated")

      const { data: market, error: marketError } = await supabase
        .from("betting_markets")
        .upsert({
          game_id: matchId,
          market_type: "mvp",
          description: `MVP of Match`,
          status: "active",
        })
        .select()
        .single()

      if (marketError) throw marketError

      const { error: betError } = await supabase.from("bets").insert({
        user_id: user.user.id,
        market_id: market.id,
        bet_type: "mvp",
        stake_amount: stake,
        odds: odds,
        potential_payout: stake * (odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1),
        status: "pending",
      })

      if (betError) throw betError

      const { data: wallet, error: walletCheckError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.user.id)
        .single()

      if (walletCheckError && walletCheckError.code !== "PGRST116") {
        throw walletCheckError
      }

      if (!wallet) {
        await supabase.from("user_wallets").insert({
          user_id: user.user.id,
          balance: 1000 - stake,
          total_wagered: stake,
        })
      } else {
        const { error: walletError } = await supabase
          .from("user_wallets")
          .update({
            balance: wallet.balance - stake,
            total_wagered: supabase.raw("total_wagered + ?", [stake]),
          })
          .eq("user_id", user.user.id)

        if (walletError) throw walletError
      }

      setSelectedBets((prev) => {
        const newBets = { ...prev }
        delete newBets[`${matchId}-${playerId}`]
        return newBets
      })

      alert("MVP bet placed successfully!")
      loadMVPMarkets()
    } catch (error) {
      console.error("Error placing MVP bet:", error)
      alert("Failed to place bet. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading MVP betting markets...</p>
      </div>
    )
  }

  if (mvpMarkets.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No MVP Markets Available</h3>
        <p className="text-muted-foreground">Check back when matches are active for MVP betting</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          MVP Betting Markets
        </h3>
        <Badge variant="secondary">{mvpMarkets.length} markets available</Badge>
      </div>

      <div className="space-y-4">
        {mvpMarkets.map((market) => (
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
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Betting closes: {new Date(market.closes_at).toLocaleString()}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {market.participants.map((player) => {
                  const betKey = `${market.id}-${player.user_id}`
                  const selectedBet = selectedBets[betKey]

                  return (
                    <div key={player.user_id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/placeholder-32px.png?height=32&width=32`} />
                          <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{player.username}</p>
                          <p className="text-xs text-muted-foreground">ELO: {player.elo_rating}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {player.odds > 0 ? "+" : ""}
                          {player.odds}
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
                              onClick={() => placeMVPBet(market.id, player.user_id, player.odds, selectedBet.stake)}
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
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            To win: $
                            {(
                              selectedBet.stake *
                                (player.odds > 0 ? player.odds / 100 + 1 : 100 / Math.abs(player.odds) + 1) -
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
                              [betKey]: { player_id: player.user_id, odds: player.odds, stake: 10 },
                            }))
                          }
                          className="w-full h-7 text-xs"
                        >
                          Bet on MVP
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
