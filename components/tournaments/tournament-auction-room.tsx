"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, DollarSign, Users, Trophy, Gavel, Wifi, WifiOff } from "lucide-react"
import { useAuctionRealtime } from "@/hooks/use-auction-realtime"
import { toast } from "sonner"

interface Player {
  id: string
  username: string
  elo_rating: number
  position?: string
  team?: string
}

interface Team {
  id: string
  team_name: string
  team_captain: string
  captain_username?: string
  budget_remaining: number
  players_acquired: number
  max_players: number
}

interface TournamentAuctionRoomProps {
  tournamentId: string
  currentUserId: string
  isOwner: boolean
}

export default function TournamentAuctionRoom({ tournamentId, currentUserId, isOwner }: TournamentAuctionRoomProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [playerPool, setPlayerPool] = useState<Player[]>([])
  const [bidAmount, setBidAmount] = useState<string>("")
  const [timeRemaining, setTimeRemaining] = useState<number>(30)
  const [loading, setLoading] = useState(true)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)

  const {
    auctionSession,
    recentBids,
    teamBudgets,
    connected,
    broadcastBidUpdate,
    broadcastTimerUpdate,
    setAuctionSession,
    setTeamBudgets,
  } = useAuctionRealtime(tournamentId)

  useEffect(() => {
    fetchAuctionData()
  }, [tournamentId])

  useEffect(() => {
    if (teamBudgets.length > 0) {
      setTeams((prev) =>
        prev.map((team) => {
          const budget = teamBudgets.find((b) => b.team_id === team.id)
          return budget
            ? {
                ...team,
                budget_remaining: budget.current_budget,
                players_acquired: budget.players_acquired,
              }
            : team
        }),
      )
    }
  }, [teamBudgets])

  useEffect(() => {
    if (auctionSession?.current_player_id && playerPool.length > 0) {
      const player = playerPool.find((p) => p.id === auctionSession.current_player_id)
      setCurrentPlayer(player || null)
    }
  }, [auctionSession?.current_player_id, playerPool])

  useEffect(() => {
    if (auctionSession?.status === "active" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1
          if (newTime <= 0) {
            // Auto-finalize bid when timer reaches 0
            finalizeBid()
          }
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [auctionSession?.status, timeRemaining])

  useEffect(() => {
    if (recentBids.length > 0) {
      const latestBid = recentBids[0]
      const biddingTeam = teams.find((t) => t.id === latestBid.team_id)
      if (biddingTeam) {
        toast.success(`${biddingTeam.team_name} bid $${latestBid.bid_amount}`)
      }
    }
  }, [recentBids, teams])

  const fetchAuctionData = async () => {
    try {
      console.log("[v0] Fetching auction data for tournament:", tournamentId)

      const response = await fetch(`/api/tournaments/${tournamentId}/auction`)
      if (response.ok) {
        const data = await response.json()

        if (data.auctionSession) {
          setAuctionSession(data.auctionSession)
          setTimeRemaining(data.auctionSession.bid_timer_seconds || 30)
        }

        if (data.teamBudgets) {
          const formattedTeams = data.teamBudgets.map((budget: any) => ({
            id: budget.team_id,
            team_name: budget.team?.team_name || "Unknown Team",
            team_captain: budget.team?.team_captain || "",
            captain_username: budget.team?.users?.username || "Unknown",
            budget_remaining: budget.current_budget,
            players_acquired: budget.players_acquired,
            max_players: budget.max_players,
          }))
          setTeams(formattedTeams)
          setTeamBudgets(data.teamBudgets)
          console.log("[v0] Teams with captains loaded:", formattedTeams.length)
        }

        if (data.playerPool) {
          const formattedPlayers = data.playerPool.map((poolPlayer: any) => ({
            id: poolPlayer.id,
            username: poolPlayer.users?.username || "Unknown Player",
            elo_rating: poolPlayer.users?.elo_rating || 1000,
            position: "Player",
          }))
          setPlayerPool(formattedPlayers)
          console.log("[v0] Player pool size:", formattedPlayers.length)
        }
      } else {
        console.log("[v0] No auction session found")
      }
    } catch (error) {
      console.error("[v0] Error fetching auction data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBid = async (amount: number) => {
    if (!currentPlayer || !currentUserTeam) return

    try {
      console.log(`[v0] Placing bid of ${amount} for player ${currentPlayer.username}`)

      const response = await fetch(`/api/tournaments/${tournamentId}/auction/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentUserTeam.id,
          playerId: currentPlayer.id,
          bidAmount: amount,
          userId: currentUserId,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        await broadcastBidUpdate({
          playerId: currentPlayer.id,
          bidAmount: data.newBidAmount,
          teamId: currentUserTeam.id,
          timeRemaining: data.timeRemaining || 30,
        })

        setTimeRemaining(data.timeRemaining || 30)
        toast.success(`Bid placed: $${amount}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to place bid")
      }
    } catch (error) {
      console.error("[v0] Error placing bid:", error)
      toast.error("Failed to place bid")
    }
  }

  const finalizeBid = async () => {
    if (!auctionSession || !currentPlayer) return

    try {
      console.log("[v0] Finalizing bid for current player")

      const response = await fetch(`/api/tournaments/${tournamentId}/auction/finalize-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.auctionComplete) {
          toast.success("Auction draft completed!")
        } else if (data.nextPlayer) {
          toast.info("Moving to next player...")
          setTimeRemaining(30)
        }
      } else {
        const error = await response.json()
        console.error("[v0] Error finalizing bid:", error.error)
      }
    } catch (error) {
      console.error("[v0] Error finalizing bid:", error)
    }
  }

  const handleCustomBid = () => {
    const amount = Number.parseInt(bidAmount)
    if (amount && amount > (auctionSession?.current_bid_amount || 0)) {
      handleBid(amount)
      setBidAmount("")
    }
  }

  const currentUserTeam = teams.find((team) => team.team_captain === currentUserId)
  const currentBiddingTeam = teams.find((team) => team.id === auctionSession?.current_bidder_id)
  const minBid = (auctionSession?.current_bid_amount || 0) + 5

  const showAuctionInterface = auctionSession?.status === "active" && teams.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading auction room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="bg-foreground text-background">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Tournament Auction</h1>
                <p className="text-background/80">
                  {auctionSession?.status === "active"
                    ? `Round ${auctionSession?.auction_round || 1} of ${auctionSession?.total_rounds || 1} - Active Auction`
                    : "Auction room"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-2 text-accent">
                    <Clock className="h-6 w-6" />
                    <span className="auction-timer">{timeRemaining}s</span>
                  </div>
                  <p className="text-sm text-background/80">Time Remaining</p>
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <Wifi className="h-5 w-5 text-green-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-400" />
                  )}
                  <span className="text-sm text-background/80">{connected ? "Connected" : "Disconnected"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {showAuctionInterface && (
              <>
                <Card className="auction-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-primary" />
                      Current Player
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentPlayer ? (
                      <div className="text-center space-y-4">
                        <Avatar className="h-24 w-24 mx-auto">
                          <AvatarFallback className="text-2xl">
                            {currentPlayer.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-2xl font-bold">{currentPlayer.username}</h3>
                          <div className="flex items-center justify-center gap-4 mt-2">
                            <Badge variant="secondary">{currentPlayer.position}</Badge>
                            <Badge variant="outline">{currentPlayer.elo_rating} ELO</Badge>
                          </div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Current Bid</span>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-accent" />
                              <span className="text-2xl font-bold text-accent">
                                {auctionSession?.current_bid_amount || 0}
                              </span>
                            </div>
                          </div>
                          {currentBiddingTeam && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Leading: {currentBiddingTeam.team_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No player currently up for auction</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {currentUserTeam && (
                  <Card className="auction-card">
                    <CardHeader>
                      <CardTitle>Place Your Bid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleBid(minBid)}
                            disabled={minBid > currentUserTeam.budget_remaining}
                            className="auction-button-primary flex-1"
                          >
                            Bid ${minBid}
                          </Button>
                          <Button
                            onClick={() => handleBid(minBid + 10)}
                            disabled={minBid + 10 > currentUserTeam.budget_remaining}
                            className="auction-button-primary flex-1"
                          >
                            Bid ${minBid + 10}
                          </Button>
                          <Button
                            onClick={() => handleBid(minBid + 25)}
                            disabled={minBid + 25 > currentUserTeam.budget_remaining}
                            className="auction-button-primary flex-1"
                          >
                            Bid ${minBid + 25}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Custom amount"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            min={minBid}
                            max={currentUserTeam.budget_remaining}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleCustomBid}
                            disabled={
                              !bidAmount || Number.parseInt(bidAmount) <= (auctionSession?.current_bid_amount || 0)
                            }
                            className="auction-button-secondary"
                          >
                            Custom Bid
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your remaining budget: ${currentUserTeam.budget_remaining}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {recentBids.length > 0 && (
                  <Card className="auction-card">
                    <CardHeader>
                      <CardTitle>Recent Bids</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {recentBids.slice(0, 5).map((bid) => {
                          const team = teams.find((t) => t.id === bid.team_id)
                          return (
                            <div
                              key={bid.id}
                              className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                            >
                              <span>{team?.team_name || "Unknown Team"}</span>
                              <span className="font-medium">${bid.bid_amount}</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!showAuctionInterface && (
              <Card className="auction-card">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Auction Room</h3>
                  <p className="text-muted-foreground">
                    {teams.length > 0 ? "Waiting for auction to begin..." : "Waiting for auction to start..."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {teams.length > 0 && (
              <Card className="auction-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Team Budgets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg border ${
                        team.team_captain === currentUserId ? "auction-bid-active" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{team.team_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {team.captain_username}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium">${team.budget_remaining}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Players</span>
                          <span className="font-medium">
                            {team.players_acquired}/{team.max_players}
                          </span>
                        </div>
                        <Progress value={(team.players_acquired / team.max_players) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="auction-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Player Pool
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {playerPool.slice(0, 10).map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 rounded bg-muted">
                      <div>
                        <p className="font-medium text-sm">{player.username}</p>
                        <p className="text-xs text-muted-foreground">{player.elo_rating} ELO</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {player.elo_rating}
                      </Badge>
                    </div>
                  ))}
                  {playerPool.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{playerPool.length - 10} more players
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
