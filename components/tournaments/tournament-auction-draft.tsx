"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Crown, Users, Star, Timer, DollarSign, Gavel, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentAuctionDraftProps {
  tournamentId: string
  captains: any[]
  playerPool: any[]
}

export function TournamentAuctionDraft({ tournamentId, captains, playerPool }: TournamentAuctionDraftProps) {
  const [teams, setTeams] = useState<any[]>([])
  const [currentBid, setCurrentBid] = useState<number>(0)
  const [bidAmount, setBidAmount] = useState<string>("")
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(30)
  const [auctionActive, setAuctionActive] = useState<boolean>(false)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>(playerPool)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    initializeTeams()
    if (auctionActive) {
      startPlayerAuction()
    }
  }, [captains, auctionActive])

  const initializeTeams = () => {
    const initialTeams = captains.map((captain, index) => ({
      id: `team-${index + 1}`,
      name: `Team ${captain.username}`,
      captain: captain,
      players: [captain],
      budget: 100, // Starting budget
      color: index === 0 ? "bg-blue-500" : "bg-red-500",
    }))
    setTeams(initialTeams)
  }

  const startPlayerAuction = () => {
    if (availablePlayers.length === 0) {
      toast.success("Auction draft completed!")
      return
    }

    const nextPlayer = availablePlayers[0]
    setCurrentPlayer(nextPlayer)
    setCurrentBid(1) // Minimum bid
    setTimeRemaining(30)

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
  }

  const placeBid = (teamId: string, amount: number) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team || team.budget < amount || amount <= currentBid) {
      toast.error("Invalid bid amount")
      return
    }

    setCurrentBid(amount)
    toast.success(`${team.name} bids $${amount} for ${currentPlayer?.username}`)
  }

  const finalizeBid = () => {
    if (!currentPlayer) return

    // Find the team with the highest bid
    const winningTeam = teams.find(
      (team) => team.captain.id === user?.id, // Simplified for demo
    )

    if (winningTeam) {
      // Add player to team
      const updatedTeams = teams.map((team) => {
        if (team.id === winningTeam.id) {
          return {
            ...team,
            players: [...team.players, currentPlayer],
            budget: team.budget - currentBid,
          }
        }
        return team
      })
      setTeams(updatedTeams)

      // Remove player from available pool
      setAvailablePlayers((prev) => prev.filter((p) => p.id !== currentPlayer.id))

      toast.success(`${currentPlayer.username} joins ${winningTeam.name} for $${currentBid}`)
    }

    // Move to next player
    setTimeout(() => {
      startPlayerAuction()
    }, 2000)
  }

  const isUserCaptain = captains.some((captain) => captain.id === user?.id)

  return (
    <div className="space-y-6">
      {/* Current Auction */}
      {auctionActive && currentPlayer && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-yellow-500" />
              Current Auction
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                <Timer className="h-3 w-3 mr-1" />
                {timeRemaining}s
              </Badge>
            </CardTitle>
            <CardDescription>Place your bids for the current player</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{currentPlayer.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{currentPlayer.username}</h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>{currentPlayer.elo_rating} ELO</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">${currentBid}</div>
                <div className="text-sm text-muted-foreground">Current Bid</div>
              </div>
            </div>

            {isUserCaptain && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Bid amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={currentBid + 1}
                />
                <Button
                  onClick={() => {
                    const amount = Number.parseInt(bidAmount)
                    if (amount > currentBid) {
                      placeBid("team-1", amount) // Simplified for demo
                      setBidAmount("")
                    }
                  }}
                  disabled={!bidAmount || Number.parseInt(bidAmount) <= currentBid}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Bid
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams Display */}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.id} className="border-l-4" style={{ borderLeftColor: team.color.replace("bg-", "#") }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {team.name}
                <Badge variant="outline" className="ml-auto">
                  ${team.budget} left
                </Badge>
              </CardTitle>
              <CardDescription>
                Captain: {team.captain.username} ({team.captain.elo_rating} ELO)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Team Roster ({team.players.length})</div>
                <ScrollArea className="h-32">
                  {team.players.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-2 py-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{player.username}</span>
                      {index === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                      <Badge variant="outline" className="text-xs ml-auto">
                        {player.elo_rating}
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Player Pool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Available Players
            <Badge variant="secondary">{availablePlayers.length} remaining</Badge>
          </CardTitle>
          <CardDescription>Players waiting to be drafted</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="grid gap-2">
              {availablePlayers.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    currentPlayer?.id === player.id ? "bg-yellow-50 border-yellow-300" : "bg-gray-50"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{player.username}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      <span>{player.elo_rating}</span>
                    </div>
                  </div>
                  {currentPlayer?.id === player.id && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                      <Target className="h-3 w-3 mr-1" />
                      Current
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Draft Controls */}
      {!auctionActive && isUserCaptain && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setAuctionActive(true)} className="w-full" size="lg">
              <Gavel className="h-4 w-4 mr-2" />
              Start Auction Draft
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
