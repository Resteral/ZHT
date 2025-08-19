"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Gavel, Clock, Users, MessageCircle, DollarSign, Trophy, Star } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"
import { useRealtimeDraft } from "@/lib/hooks/use-realtime"

interface AuctionDraftRoomProps {
  league: any
  userRole: "bidder" | "player" | "spectator"
  userTeam?: {
    id: string
    name: string
    roster: string[]
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
        })
      })
      setTeamRosters(newRosters)
    }
  }, [picks])

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

  const availablePlayers = league.participants.filter(
    (p: any) => p.role === "player" && !auctionedPlayers.includes(p.id),
  )

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Team Rosters - Live Updates
          </CardTitle>
          <CardDescription>Watch as players join teams in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {league.bidders.map((bidder: any, index: number) => {
              const teamRoster = teamRosters[bidder.teamId] || []
              const totalSpent = teamRoster.reduce((sum, player) => sum + (player.purchasePrice || 0), 0)

              return (
                <Card
                  key={bidder.id}
                  className={`relative overflow-hidden ${
                    recentPurchase?.teamId === bidder.teamId ? "ring-2 ring-green-500 animate-pulse" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-primary">
                        <AvatarFallback className="text-xs font-bold">
                          {(bidder.teamName || `T${index + 1}`).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{bidder.teamName || `Team ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          <ProfileNameLink
                            userId={bidder.id}
                            username={bidder.username}
                            pageSource="auction-draft-team-rosters"
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="text-xs">
                        {teamRoster.length}/{league.players_per_team} players
                      </Badge>
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium">${totalSpent}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 min-h-[120px]">
                      {teamRoster.length > 0 ? (
                        teamRoster.map((player: any, i: number) => (
                          <div
                            key={player.id}
                            className={`flex items-center gap-2 p-2 bg-muted/50 rounded-md transition-all duration-500 ${
                              recentPurchase?.playerId === player.id ? "bg-green-100 scale-105" : ""
                            }`}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {player.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{player.username}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Star className="h-3 w-3" />
                                <span>{player.elo_rating}</span>
                                {player.purchasePrice && (
                                  <>
                                    <DollarSign className="h-3 w-3 text-green-500" />
                                    <span className="text-green-600 font-medium">${player.purchasePrice}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-center">
                          <div className="text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">Waiting for players...</p>
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
              <Users className="h-5 w-5" />
              Available Players ({availablePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availablePlayers
                .sort((a: any, b: any) => b.elo_rating - a.elo_rating)
                .map((player: any) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-300 ${
                      currentPlayer?.id === player.id ? "border-primary bg-primary/5" : ""
                    } ${recentPurchase?.playerId === player.id ? "opacity-50 scale-95" : ""}`}
                    onClick={() => setCurrentPlayer(player)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          <ProfileNameLink
                            userId={player.id}
                            username={player.username}
                            pageSource="auction-draft-available-players"
                          />
                        </p>
                        <p className="text-sm text-muted-foreground">ELO: {player.elo_rating}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Starting: $10</span>
                    </div>
                  </div>
                ))}
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
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-primary font-medium mb-2">Place your bid for {userTeam?.name}!</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter bid amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handlePlaceBid(Number(bidAmount))}
                  disabled={!bidAmount || Number(bidAmount) <= currentBid}
                >
                  <Gavel className="h-4 w-4 mr-2" />
                  Bid
                </Button>
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
