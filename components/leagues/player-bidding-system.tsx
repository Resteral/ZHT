"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Gavel, Star, TrendingUp, Clock, DollarSign, Trophy, Target, Bell, Zap, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface PlayerAuction {
  id: string
  player_id: string
  player_username: string
  player_elo: number
  starting_bid: number
  current_bid: number
  highest_bidder_id?: string
  highest_bidder_username?: string
  auction_end: string
  status: "active" | "completed" | "cancelled"
  bid_count: number
  reserve_met: boolean
  time_remaining: number
  auto_bid_enabled?: boolean
  max_auto_bid?: number
}

interface PlayerBid {
  id: string
  auction_id: string
  bidder_id: string
  bidder_username: string
  bid_amount: number
  bid_time: string
  is_winning: boolean
  is_auto_bid: boolean
}

interface BiddingStats {
  total_auctions: number
  active_auctions: number
  total_bids_placed: number
  highest_bid: number
  success_rate: number
  total_spent: number
  active_bids: number
}

interface PlayerBet {
  id: string
  player_id: string
  player_username: string
  player_elo: number
  bet_type: "performance" | "match_outcome" | "elo_change"
  bet_description: string
  odds: number
  min_bet: number
  max_bet: number
  total_pool: number
  bet_count: number
  expires_at: string
  status: "active" | "completed" | "cancelled"
}

interface UserBet {
  id: string
  bet_id: string
  user_id: string
  bet_amount: number
  potential_payout: number
  bet_time: string
  status: "active" | "won" | "lost" | "cancelled"
}

export function PlayerBiddingSystem() {
  const { user } = useAuth()
  const [activeAuctions, setActiveAuctions] = useState<PlayerAuction[]>([])
  const [playerBets, setPlayerBets] = useState<PlayerBet[]>([])
  const [myBids, setMyBids] = useState<PlayerBid[]>([])
  const [myBets, setMyBets] = useState<UserBet[]>([])
  const [biddingStats, setBiddingStats] = useState<BiddingStats>({
    total_auctions: 0,
    active_auctions: 0,
    total_bids_placed: 0,
    highest_bid: 0,
    success_rate: 0,
    total_spent: 0,
    active_bids: 0,
  })
  const [selectedAuction, setSelectedAuction] = useState<PlayerAuction | null>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [autoBidEnabled, setAutoBidEnabled] = useState(false)
  const [maxAutoBid, setMaxAutoBid] = useState("")
  const [betAmount, setBetAmount] = useState("")
  const [selectedBet, setSelectedBet] = useState<PlayerBet | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadBiddingData()
    const interval = setInterval(loadBiddingData, 5000) // Update every 5 seconds for real-time feel
    return () => clearInterval(interval)
  }, [user])

  const loadBiddingData = async () => {
    try {
      // Load active auctions
      const { data: auctionsData } = await supabase
        .from("player_auctions")
        .select(`
          *,
          users!player_auctions_player_id_fkey(username, elo_rating),
          highest_bidder:users!player_auctions_highest_bidder_id_fkey(username)
        `)
        .eq("status", "active")
        .order("auction_end", { ascending: true })

      if (auctionsData) {
        const processedAuctions = auctionsData.map((auction) => ({
          id: auction.id,
          player_id: auction.player_id,
          player_username: auction.users?.username || "Unknown",
          player_elo: auction.users?.elo_rating || 1200,
          starting_bid: auction.starting_bid,
          current_bid: auction.current_bid,
          highest_bidder_id: auction.highest_bidder_id,
          highest_bidder_username: auction.highest_bidder?.username,
          auction_end: auction.auction_end,
          status: auction.status,
          bid_count: auction.bid_count || 0,
          reserve_met: auction.current_bid >= auction.reserve_price,
          time_remaining: Math.max(0, new Date(auction.auction_end).getTime() - Date.now()),
          auto_bid_enabled: auction.auto_bid_enabled || false,
          max_auto_bid: auction.max_auto_bid || 0,
        }))

        setActiveAuctions(processedAuctions)
      }

      const { data: betsData } = await supabase
        .from("player_bets")
        .select(`
          *,
          users!player_bets_player_id_fkey(username, elo_rating)
        `)
        .eq("status", "active")
        .order("expires_at", { ascending: true })

      if (betsData) {
        const processedBets = betsData.map((bet) => ({
          id: bet.id,
          player_id: bet.player_id,
          player_username: bet.users?.username || "Unknown",
          player_elo: bet.users?.elo_rating || 1200,
          bet_type: bet.bet_type,
          bet_description: bet.bet_description,
          odds: bet.odds,
          min_bet: bet.min_bet,
          max_bet: bet.max_bet,
          total_pool: bet.total_pool || 0,
          bet_count: bet.bet_count || 0,
          expires_at: bet.expires_at,
          status: bet.status,
        }))

        setPlayerBets(processedBets)
      }

      // Load user's bids
      if (user) {
        const { data: bidsData } = await supabase
          .from("player_bids")
          .select(`
            *,
            player_auctions(
              player_id,
              current_bid,
              highest_bidder_id,
              users!player_auctions_player_id_fkey(username)
            )
          `)
          .eq("bidder_id", user.id)
          .order("bid_time", { ascending: false })
          .limit(20)

        if (bidsData) {
          const processedBids = bidsData.map((bid) => ({
            id: bid.id,
            auction_id: bid.auction_id,
            bidder_id: bid.bidder_id,
            bidder_username: user.username || "You",
            bid_amount: bid.bid_amount,
            bid_time: bid.bid_time,
            is_winning: bid.player_auctions?.highest_bidder_id === user.id,
            is_auto_bid: bid.is_auto_bid || false,
          }))

          setMyBids(processedBids)
        }

        const { data: userBetsData } = await supabase
          .from("user_bets")
          .select(`
            *,
            player_bets(
              bet_description,
              odds,
              users!player_bets_player_id_fkey(username)
            )
          `)
          .eq("user_id", user.id)
          .order("bet_time", { ascending: false })
          .limit(20)

        if (userBetsData) {
          const processedUserBets = userBetsData.map((bet) => ({
            id: bet.id,
            bet_id: bet.bet_id,
            user_id: bet.user_id,
            bet_amount: bet.bet_amount,
            potential_payout: bet.potential_payout,
            bet_time: bet.bet_time,
            status: bet.status,
          }))

          setMyBets(processedUserBets)
        }

        // Calculate enhanced bidding stats
        const totalBids = bidsData?.length || 0
        const winningBids = bidsData?.filter((bid) => bid.player_auctions?.highest_bidder_id === user.id).length || 0
        const highestBid = Math.max(...(bidsData?.map((bid) => bid.bid_amount) || [0]))
        const totalSpent =
          bidsData?.reduce(
            (sum, bid) => sum + (bid.player_auctions?.highest_bidder_id === user.id ? bid.bid_amount : 0),
            0,
          ) || 0
        const activeBids =
          bidsData?.filter(
            (bid) => bid.player_auctions?.highest_bidder_id === user.id && bid.player_auctions?.status === "active",
          ).length || 0

        setBiddingStats({
          total_auctions: auctionsData?.length || 0,
          active_auctions: auctionsData?.length || 0,
          total_bids_placed: totalBids,
          highest_bid: highestBid,
          success_rate: totalBids > 0 ? (winningBids / totalBids) * 100 : 0,
          total_spent: totalSpent,
          active_bids: activeBids,
        })
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading bidding data:", error)
      setLoading(false)
    }
  }

  const placeBid = async (auctionId: string, amount: number, isAutoBid = false) => {
    if (!user || !selectedAuction) return

    if (amount <= selectedAuction.current_bid) {
      alert("Bid must be higher than current bid!")
      return
    }

    try {
      const bidData = {
        auction_id: auctionId,
        bidder_id: user.id,
        bid_amount: amount,
        bid_time: new Date().toISOString(),
        is_auto_bid: isAutoBid,
      }

      const { error: bidError } = await supabase.from("player_bids").insert(bidData)

      if (bidError) throw bidError

      // Update auction with new highest bid
      const updateData: any = {
        current_bid: amount,
        highest_bidder_id: user.id,
        bid_count: selectedAuction.bid_count + 1,
      }

      if (autoBidEnabled && maxAutoBid) {
        updateData.auto_bid_enabled = true
        updateData.max_auto_bid = Number.parseInt(maxAutoBid)
      }

      const { error: auctionError } = await supabase.from("player_auctions").update(updateData).eq("id", auctionId)

      if (auctionError) throw auctionError

      setBidAmount("")
      await loadBiddingData()
    } catch (error) {
      console.error("Error placing bid:", error)
      alert("Failed to place bid. Please try again.")
    }
  }

  const placeBet = async (betId: string, amount: number) => {
    if (!user || !selectedBet) return

    if (amount < selectedBet.min_bet || amount > selectedBet.max_bet) {
      alert(`Bet amount must be between $${selectedBet.min_bet} and $${selectedBet.max_bet}`)
      return
    }

    try {
      const potentialPayout = amount * selectedBet.odds

      const betData = {
        bet_id: betId,
        user_id: user.id,
        bet_amount: amount,
        potential_payout: potentialPayout,
        bet_time: new Date().toISOString(),
        status: "active",
      }

      const { error: betError } = await supabase.from("user_bets").insert(betData)

      if (betError) throw betError

      // Update bet pool
      const { error: poolError } = await supabase
        .from("player_bets")
        .update({
          total_pool: selectedBet.total_pool + amount,
          bet_count: selectedBet.bet_count + 1,
        })
        .eq("id", betId)

      if (poolError) throw poolError

      setBetAmount("")
      setSelectedBet(null)
      await loadBiddingData()
    } catch (error) {
      console.error("Error placing bet:", error)
      alert("Failed to place bet. Please try again.")
    }
  }

  const quickBidAmounts = [50, 100, 250, 500, 1000]

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const getDivisionFromElo = (elo: number): string => {
    if (elo >= 1800) return "Premier"
    if (elo >= 1600) return "Championship"
    if (elo >= 1400) return "League One"
    return "League Two"
  }

  const getDivisionColor = (elo: number): string => {
    if (elo >= 1800) return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
    if (elo >= 1600) return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
    if (elo >= 1400) return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
    return "bg-gradient-to-r from-green-500 to-teal-500 text-white"
  }

  const getBetTypeIcon = (betType: string) => {
    switch (betType) {
      case "performance":
        return <Trophy className="h-4 w-4" />
      case "match_outcome":
        return <Target className="h-4 w-4" />
      case "elo_change":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getBetTypeColor = (betType: string) => {
    switch (betType) {
      case "performance":
        return "bg-yellow-100 text-yellow-900 border-yellow-200"
      case "match_outcome":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "elo_change":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{biddingStats.active_auctions}</p>
                <p className="text-xs text-muted-foreground">Active Auctions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{biddingStats.total_bids_placed}</p>
                <p className="text-xs text-muted-foreground">Bids Placed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">${biddingStats.total_spent}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{biddingStats.active_bids}</p>
                <p className="text-xs text-muted-foreground">Active Bids</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(biddingStats.success_rate)}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active-auctions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active-auctions">Player Auctions</TabsTrigger>
          <TabsTrigger value="player-bets">Player Bets</TabsTrigger>
          <TabsTrigger value="my-bids">My Bids</TabsTrigger>
          <TabsTrigger value="my-bets">My Bets</TabsTrigger>
        </TabsList>

        <TabsContent value="active-auctions" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {activeAuctions.map((auction) => (
              <Card
                key={auction.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedAuction?.id === auction.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedAuction(auction)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{auction.player_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{auction.player_username}</CardTitle>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-3 w-3" />
                          <span className="text-slate-600 font-medium">{auction.player_elo} ELO</span>
                          {auction.auto_bid_enabled && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Auto-Bid
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={getDivisionColor(auction.player_elo)}>
                      {getDivisionFromElo(auction.player_elo)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Bid</p>
                      <p className="text-2xl font-bold text-green-700">${auction.current_bid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time Left</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeRemaining(auction.time_remaining)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Bids: {auction.bid_count}</span>
                      <span>
                        {auction.highest_bidder_username
                          ? `Leading: ${auction.highest_bidder_username}`
                          : "No bids yet"}
                      </span>
                    </div>
                    <Progress value={auction.reserve_met ? 100 : 50} className="h-2" />
                  </div>

                  {selectedAuction?.id === auction.id && (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={`Min: $${auction.current_bid + 1}`}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          min={auction.current_bid + 1}
                        />
                        <Button
                          onClick={() => placeBid(auction.id, Number.parseInt(bidAmount))}
                          disabled={!bidAmount || Number.parseInt(bidAmount) <= auction.current_bid}
                        >
                          <Gavel className="h-4 w-4 mr-1" />
                          Bid
                        </Button>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {quickBidAmounts.map((amount) => (
                          <Button
                            key={amount}
                            size="sm"
                            variant="outline"
                            onClick={() => setBidAmount((auction.current_bid + amount).toString())}
                            disabled={auction.current_bid + amount <= auction.current_bid}
                          >
                            +${amount}
                          </Button>
                        ))}
                      </div>

                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="auto-bid" className="text-sm font-medium">
                            Enable Auto-Bid
                          </Label>
                          <Switch id="auto-bid" checked={autoBidEnabled} onCheckedChange={setAutoBidEnabled} />
                        </div>
                        {autoBidEnabled && (
                          <div className="space-y-2">
                            <Label htmlFor="max-auto-bid" className="text-sm">
                              Maximum Auto-Bid Amount
                            </Label>
                            <Input
                              id="max-auto-bid"
                              type="number"
                              placeholder="Enter max amount"
                              value={maxAutoBid}
                              onChange={(e) => setMaxAutoBid(e.target.value)}
                              min={auction.current_bid + 1}
                            />
                            <p className="text-xs text-muted-foreground">
                              System will automatically bid up to this amount when outbid
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">Minimum bid: ${auction.current_bid + 1}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {activeAuctions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active auctions</p>
                  <p className="text-sm">Check back later for new player auctions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="player-bets" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {playerBets.map((bet) => (
              <Card key={bet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{bet.player_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{bet.player_username}</CardTitle>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-3 w-3" />
                          <span className="text-slate-600 font-medium">{bet.player_elo} ELO</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getBetTypeColor(bet.bet_type)}>
                      {getBetTypeIcon(bet.bet_type)}
                      <span className="ml-1 capitalize">{bet.bet_type.replace("_", " ")}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{bet.bet_description}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Odds: {bet.odds}x • Pool: ${bet.total_pool} • {bet.bet_count} bets
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Min Bet</p>
                      <p className="font-bold text-green-700">${bet.min_bet}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Bet</p>
                      <p className="font-bold text-red-700">${bet.max_bet}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Expires: {new Date(bet.expires_at).toLocaleDateString()}</span>
                      <span>Total Pool: ${bet.total_pool}</span>
                    </div>
                    <Progress value={(bet.total_pool / (bet.max_bet * 10)) * 100} className="h-2" />
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedBet(bet)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Place Bet
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place Bet on {bet.player_username}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium">{bet.bet_description}</p>
                          <p className="text-sm text-muted-foreground">Odds: {bet.odds}x payout</p>
                        </div>
                        <div>
                          <Label htmlFor="bet-amount">Bet Amount</Label>
                          <Input
                            id="bet-amount"
                            type="number"
                            placeholder={`$${bet.min_bet} - $${bet.max_bet}`}
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            min={bet.min_bet}
                            max={bet.max_bet}
                          />
                        </div>
                        {betAmount && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm">
                              <span className="font-medium">Potential Payout:</span> $
                              {(Number.parseFloat(betAmount) * bet.odds).toFixed(2)}
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => placeBet(bet.id, Number.parseFloat(betAmount))}
                          disabled={
                            !betAmount ||
                            Number.parseFloat(betAmount) < bet.min_bet ||
                            Number.parseFloat(betAmount) > bet.max_bet
                          }
                          className="w-full"
                        >
                          Confirm Bet
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>

          {playerBets.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active player bets</p>
                  <p className="text-sm">Check back later for new betting opportunities</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-bids" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Recent Bids</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myBids.map((bid) => (
                  <div key={bid.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Bid ${bid.bid_amount}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(bid.bid_time).toLocaleString()}
                        {bid.is_auto_bid && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </p>
                    </div>
                    <Badge variant={bid.is_winning ? "default" : "outline"}>
                      {bid.is_winning ? "Winning" : "Outbid"}
                    </Badge>
                  </div>
                ))}
                {myBids.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No bids placed yet</p>
                    <p className="text-sm">Start bidding on players to see your history</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-bets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Active Bets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myBets.map((bet) => (
                  <div key={bet.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">${bet.bet_amount} bet</p>
                      <p className="text-sm text-muted-foreground">Potential payout: ${bet.potential_payout}</p>
                      <p className="text-xs text-muted-foreground">{new Date(bet.bet_time).toLocaleString()}</p>
                    </div>
                    <Badge
                      variant={
                        bet.status === "won"
                          ? "default"
                          : bet.status === "lost"
                            ? "destructive"
                            : bet.status === "cancelled"
                              ? "outline"
                              : "secondary"
                      }
                    >
                      {bet.status === "active" ? "Pending" : bet.status}
                    </Badge>
                  </div>
                ))}
                {myBets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No bets placed yet</p>
                    <p className="text-sm">Start betting on player performance to see your bets</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
