"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Users, Trophy, Gavel } from "lucide-react"

interface TeamAuctionCardProps {
  team: {
    id: string
    name: string
    league: string
    currentBid: number
    minBid: number
    timeLeft: string
    bidders: number
    description: string
    logo: string
    stats: { wins: number; losses: number; winRate: number }
  }
  userBalance: number
  onBid: (teamId: string, amount: number) => void
  onViewDetails: () => void
}

export function TeamAuctionCard({ team, userBalance, onBid, onViewDetails }: TeamAuctionCardProps) {
  const canAfford = userBalance >= team.minBid
  const winRateColor =
    team.stats.winRate >= 80 ? "text-green-500" : team.stats.winRate >= 60 ? "text-yellow-500" : "text-red-500"

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={team.logo || "/placeholder.svg"} alt={team.name} />
            <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{team.name}</CardTitle>
            <CardDescription>{team.league}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Trophy className="h-3 w-3" />
            <span className={winRateColor}>{team.stats.winRate}%</span>
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Bid</span>
            <span className="font-semibold">${team.currentBid}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Min Next Bid</span>
            <span className="font-semibold text-green-500">${team.minBid}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{team.description}</p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Wins</p>
            <p className="font-semibold text-green-500">{team.stats.wins}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Losses</p>
            <p className="font-semibold text-red-500">{team.stats.losses}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Bidders</p>
            <p className="font-semibold">{team.bidders}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{team.timeLeft} left</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{team.bidders} bidders</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => onBid(team.id, team.minBid)}
            disabled={!canAfford}
            className="w-full"
            variant={canAfford ? "default" : "secondary"}
          >
            <Gavel className="h-4 w-4 mr-2" />
            {canAfford ? `Bid $${team.minBid}` : "Insufficient Funds"}
          </Button>

          <Button onClick={onViewDetails} variant="outline" className="w-full bg-transparent">
            View Details
          </Button>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-500 text-center">Need ${(team.minBid - userBalance).toFixed(2)} more to bid</p>
        )}
      </CardContent>
    </Card>
  )
}
