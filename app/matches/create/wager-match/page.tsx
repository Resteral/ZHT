"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Swords, DollarSign } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const games = [
  { value: "starcraft2", label: "StarCraft II", icon: "⚡" },
  { value: "call_of_duty", label: "Call of Duty", icon: "🎯" },
  { value: "rainbow_six", label: "Rainbow Six Siege", icon: "🛡️" },
  { value: "counter_strike", label: "Counter Strike", icon: "💥" },
]

const wagerAmounts = [25, 50, 100, 200, 500]

export default function CreateWagerMatchPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    game: "",
    wagerAmount: 50,
    customWager: "",
    description: "",
    isPublic: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/matches/create/wager-match/confirm?data=${encodeURIComponent(JSON.stringify(formData))}`)
  }

  const actualWager = formData.customWager ? Number.parseFloat(formData.customWager) : formData.wagerAmount
  const totalPot = actualWager * 2
  const platformFee = totalPot * 0.25 // 25% platform fee
  const winnerPayout = totalPot * 0.75 // 75% to winner

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/matches/create">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Swords className="h-8 w-8 text-red-500" />
              Create Wager Match
            </h1>
            <p className="text-muted-foreground">Set up a 1v1 battle with custom stakes</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
              ✓
            </div>
            <span>Choose Type</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              2
            </div>
            <span className="font-medium">Configure</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-muted flex items-center justify-center text-xs">3</div>
            <span>Launch</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Match Details</CardTitle>
              <CardDescription>Configure your wager match settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Match Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter match name (e.g., 'High Stakes 1v1')"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select value={formData.game} onValueChange={(value) => setFormData({ ...formData, game: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.value} value={game.value}>
                        <div className="flex items-center gap-2">
                          <span>{game.icon}</span>
                          <span>{game.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any special rules or conditions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Wager Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Wager Amount</CardTitle>
              <CardDescription>Set the stakes for this match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Quick Select</Label>
                <div className="grid grid-cols-3 gap-2">
                  {wagerAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={formData.wagerAmount === amount && !formData.customWager ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, wagerAmount: amount, customWager: "" })}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customWager">Custom Amount ($)</Label>
                <Input
                  id="customWager"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.customWager}
                  onChange={(e) => setFormData({ ...formData, customWager: e.target.value })}
                  placeholder="Enter custom amount"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payout Preview */}
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Payout Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Wager Pool:</span>
                  <span className="font-bold">${totalPot.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>Winner Payout (75%):</span>
                  <span className="font-bold">${winnerPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-sm">
                  <span>Platform Fee (25%):</span>
                  <span>${platformFee.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between pt-6">
            <Link href="/matches/create">
              <Button variant="outline">Back</Button>
            </Link>
            <Button type="submit" disabled={!formData.name || !formData.game}>
              Continue to Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
