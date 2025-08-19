"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Plus, Minus } from "lucide-react"

interface BetSlipItem {
  id: string
  game: string
  selection: string
  odds: string
  decimalOdds: number
  stake: number
}

export function BetSlip() {
  const [betSlipItems, setBetSlipItems] = useState<BetSlipItem[]>([
    {
      id: "1",
      game: "Thunder Hawks @ Fire Dragons",
      selection: "Thunder Hawks +150",
      odds: "+150",
      decimalOdds: 2.5,
      stake: 50,
    },
    {
      id: "2",
      game: "Storm Eagles @ Ice Wolves",
      selection: "Over 52.5 (-110)",
      odds: "-110",
      decimalOdds: 1.91,
      stake: 25,
    },
  ])

  const [betType, setBetType] = useState<"single" | "parlay">("single")

  const updateStake = (id: string, newStake: number) => {
    setBetSlipItems((items) => items.map((item) => (item.id === id ? { ...item, stake: newStake } : item)))
  }

  const removeBet = (id: string) => {
    setBetSlipItems((items) => items.filter((item) => item.id !== id))
  }

  const getTotalStake = () => {
    if (betType === "single") {
      return betSlipItems.reduce((sum, item) => sum + item.stake, 0)
    }
    return Math.min(...betSlipItems.map((item) => item.stake))
  }

  const getTotalPayout = () => {
    if (betType === "single") {
      return betSlipItems.reduce((sum, item) => sum + item.stake * item.decimalOdds, 0)
    }
    const parlayOdds = betSlipItems.reduce((product, item) => product * item.decimalOdds, 1)
    return getTotalStake() * parlayOdds
  }

  const getPotentialProfit = () => {
    return getTotalPayout() - getTotalStake()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bet Slip</CardTitle>
          <Badge variant="secondary">{betSlipItems.length} selections</Badge>
        </div>
        <CardDescription>Review and place your bets</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {betSlipItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No bets selected</p>
            <p className="text-xs text-muted-foreground mt-1">Click on odds to add bets</p>
          </div>
        ) : (
          <>
            {/* Bet Type Toggle */}
            {betSlipItems.length > 1 && (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={betType === "single" ? "default" : "outline"}
                  onClick={() => setBetType("single")}
                  className="flex-1"
                >
                  Single Bets
                </Button>
                <Button
                  size="sm"
                  variant={betType === "parlay" ? "default" : "outline"}
                  onClick={() => setBetType("parlay")}
                  className="flex-1"
                >
                  Parlay
                </Button>
              </div>
            )}

            {/* Bet Items */}
            <div className="space-y-3">
              {betSlipItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{item.game}</p>
                      <p className="text-sm font-medium">{item.selection}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeBet(item.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`stake-${item.id}`} className="text-xs">
                      Stake:
                    </Label>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStake(item.id, Math.max(0, item.stake - 5))}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        id={`stake-${item.id}`}
                        type="number"
                        value={item.stake}
                        onChange={(e) => updateStake(item.id, Number.parseFloat(e.target.value) || 0)}
                        className="w-16 h-6 text-xs text-center"
                        min="0"
                        step="5"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStake(item.id, item.stake + 5)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {betType === "single" && (
                    <div className="text-xs text-muted-foreground">
                      To win: ${(item.stake * item.decimalOdds - item.stake).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Stake:</span>
                <span className="font-medium">${getTotalStake().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Potential Payout:</span>
                <span className="font-medium">${getTotalPayout().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Potential Profit:</span>
                <span className="font-medium text-green-500">+${getPotentialProfit().toFixed(2)}</span>
              </div>
              {betType === "parlay" && betSlipItems.length > 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Parlay Odds:</span>
                  <span>
                    {betSlipItems.reduce((product, item) => product * item.decimalOdds, 1) - 1 > 0 ? "+" : ""}
                    {((betSlipItems.reduce((product, item) => product * item.decimalOdds, 1) - 1) * 100).toFixed(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Place Bet Button */}
            <Button className="w-full" disabled={getTotalStake() === 0}>
              Place {betType === "parlay" ? "Parlay" : "Bets"} - ${getTotalStake().toFixed(2)}
            </Button>

            {/* Quick Stake Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBetSlipItems((items) => items.map((item) => ({ ...item, stake: amount })))
                  }}
                  className="text-xs"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
