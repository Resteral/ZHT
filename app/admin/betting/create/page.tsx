"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function CreateBettingMarket() {
  const [marketData, setMarketData] = useState({
    title: "",
    description: "",
    marketType: "",
    game: "",
    event: "",
    closeDate: "",
    closeTime: "",
    outcomes: [
      { name: "", odds: 2.0 },
      { name: "", odds: 2.0 },
    ],
    minBet: 1,
    maxBet: 1000,
  })

  const marketTypes = [
    "Match Winner",
    "Over/Under",
    "Player Props",
    "First Blood",
    "Total Rounds",
    "Handicap",
    "Futures",
    "Live Betting",
  ]

  const games = ["Team Shooter", "Strategic Shooter", "Tactical FPS", "Zealot Hockey"]

  // Mock events
  const events = [
    "Team Shooter Championship Finals - Team Alpha vs Team Beta",
    "Strategic Shooter Qualifier - Storm Squad vs Lightning Crew",
    "Tactical FPS League - Fire Hawks vs Ice Wolves",
    "Hockey Elite Cup - Arctic Bears vs Desert Eagles",
  ]

  const addOutcome = () => {
    setMarketData({
      ...marketData,
      outcomes: [...marketData.outcomes, { name: "", odds: 2.0 }],
    })
  }

  const removeOutcome = (index: number) => {
    if (marketData.outcomes.length > 2) {
      const newOutcomes = marketData.outcomes.filter((_, i) => i !== index)
      setMarketData({ ...marketData, outcomes: newOutcomes })
    }
  }

  const updateOutcome = (index: number, field: "name" | "odds", value: string | number) => {
    const newOutcomes = [...marketData.outcomes]
    newOutcomes[index] = { ...newOutcomes[index], [field]: value }
    setMarketData({ ...marketData, outcomes: newOutcomes })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Creating betting market:", marketData)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/betting">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Markets
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Betting Market</h1>
          <p className="text-muted-foreground">Set up a new betting market with odds</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Details */}
          <Card>
            <CardHeader>
              <CardTitle>Market Details</CardTitle>
              <CardDescription>Basic information about the betting market</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Market Title</Label>
                <Input
                  id="title"
                  value={marketData.title}
                  onChange={(e) => setMarketData({ ...marketData, title: e.target.value })}
                  placeholder="Enter market title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketType">Market Type</Label>
                <Select
                  value={marketData.marketType}
                  onValueChange={(value) => setMarketData({ ...marketData, marketType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select market type" />
                  </SelectTrigger>
                  <SelectContent>
                    {marketTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select
                  value={marketData.game}
                  onValueChange={(value) => setMarketData({ ...marketData, game: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game} value={game}>
                        {game}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event">Event/Match</Label>
                <Select
                  value={marketData.event}
                  onValueChange={(value) => setMarketData({ ...marketData, event: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={marketData.description}
                  onChange={(e) => setMarketData({ ...marketData, description: e.target.value })}
                  placeholder="Market description and rules..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Market Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Market Settings</CardTitle>
              <CardDescription>Configure betting limits and closing time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closeDate">Close Date</Label>
                  <Input
                    id="closeDate"
                    type="date"
                    value={marketData.closeDate}
                    onChange={(e) => setMarketData({ ...marketData, closeDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closeTime">Close Time</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={marketData.closeTime}
                    onChange={(e) => setMarketData({ ...marketData, closeTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minBet">Minimum Bet ($)</Label>
                  <Input
                    id="minBet"
                    type="number"
                    value={marketData.minBet}
                    onChange={(e) => setMarketData({ ...marketData, minBet: Number.parseFloat(e.target.value) })}
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxBet">Maximum Bet ($)</Label>
                  <Input
                    id="maxBet"
                    type="number"
                    value={marketData.maxBet}
                    onChange={(e) => setMarketData({ ...marketData, maxBet: Number.parseFloat(e.target.value) })}
                    min="1"
                    step="1"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Market Preview</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Type: {marketData.marketType || "Not selected"}</div>
                  <div>Game: {marketData.game || "Not selected"}</div>
                  <div>
                    Closes: {marketData.closeDate} {marketData.closeTime}
                  </div>
                  <div>
                    Limits: ${marketData.minBet} - ${marketData.maxBet}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outcomes and Odds */}
        <Card>
          <CardHeader>
            <CardTitle>Outcomes & Odds</CardTitle>
            <CardDescription>Set up betting outcomes and their odds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketData.outcomes.map((outcome, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor={`outcome-${index}`}>Outcome {index + 1}</Label>
                  <Input
                    id={`outcome-${index}`}
                    value={outcome.name}
                    onChange={(e) => updateOutcome(index, "name", e.target.value)}
                    placeholder="Enter outcome name"
                    required
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor={`odds-${index}`}>Odds</Label>
                  <Input
                    id={`odds-${index}`}
                    type="number"
                    value={outcome.odds}
                    onChange={(e) => updateOutcome(index, "odds", Number.parseFloat(e.target.value))}
                    min="1.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{(100 / outcome.odds).toFixed(1)}%</Badge>
                  {marketData.outcomes.length > 2 && (
                    <Button type="button" size="sm" variant="outline" onClick={() => removeOutcome(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addOutcome} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Outcome
            </Button>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Odds Summary</h4>
              <div className="text-sm text-muted-foreground">
                Total Probability:{" "}
                {marketData.outcomes.reduce((sum, outcome) => sum + 100 / outcome.odds, 0).toFixed(1)}%
                <br />
                House Edge:{" "}
                {Math.max(0, marketData.outcomes.reduce((sum, outcome) => sum + 100 / outcome.odds, 0) - 100).toFixed(
                  1,
                )}
                %
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/betting">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Create Market
          </Button>
        </div>
      </form>
    </div>
  )
}
