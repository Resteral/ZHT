"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

interface BettingMarket {
  id: string
  market_type: string
  description: string
  odds_home: number
  odds_away: number
  status: string
}

interface UserWallet {
  balance: number
  total_wagered: number
  total_winnings: number
}

interface TournamentBettingProps {
  tournamentId: string
  tournamentName: string
  participants: any[]
}

export function TournamentBettingInterface({ tournamentId, tournamentName, participants }: TournamentBettingProps) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [markets, setMarkets] = useState<BettingMarket[]>([])
  const [betAmount, setBetAmount] = useState("")
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)
  const [selectedOdds, setSelectedOdds] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (user) {
      loadWalletData()
      loadBettingMarkets()
    }
  }, [user, tournamentId])

  const loadWalletData = async () => {
    if (!user) return

    try {
      const { data: walletData, error } = await supabase
        .from("user_wallets")
        .select("balance, total_wagered, total_winnings")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading wallet:", error)
        return
      }

      if (walletData) {
        setWallet(walletData)
      } else {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from("user_wallets")
          .insert({
            user_id: user.id,
            balance: 1000.0,
            total_deposited: 1000.0,
            total_wagered: 0.0,
            total_winnings: 0.0,
            total_withdrawn: 0.0,
          })
          .select("balance, total_wagered, total_winnings")
          .single()

        if (createError) {
          console.error("Error creating wallet:", createError)
        } else {
          setWallet(newWallet)
        }
      }
    } catch (error) {
      console.error("Error in loadWalletData:", error)
    }
  }

  const loadBettingMarkets = async () => {
    try {
      const { data: marketsData, error } = await supabase
        .from("betting_markets")
        .select("*")
        .eq("league_id", tournamentId)
        .eq("status", "active")

      if (error) {
        console.error("Error loading betting markets:", error)
        return
      }

      setMarkets(marketsData || [])
    } catch (error) {
      console.error("Error in loadBettingMarkets:", error)
    }
  }

  const placeBet = async () => {
    if (!user || !selectedMarket || !selectedOdds || !betAmount) {
      toast.error("Please select a market and enter bet amount")
      return
    }

    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid bet amount")
      return
    }

    if (!wallet || amount > wallet.balance) {
      toast.error("Insufficient balance")
      return
    }

    setLoading(true)

    try {
      // Place the bet
      const { data: betData, error: betError } = await supabase
        .from("bets")
        .insert({
          user_id: user.id,
          market_id: selectedMarket,
          stake_amount: amount,
          odds: selectedOdds,
          potential_payout: amount * selectedOdds,
          bet_type: "single",
          status: "pending",
        })
        .select()
        .single()

      if (betError) {
        console.error("Error placing bet:", betError)
        toast.error("Failed to place bet")
        return
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("user_wallets")
        .update({
          balance: wallet.balance - amount,
          total_wagered: wallet.total_wagered + amount,
        })
        .eq("user_id", user.id)

      if (walletError) {
        console.error("Error updating wallet:", walletError)
        toast.error("Bet placed but wallet update failed")
        return
      }

      // Update local state
      setWallet({
        ...wallet,
        balance: wallet.balance - amount,
        total_wagered: wallet.total_wagered + amount,
      })

      setBetAmount("")
      setSelectedMarket(null)
      setSelectedOdds(null)
      toast.success(`Bet placed successfully! Potential payout: $${(amount * selectedOdds).toFixed(2)}`)
    } catch (error) {
      console.error("Error in placeBet:", error)
      toast.error("Failed to place bet")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Betting</CardTitle>
          <CardDescription>Sign in to place bets on tournament outcomes</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          {wallet ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Balance</Label>
                <p className="text-2xl font-bold text-green-600">${wallet.balance.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Wagered</Label>
                <p className="text-lg">${wallet.total_wagered.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Winnings</Label>
                <p className="text-lg text-green-600">${wallet.total_winnings.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p>Loading wallet...</p>
          )}
        </CardContent>
      </Card>

      {/* Betting Markets */}
      <Card>
        <CardHeader>
          <CardTitle>Betting Markets</CardTitle>
          <CardDescription>Place bets on {tournamentName} outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="winner" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="winner">Tournament Winner</TabsTrigger>
              <TabsTrigger value="props">Player Props</TabsTrigger>
            </TabsList>

            <TabsContent value="winner" className="space-y-4">
              <div className="space-y-4">
                {participants.length > 0 ? (
                  <div className="grid gap-2">
                    {participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMarket === `winner_${participant.id}`
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedMarket(`winner_${participant.id}`)
                          setSelectedOdds(2.5 + index * 0.2) // Dynamic odds based on position
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{participant.username || participant.team_name}</span>
                          <Badge variant="secondary">{(2.5 + index * 0.2).toFixed(1)}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No participants available for betting yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="props" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Most Kills in Tournament</h4>
                  <div className="grid gap-2">
                    {participants.slice(0, 3).map((participant, index) => (
                      <div
                        key={`kills_${participant.id}`}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedMarket === `kills_${participant.id}`
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedMarket(`kills_${participant.id}`)
                          setSelectedOdds(3.0 + index * 0.5)
                        }}
                      >
                        <div className="flex justify-between">
                          <span>{participant.username || participant.team_name}</span>
                          <Badge variant="outline">{(3.0 + index * 0.5).toFixed(1)}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bet Slip */}
          {selectedMarket && selectedOdds && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-3">Bet Slip</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Selection:</span>
                  <span className="font-medium">
                    {selectedMarket.includes("winner") ? "Tournament Winner" : "Most Kills"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Odds:</span>
                  <span className="font-medium">{selectedOdds.toFixed(1)}x</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="betAmount">Bet Amount ($)</Label>
                  <Input
                    id="betAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="1"
                    max={wallet?.balance || 0}
                  />
                </div>
                {betAmount && (
                  <div className="flex justify-between font-medium">
                    <span>Potential Payout:</span>
                    <span className="text-green-600">${(Number.parseFloat(betAmount) * selectedOdds).toFixed(2)}</span>
                  </div>
                )}
                <Button onClick={placeBet} disabled={loading || !betAmount} className="w-full">
                  {loading ? "Placing Bet..." : "Place Bet"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
