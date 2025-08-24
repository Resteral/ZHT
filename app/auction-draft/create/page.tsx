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
import { ArrowLeft, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function CreateAuctionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_teams: 8,
    players_per_team: 5,
    entry_fee: 50,
    auction_budget: 500,
    auction_date: "",
    registration_deadline: "",
    game_type: "zealot_hockey",
  })

  const gameOptions = [
    { value: "zealot_hockey", label: "🏒 Zealot Hockey", description: "Fast-paced hockey action" },
    { value: "tactical_fps", label: "🎯 Tactical FPS", description: "Tactical FPS combat" },
    { value: "strategic_shooter", label: "🛡️ Strategic Shooter", description: "Strategic team shooter" },
    { value: "team_shooter", label: "💥 Team Shooter", description: "Classic competitive FPS" },
  ]

  const teamCountOptions = [
    { value: 4, label: "4 Teams", description: "Small competitive format" },
    { value: 6, label: "6 Teams", description: "Medium tournament size" },
    { value: 8, label: "8 Teams", description: "Standard auction format" },
    { value: 10, label: "10 Teams", description: "Large competitive field" },
    { value: 12, label: "12 Teams", description: "Major tournament scale" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Authentication required")
      }

      // Create auction league
      const auctionData = {
        name: formData.name,
        description: formData.description,
        game: formData.game_type,
        max_teams: formData.max_teams,
        players_per_team: formData.players_per_team,
        entry_fee: formData.entry_fee,
        auction_budget: formData.auction_budget,
        auction_date: formData.auction_date,
        registration_deadline: formData.registration_deadline,
        status: "registration",
        creator_id: user.id,
        prize_pool: formData.max_teams * formData.entry_fee * 0.8, // 80% to prize pool
        created_at: new Date().toISOString(),
      }

      console.log("[v0] Creating auction league:", auctionData)

      // For now, just redirect to auction draft page
      // In a real implementation, this would create the auction in the database
      router.push("/auction-draft")
    } catch (error) {
      console.error("Error creating auction:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const selectedGame = gameOptions.find((game) => game.value === formData.game_type)
  const selectedTeamCount = teamCountOptions.find((option) => option.value === formData.max_teams)
  const prizePool = formData.max_teams * formData.entry_fee * 0.8

  return (
    <div className="container mx-auto p-6 space-y-6 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Auction Draft</h1>
          <p className="text-muted-foreground">Host your own auction draft with custom settings and prize pools</p>
        </div>
        <Link href="/auction-draft">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Auction Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auction Details</CardTitle>
                <CardDescription>Configure your auction draft settings and format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Auction Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter auction name..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your auction format, rules, and what makes it special..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_type">Game Type</Label>
                  <Select value={formData.game_type} onValueChange={(value) => handleInputChange("game_type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameOptions.map((game) => (
                        <SelectItem key={game.value} value={game.value}>
                          <div>
                            <div className="font-medium">{game.label}</div>
                            <div className="text-xs text-muted-foreground">{game.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_teams">Number of Teams</Label>
                    <Select
                      value={formData.max_teams.toString()}
                      onValueChange={(value) => handleInputChange("max_teams", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {teamCountOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="players_per_team">Players per Team</Label>
                    <Select
                      value={formData.players_per_team.toString()}
                      onValueChange={(value) => handleInputChange("players_per_team", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Players</SelectItem>
                        <SelectItem value="5">5 Players</SelectItem>
                        <SelectItem value="6">6 Players</SelectItem>
                        <SelectItem value="8">8 Players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      min="25"
                      step="25"
                      value={formData.entry_fee}
                      onChange={(e) => handleInputChange("entry_fee", Number.parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">Cost for each team to participate</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auction_budget">Auction Budget ($)</Label>
                    <Input
                      id="auction_budget"
                      type="number"
                      min="200"
                      step="100"
                      value={formData.auction_budget}
                      onChange={(e) => handleInputChange("auction_budget", Number.parseFloat(e.target.value) || 0)}
                      placeholder="500"
                    />
                    <p className="text-xs text-muted-foreground">Budget each team gets for bidding</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Set important dates for your auction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_deadline">Registration Deadline</Label>
                    <Input
                      id="registration_deadline"
                      type="datetime-local"
                      value={formData.registration_deadline}
                      onChange={(e) => handleInputChange("registration_deadline", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auction_date">Auction Date</Label>
                    <Input
                      id="auction_date"
                      type="datetime-local"
                      value={formData.auction_date}
                      onChange={(e) => handleInputChange("auction_date", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auction Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auction Preview</CardTitle>
                <CardDescription>Preview how your auction will appear</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">{formData.name || "Auction Name"}</h3>
                  <Badge variant="secondary" className="mb-2">
                    {selectedGame?.label || "Game Type"}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formData.max_teams} Teams • {formData.players_per_team} Players Each
                  </p>
                  {selectedTeamCount && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedTeamCount.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry Fee:</span>
                    <span className="font-medium">${formData.entry_fee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auction Budget:</span>
                    <span className="font-medium">${formData.auction_budget}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium text-green-500">${prizePool}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Players:</span>
                    <span className="font-medium">{formData.max_teams * formData.players_per_team}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>1st Place (40%):</span>
                    <span className="font-medium text-green-500">${(prizePool * 0.4).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2nd Place (25%):</span>
                    <span className="font-medium text-green-500">${(prizePool * 0.25).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3rd Place (20%):</span>
                    <span className="font-medium text-green-500">${(prizePool * 0.2).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4th+ (15%):</span>
                    <span className="font-medium text-green-500">${(prizePool * 0.15).toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={loading || !formData.name}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Auction"}
                </Button>
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Save as Draft
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
