"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Clock, Trophy, Gavel, DollarSign } from "lucide-react"

interface AuctionDialogProps {
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
  isOpen: boolean
  onClose: () => void
  userBalance: number
  onBid: (teamId: string, amount: number) => void
}

export function AuctionDialog({ team, isOpen, onClose, userBalance, onBid }: AuctionDialogProps) {
  const [bidAmount, setBidAmount] = useState(team.minBid.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitBid = async () => {
    const amount = Number.parseFloat(bidAmount)
    if (amount >= team.minBid && amount <= userBalance) {
      setIsSubmitting(true)
      await onBid(team.id, amount)
      setIsSubmitting(false)
      onClose()
    }
  }

  const canBid = Number.parseFloat(bidAmount) >= team.minBid && Number.parseFloat(bidAmount) <= userBalance

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={team.logo || "/placeholder.svg"} alt={team.name} />
              <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{team.name}</DialogTitle>
              <DialogDescription>{team.league}</DialogDescription>
            </div>
            <Badge variant="outline" className="ml-auto">
              <Trophy className="h-3 w-3 mr-1" />
              {team.stats.winRate}% Win Rate
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-500">{team.stats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-500">{team.stats.losses}</p>
              <p className="text-sm text-muted-foreground">Losses</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{team.bidders}</p>
              <p className="text-sm text-muted-foreground">Bidders</p>
            </div>
          </div>

          <Separator />

          {/* Auction Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Highest Bid</p>
                <p className="text-2xl font-bold">${team.currentBid}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Time Remaining</p>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <p className="text-lg font-semibold text-orange-500">{team.timeLeft}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>
                Minimum Next Bid: <strong>${team.minBid}</strong>
              </span>
              <span>
                Your Balance: <strong className="text-green-500">${userBalance.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <Separator />

          {/* Enhanced Bidding Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bid-amount">Set Your Bid Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bid-amount"
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={team.minBid}
                  max={userBalance}
                  step="1"
                  className="pl-10 text-lg font-semibold"
                  placeholder={`Minimum $${team.minBid}`}
                />
              </div>

              <div className="text-sm">
                {Number.parseFloat(bidAmount) < team.minBid && bidAmount && (
                  <p className="text-red-500">⚠️ Bid must be at least ${team.minBid}</p>
                )}
                {Number.parseFloat(bidAmount) > userBalance && (
                  <p className="text-red-500">⚠️ Insufficient balance (${userBalance.toFixed(2)} available)</p>
                )}
                {Number.parseFloat(bidAmount) >= team.minBid &&
                  Number.parseFloat(bidAmount) <= userBalance &&
                  bidAmount && <p className="text-green-600">✅ Valid bid amount</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setBidAmount(team.minBid.toString())} variant="outline" size="sm">
                Min Bid (${team.minBid})
              </Button>
              <Button
                onClick={() => setBidAmount((team.minBid + 25).toString())}
                variant="outline"
                size="sm"
                disabled={team.minBid + 25 > userBalance}
              >
                +$25
              </Button>
              <Button
                onClick={() => setBidAmount((team.minBid + 50).toString())}
                variant="outline"
                size="sm"
                disabled={team.minBid + 50 > userBalance}
              >
                +$50
              </Button>
              <Button
                onClick={() => setBidAmount((team.minBid + 100).toString())}
                variant="outline"
                size="sm"
                disabled={team.minBid + 100 > userBalance}
              >
                +$100
              </Button>
            </div>

            <Button
              onClick={() => setBidAmount(Math.min(userBalance, team.minBid + 200).toString())}
              variant="outline"
              size="sm"
              className="w-full text-orange-600 border-orange-300"
              disabled={team.minBid + 200 > userBalance}
            >
              Maximum Bid (${Math.min(userBalance, team.minBid + 200)})
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button onClick={handleSubmitBid} disabled={!canBid || isSubmitting} className="flex-1">
              <Gavel className="h-4 w-4 mr-2" />
              {isSubmitting ? "Placing Bid..." : `Place Bid $${bidAmount}`}
            </Button>
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
