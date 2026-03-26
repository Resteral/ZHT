"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Crown,
  Star,
  Timer,
  DollarSign,
  Gavel,
  Target,
  Brain,
  Trophy,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface CaptainAuctionSystemProps {
  tournamentId: string
  captains: any[]
  playerPool: any[]
  userTeam?: {
    id: string
    name: string
    captain_id: string
    budget_remaining: number
    custom_logo?: string
    custom_colors?: { primary: string; secondary: string }
  }
}

interface BidStrategy {
  enabled: boolean
  maxBid: number
  targetPositions: string[]
  priorityPlayers: string[]
  autoBidIncrement: number
}

interface CaptainStats {
  totalAuctions: number
  successfulBids: number
  averageBidAmount: number
  topPlayerAcquired: string
  winRate: number
}

export function EnhancedCaptainAuctionSystem({
  tournamentId,
  captains,
  playerPool,
  userTeam,
}: CaptainAuctionSystemProps) {
  const [teams, setTeams] = useState<any[]>([])
  const [currentBid, setCurrentBid] = useState<number>(0)
  const [bidAmount, setBidAmount] = useState<string>("")
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(60)
  const [auctionActive, setAuctionActive] = useState<boolean>(false)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>(playerPool)
  const [bidHistory, setBidHistory] = useState<any[]>([])
  const [captainStats, setCaptainStats] = useState<CaptainStats | null>(null)
  const [bidStrategy, setBidStrategy] = useState<BidStrategy>({
    enabled: false,
    maxBid: 50,
    targetPositions: [],
    priorityPlayers: [],
    autoBidIncrement: 5,
  })
  const [quickBidAmounts, setQuickBidAmounts] = useState<number[]>([5, 10, 25, 50])
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false)
  const [highestBidder, setHighestBidder] = useState<string | null>(null)
  const [bidWarnings, setBidWarnings] = useState<string[]>([])

  const { user } = useAuth()
  const supabase = createClient()

  const isUserCaptain = userTeam?.captain_id === user?.id
  const userBudget = userTeam?.budget_remaining || 0

  useEffect(() => {
    initializeTeams()
    loadCaptainStats()
    if (auctionActive) {
      startPlayerAuction()
    }
  }, [captains, auctionActive])

  useEffect(() => {
    validateBidAmount()
  }, [bidAmount, currentBid, userBudget])

  const initializeTeams = () => {
    const initialTeams = captains.map((captain, index) => ({
      id: captain.team_id || `team-${index + 1}`,
      name: captain.team_name || `Team ${captain.username}`,
      captain: captain,
      players: [captain],
      budget: captain.budget_remaining || 1000,
      customization: captain.team_customization || {},
      auctionStats: {
        bidsPlaced: 0,
        playersWon: 0,
        totalSpent: 0,
        averageBid: 0,
      },
    }))
    setTeams(initialTeams)
  }

  const loadCaptainStats = async () => {
    if (!user?.id) return

    try {
      const { data: stats } = await supabase
        .from("captain_auction_stats")
        .select("*")
        .eq("captain_id", user.id)
        .single()

      if (stats) {
        setCaptainStats(stats)
      }
    } catch (error) {
      console.error("Error loading captain stats:", error)
    }
  }

  const validateBidAmount = () => {
    const amount = Number(bidAmount)
    const warnings: string[] = []

    if (amount <= currentBid) {
      warnings.push(`Bid must be higher than current bid ($${currentBid})`)
    }
    if (amount > userBudget) {
      warnings.push(`Insufficient budget (${userBudget} remaining)`)
    }
    if (amount > userBudget * 0.5) {
      warnings.push(`High bid! This uses ${Math.round((amount / userBudget) * 100)}% of your budget`)
    }

    setBidWarnings(warnings)
  }

  const startPlayerAuction = useCallback(() => {
    if (availablePlayers.length === 0) {
      toast.success("Auction draft completed!")
      return
    }

    const nextPlayer = availablePlayers[0]
    setCurrentPlayer(nextPlayer)
    setCurrentBid(10) // Minimum bid
    setTimeRemaining(60)
    setHighestBidder(null)

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          finalizeBid()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [availablePlayers])

  const placeBid = async (teamId: string, amount: number) => {
    if (!isUserCaptain || !userTeam) {
      toast.error("Only team captains can place bids")
      return
    }

    const team = teams.find((t) => t.id === teamId)
    if (!team || team.budget < amount || amount <= currentBid) {
      toast.error("Invalid bid amount")
      return
    }

    try {
      // Call the tournament draft service API
      const response = await fetch(`/api/tournaments/${tournamentId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "place_bid",
          playerId: currentPlayer?.id,
          teamId: userTeam.id,
          bidAmount: amount,
        }),
      })

      if (response.ok) {
        setCurrentBid(amount)
        setHighestBidder(userTeam.name)

        // Add to bid history
        const newBid = {
          id: Date.now(),
          teamName: userTeam.name,
          playerName: currentPlayer?.username,
          amount: amount,
          timestamp: new Date(),
          isWinning: true,
        }
        setBidHistory((prev) => [newBid, ...prev])

        // Reset timer to 30 seconds on new bid
        setTimeRemaining(30)

        toast.success(`Bid placed: $${amount} for ${currentPlayer?.username}`)
      }
    } catch (error) {
      console.error("Failed to place bid:", error)
      toast.error("Failed to place bid")
    }
  }

  const finalizeBid = () => {
    if (!currentPlayer || !highestBidder) return

    const winningTeam = teams.find((team) => team.name === highestBidder)

    if (winningTeam) {
      // Update team roster and budget
      const updatedTeams = teams.map((team) => {
        if (team.id === winningTeam.id) {
          return {
            ...team,
            players: [...team.players, currentPlayer],
            budget: team.budget - currentBid,
            auctionStats: {
              ...team.auctionStats,
              playersWon: team.auctionStats.playersWon + 1,
              totalSpent: team.auctionStats.totalSpent + currentBid,
            },
          }
        }
        return team
      })
      setTeams(updatedTeams)

      // Remove player from available pool
      setAvailablePlayers((prev) => prev.filter((p) => p.id !== currentPlayer.id))

      toast.success(`${currentPlayer.username} joins ${winningTeam.name} for $${currentBid}`)
    }

    // Move to next player after delay
    setTimeout(() => {
      startPlayerAuction()
    }, 3000)
  }

  const handleQuickBid = (increment: number) => {
    const newAmount = currentBid + increment
    setBidAmount(newAmount.toString())
  }

  const handleAutoBid = () => {
    if (!bidStrategy.enabled || !currentPlayer) return

    const maxBid = bidStrategy.maxBid
    const increment = bidStrategy.autoBidIncrement
    const newBid = currentBid + increment

    if (newBid <= maxBid && newBid <= userBudget) {
      placeBid(userTeam?.id || "", newBid)
    }
  }

  const getPlayerValue = (player: any) => {
    const baseValue = Math.floor(player.elo_rating / 20)
    const statsBonus = (player.csv_stats?.goals || 0) + (player.csv_stats?.assists || 0)
    return baseValue + statsBonus
  }

  const getBidRecommendation = (player: any) => {
    const playerValue = getPlayerValue(player)
    const marketValue = Math.max(10, Math.min(playerValue, userBudget * 0.3))
    return Math.floor(marketValue)
  }

  return (
    <div className="space-y-6">
      {/* Captain Status Header */}
      {isUserCaptain && userTeam && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-blue-600" />
              Captain Dashboard - {userTeam.name}
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <DollarSign className="h-3 w-3 mr-1" />${userBudget} Budget
              </Badge>
            </CardTitle>
            <CardDescription>You have full auction control as team captain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${userBudget}</div>
                <div className="text-sm text-muted-foreground">Remaining Budget</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {teams.find((t) => t.id === userTeam.id)?.players.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Players Drafted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {teams.find((t) => t.id === userTeam.id)?.auctionStats.bidsPlaced || 0}
                </div>
                <div className="text-sm text-muted-foreground">Bids Placed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{captainStats?.winRate || 0}%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Auction */}
      {auctionActive && currentPlayer && (
        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-yellow-600" />
              Live Auction
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Timer className="h-3 w-3 mr-1" />
                {timeRemaining}s
              </Badge>
              {timeRemaining <= 10 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Closing Soon!
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {highestBidder ? `${highestBidder} leads with $${currentBid}` : "No bids yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Player Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-yellow-400">
                    <AvatarFallback className="text-xl font-bold">
                      {currentPlayer.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{currentPlayer.username}</h3>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{currentPlayer.elo_rating} ELO</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>Value: ${getBidRecommendation(currentPlayer)}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={(currentBid / getBidRecommendation(currentPlayer)) * 100} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">Bid vs Estimated Value</div>
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="text-3xl font-bold text-green-600">${currentBid}</div>
                  <div className="text-sm text-green-700">Current Highest Bid</div>
                  {highestBidder && <div className="text-xs text-muted-foreground mt-1">by {highestBidder}</div>}
                </div>
              </div>

              {/* Bidding Controls */}
              {isUserCaptain && (
                <div className="space-y-4">
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual Bid</TabsTrigger>
                      <TabsTrigger value="strategy">Auto Strategy</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter bid amount"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            min={currentBid + 1}
                            max={userBudget}
                            className="text-lg font-semibold"
                          />
                          <Button
                            onClick={() => placeBid(userTeam?.id || "", Number(bidAmount))}
                            disabled={!bidAmount || Number(bidAmount) <= currentBid || bidWarnings.length > 0}
                            size="lg"
                            className="px-6"
                          >
                            <Gavel className="h-4 w-4 mr-2" />
                            Bid
                          </Button>
                        </div>

                        {/* Quick Bid Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {quickBidAmounts.map((increment) => (
                            <Button
                              key={increment}
                              onClick={() => handleQuickBid(increment)}
                              variant="outline"
                              size="sm"
                              disabled={currentBid + increment > userBudget}
                            >
                              +${increment}
                            </Button>
                          ))}
                        </div>

                        {/* Bid Warnings */}
                        {bidWarnings.length > 0 && (
                          <div className="space-y-1">
                            {bidWarnings.map((warning, index) => (
                              <div key={index} className="text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bid Validation */}
                        {bidAmount && Number(bidAmount) > currentBid && Number(bidAmount) <= userBudget && (
                          <div className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Valid bid amount
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="strategy" className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="auto-bid"
                            checked={bidStrategy.enabled}
                            onCheckedChange={(checked) => setBidStrategy((prev) => ({ ...prev, enabled: checked }))}
                          />
                          <Label htmlFor="auto-bid">Enable Auto-Bidding</Label>
                        </div>

                        {bidStrategy.enabled && (
                          <div className="space-y-3">
                            <div>
                              <Label>Max Bid: ${bidStrategy.maxBid}</Label>
                              <Slider
                                value={[bidStrategy.maxBid]}
                                onValueChange={([value]) => setBidStrategy((prev) => ({ ...prev, maxBid: value }))}
                                max={userBudget}
                                min={currentBid + 1}
                                step={5}
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <Label>Bid Increment: ${bidStrategy.autoBidIncrement}</Label>
                              <Slider
                                value={[bidStrategy.autoBidIncrement]}
                                onValueChange={([value]) =>
                                  setBidStrategy((prev) => ({ ...prev, autoBidIncrement: value }))
                                }
                                max={50}
                                min={1}
                                step={1}
                                className="mt-2"
                              />
                            </div>

                            <Button onClick={handleAutoBid} variant="secondary" className="w-full">
                              <Brain className="h-4 w-4 mr-2" />
                              Execute Auto-Bid
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Display */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team, index) => {
          const isUserTeam = team.id === userTeam?.id
          const teamValue = team.players.reduce((sum: number, player: any) => sum + getPlayerValue(player), 0)

          return (
            <Card
              key={team.id}
              className={`border-l-4 transition-all duration-300 ${
                isUserTeam ? "border-l-blue-500 bg-blue-50 shadow-lg" : "border-l-gray-300 hover:shadow-md"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className={`h-5 w-5 ${isUserTeam ? "text-blue-600" : "text-gray-500"}`} />
                  {team.name}
                  {isUserTeam && (
                    <Badge variant="default" className="bg-blue-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Your Team
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Captain: {team.captain.username} ({team.captain.elo_rating} ELO)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">${team.budget}</div>
                      <div className="text-xs text-muted-foreground">Budget</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{team.players.length}</div>
                      <div className="text-xs text-muted-foreground">Players</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">{teamValue}</div>
                      <div className="text-xs text-muted-foreground">Value</div>
                    </div>
                  </div>

                  {/* Team Roster */}
                  <div>
                    <div className="text-sm font-medium mb-2">Roster</div>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {team.players.map((player: any, playerIndex: number) => (
                          <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {player.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm flex-1">{player.username}</span>
                            {playerIndex === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                            <Badge variant="outline" className="text-xs">
                              {player.elo_rating}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bid History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            Recent Auction Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {bidHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No auction activity yet</p>
                <p className="text-sm">Bids will appear here as they happen</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bidHistory.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={bid.isWinning ? "default" : "secondary"}>
                        {bid.isWinning ? <Trophy className="h-3 w-3 mr-1" /> : null}
                        {bid.teamName}
                      </Badge>
                      <span className="text-sm">
                        bid ${bid.amount} for {bid.playerName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{bid.timestamp.toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Draft Controls */}
      {!auctionActive && isUserCaptain && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setAuctionActive(true)} className="w-full" size="lg">
              <Gavel className="h-4 w-4 mr-2" />
              Start Captain Auction Draft
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
