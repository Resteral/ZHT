"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Gavel, Clock, Users, MessageCircle, DollarSign, Trophy, Star, TrendingUp, Target } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"
import { useRealtimeDraft } from "@/lib/hooks/use-realtime"
import { createBrowserClient } from "@supabase/ssr"

interface AuctionDraftRoomProps {
  league: any
  userRole: "bidder" | "player" | "spectator"
  userTeam?: {
    id: string
    name: string
    roster: string[]
    budget: number
  }
}

export function AuctionDraftRoom({ league, userRole, userTeam }: AuctionDraftRoomProps) {
  const { draftState, picks, currentPick } = useRealtimeDraft(league.id)
  const [currentBidder, setCurrentBidder] = useState(0)
  const [auctionedPlayers, setAuctionedPlayers] = useState<string[]>([])
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [currentBid, setCurrentBid] = useState(0)
  const [bidAmount, setBidAmount] = useState("")
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [recentPurchase, setRecentPurchase] = useState<{ playerId: string; teamId: string; amount: number } | null>(
    null,
  )
  const [teamRosters, setTeamRosters] = useState<{ [teamId: string]: any[] }>({})
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: any }>({})
  const [signupPool, setSignupPool] = useState<any[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadPlayerStats()
    loadSignupPool()
  }, [])

  const loadPlayerStats = async () => {
    try {
      const { data: csvStats, error } = await supabase
        .from("player_analytics")
        .select("user_id, kills, assists, score, damage_dealt, match_id")
        .order("score", { ascending: false })

      if (error) throw error

      const statsMap: { [key: string]: any } = {}
      csvStats?.forEach((stat) => {
        if (!statsMap[stat.user_id]) {
          statsMap[stat.user_id] = {
            goals: 0,
            assists: 0,
            shots: 0,
            saves: 0,
            score: 0,
            games_played: 0,
          }
        }
        statsMap[stat.user_id].goals += stat.kills || 0
        statsMap[stat.user_id].assists += stat.assists || 0
        statsMap[stat.user_id].shots += stat.damage_dealt || 0
        statsMap[stat.user_id].saves += 0 // No direct equivalent in player_analytics
        statsMap[stat.user_id].score += stat.score || 0
        statsMap[stat.user_id].games_played += 1
      })

      setPlayerStats(statsMap)
    } catch (error) {
      console.error("Error loading player stats:", error)
    }
  }

  const loadSignupPool = async () => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, elo_rating, balance")
        .order("elo_rating", { ascending: false })

      if (error) throw error

      const enhancedUsers =
        users
          ?.map((user) => {
            const stats = playerStats[user.id] || {}
            const totalStats = (stats.goals || 0) + (stats.assists || 0) + (stats.saves || 0)
            return {
              ...user,
              csvStats: stats,
              totalCsvScore: totalStats,
              gamesPlayed: stats.games_played || 0,
            }
          })
          .sort((a, b) => b.totalCsvScore - a.totalCsvScore) || []

      setSignupPool(enhancedUsers)
    } catch (error) {
      console.error("Error loading signup pool:", error)
    }
  }

  useEffect(() => {
    if (draftState) {
      setCurrentBidder(draftState.current_captain_index || 0)
      setTimeRemaining(draftState.time_remaining || 60)
    }
  }, [draftState])

  useEffect(() => {
    if (picks.length > 0) {
      setAuctionedPlayers(picks.map((pick) => pick.player_id))
      const newRosters: { [teamId: string]: any[] } = {}
      picks.forEach((pick) => {
        if (!newRosters[pick.team_id]) {
          newRosters[pick.team_id] = []
        }
        newRosters[pick.team_id].push({
          id: pick.player_id,
          username: pick.player_name,
          elo_rating: pick.player_elo,
          purchasePrice: pick.bid_amount,
          csvStats: playerStats[pick.player_id] || {},
        })
      })
      setTeamRosters(newRosters)
    }
  }, [picks, playerStats])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-close auction logic could go here
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentPick])

  const availablePlayers = signupPool.filter((p: any) => !auctionedPlayers.includes(p.id))

  const handlePlaceBid = async (amount: number) => {
    if (userRole === "bidder" && !userTeam) {
      alert("You must own a team before participating in auctions. Please create a team in your profile settings.")
      return
    }

    try {
      const response = await fetch(`/api/auctions/${league.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayer?.id,
          bidderId: league.bidders[currentBidder]?.id,
          bidAmount: amount,
          auctionRound: currentPick,
          teamId: userTeam?.id,
        }),
      })

      if (response.ok) {
        console.log("Bid submitted successfully")
        setBidAmount("")
        setCurrentBid(amount)
        if (amount > currentBid) {
          setRecentPurchase({
            playerId: currentPlayer?.id,
            teamId: userTeam?.id || "",
            amount: amount,
          })
          setTimeout(() => setRecentPurchase(null), 3000)
        }
      }
    } catch (error) {
      console.error("Failed to submit bid:", error)
    }
  }

  const canBid =
    userRole === "bidder" && league.bidders[currentBidder]?.username === "ProHockey" && userTeam !== undefined

  return (
    <div className="space-y-6">
      {recentPurchase && (
        <Card className="border-green-500 bg-green-50 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <Trophy className="h-5 w-5" />
              <p className="font-medium">Player Acquired!</p>
            </div>
            <p className="text-sm text-green-700 mt-1">Successfully purchased player for ${recentPurchase.amount}</p>
          </CardContent>
        </Card>
      )}

      {userRole === "bidder" && !userTeam && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Gavel className="h-5 w-5" />
              <p className="font-medium">Team Required</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              You must create and own a team before participating in auctions.
              <a href="/settings" className="underline ml-1">
                Create team in settings
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-amber-500" />
            Team Owners & Rosters
          </CardTitle>
          <CardDescription>Live auction with real-time team building</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {league.bidders.map((bidder: any, index: number) => {
              const teamRoster = teamRosters[bidder.teamId] || []
              const totalSpent = teamRoster.reduce((sum, player) => sum + (player.purchasePrice || 0), 0)
              const teamCsvScore = teamRoster.reduce((sum, player) => {
                const stats = player.csvStats || {}
                return sum + (stats.goals || 0) + (stats.assists || 0) + (stats.saves || 0)
              }, 0)

              return (
                <Card
                  key={bidder.id}
                  className={`relative overflow-hidden border-2 ${
                    recentPurchase?.teamId === bidder.teamId
                      ? "border-green-500 bg-green-50 animate-pulse"
                      : "border-primary/20 hover:border-primary/40"
                  } transition-all duration-300`}
                >
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-3 border-primary ring-2 ring-primary/20">
                        <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                          {(bidder.teamName || `T${index + 1}`).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{bidder.teamName || `Team ${index + 1}`}</h3>
                        <p className="text-sm text-muted-foreground">
                          Owner:{" "}
                          <ProfileNameLink
                            userId={bidder.id}
                            username={bidder.username}
                            pageSource="auction-draft-team-owners"
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-medium">
                        {teamRoster.length}/{league.players_per_team} players
                      </Badge>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-bold">${totalSpent}</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600">
                          <Target className="h-3 w-3" />
                          <span className="font-bold">{teamCsvScore}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-3 min-h-[160px]">
                      {teamRoster.length > 0 ? (
                        teamRoster.map((player: any, i: number) => {
                          const stats = player.csvStats || {}
                          const playerScore = (stats.goals || 0) + (stats.assists || 0) + (stats.saves || 0)

                          return (
                            <div
                              key={player.id}
                              className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg transition-all duration-500 ${
                                recentPurchase?.playerId === player.id ? "bg-green-100 scale-105 shadow-md" : ""
                              }`}
                            >
                              <Avatar className="h-8 w-8 border-2 border-primary/20">
                                <AvatarFallback className="text-xs font-medium">
                                  {player.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{player.username}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    <span>{player.elo_rating}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <Target className="h-3 w-3" />
                                    <span className="font-medium">{playerScore}</span>
                                  </div>
                                  {player.purchasePrice && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <DollarSign className="h-3 w-3" />
                                      <span className="font-bold">${player.purchasePrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="flex items-center justify-center h-full text-center">
                          <div className="text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">Waiting for players...</p>
                            <p className="text-xs">Start bidding to build your roster</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Player Signup Pool - Ranked by CSV Stats ({availablePlayers.length})
            </CardTitle>
            <CardDescription>Players ranked by total CSV performance (Goals + Assists + Saves)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availablePlayers.map((player: any, index: number) => {
                const stats = player.csvStats || {}
                const totalScore = player.totalCsvScore || 0

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-300 ${
                      currentPlayer?.id === player.id ? "border-primary bg-primary/5 shadow-md" : ""
                    } ${recentPurchase?.playerId === player.id ? "opacity-50 scale-95" : ""}`}
                    onClick={() => setCurrentPlayer(player)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-bold min-w-[2rem]">
                          #{index + 1}
                        </Badge>
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarFallback className="text-sm font-medium">
                            {player.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base">
                          <ProfileNameLink
                            userId={player.id}
                            username={player.username}
                            pageSource="auction-draft-signup-pool"
                          />
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>ELO: {player.elo_rating}</span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <Target className="h-3 w-3" />
                            <span className="font-bold">CSV: {totalScore}</span>
                          </div>
                          <div className="text-xs">
                            G:{stats.goals || 0} A:{stats.assists || 0} S:{stats.saves || 0}
                          </div>
                          <div className="text-xs">Games: {player.gamesPlayed}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Starting: $10</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Auction Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{msg.username}:</span> {msg.message}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border rounded-md"
              />
              <Button size="sm">Send</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Auction in Progress card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-amber-500" />
              Live Auction in Progress
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
            </span>
            <Badge variant="default">Round {Math.ceil(currentPick / league.bidders.length)}</Badge>
          </CardTitle>
          <CardDescription>
            Player #{currentPick} • Current bidder: {league.bidders[currentBidder]?.username}
            {userRole === "bidder" && userTeam && (
              <span className="ml-2 text-primary">• Your team: {userTeam.name}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border-2 border-amber-500">
                <AvatarFallback>{league.bidders[currentBidder]?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">
                  <ProfileNameLink
                    userId={league.bidders[currentBidder]?.id || "unknown"}
                    username={league.bidders[currentBidder]?.username || "Unknown"}
                    pageSource="auction-draft-room"
                  />
                </p>
                <p className="text-sm text-muted-foreground">ELO: {league.bidders[currentBidder]?.elo_rating}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-bold text-green-500">${currentBid}</div>
                <div className="text-xs text-muted-foreground">Current Bid</div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span
                  className={`font-mono text-lg ${timeRemaining <= 10 ? "text-red-500" : timeRemaining <= 30 ? "text-yellow-500" : ""}`}
                >
                  {timeRemaining}s
                </span>
              </div>
            </div>
          </div>
          {canBid && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-primary font-semibold">🏆 {userTeam?.name} - Set Your Price!</p>
                <div className="text-sm text-muted-foreground">
                  Budget: <span className="font-bold text-green-600">${userTeam?.budget || 1000}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter your bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 text-lg font-semibold"
                    min={currentBid + 1}
                    max={userTeam?.budget || 1000}
                  />
                  <Button
                    onClick={() => handlePlaceBid(Number(bidAmount))}
                    disabled={!bidAmount || Number(bidAmount) <= currentBid}
                    className="px-6"
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Bid ${bidAmount}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setBidAmount((currentBid + 10).toString())}
                    variant="outline"
                    size="sm"
                    disabled={currentBid + 10 > (userTeam?.budget || 1000)}
                  >
                    +$10
                  </Button>
                  <Button
                    onClick={() => setBidAmount((currentBid + 25).toString())}
                    variant="outline"
                    size="sm"
                    disabled={currentBid + 25 > (userTeam?.budget || 1000)}
                  >
                    +$25
                  </Button>
                  <Button
                    onClick={() => setBidAmount((currentBid + 50).toString())}
                    variant="outline"
                    size="sm"
                    disabled={currentBid + 50 > (userTeam?.budget || 1000)}
                  >
                    +$50
                  </Button>
                  <Button
                    onClick={() => setBidAmount((currentBid + 100).toString())}
                    variant="outline"
                    size="sm"
                    disabled={currentBid + 100 > (userTeam?.budget || 1000)}
                  >
                    +$100
                  </Button>
                  <Button
                    onClick={() => setBidAmount(Math.min(userTeam?.budget || 1000, currentBid + 200).toString())}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-300"
                    disabled={currentBid + 200 > (userTeam?.budget || 1000)}
                  >
                    Max Bid
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {Number(bidAmount) <= currentBid && bidAmount && (
                    <span className="text-red-500">⚠️ Bid must be higher than ${currentBid}</span>
                  )}
                  {Number(bidAmount) > (userTeam?.budget || 1000) && (
                    <span className="text-red-500">⚠️ Insufficient budget (${userTeam?.budget || 1000} available)</span>
                  )}
                  {Number(bidAmount) > currentBid && Number(bidAmount) <= (userTeam?.budget || 1000) && (
                    <span className="text-green-600">✅ Valid bid amount</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bids card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bids</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auctionedPlayers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bids yet</p>
            ) : (
              <div className="text-sm text-muted-foreground">Bid history will appear here as auctions complete</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
