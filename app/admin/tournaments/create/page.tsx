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
import { Switch } from "@/components/ui/switch"
import { Trophy, ArrowLeft, Users, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { tournamentService } from "@/lib/services/tournament-service"
import { useAuth } from "@/lib/auth-context"

export default function CreateTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    game: "",
    tournament_type: "single_elimination",
    draft_mode: "snake_draft", // snake_draft, linear_draft, auction_draft
    pick_time_limit: 60,
    auto_start: true,
    allow_trades: false,
    auction_budget: 1000,
    bid_time_limit: 30,
    enable_player_pool: false,
    num_teams: 8,
    players_per_team: 5,
    max_pool_size: 50,
    max_participants: 16,
    entry_fee: 0,
    prize_pool: 0,
    start_date: "",
    registration_opens: "",
    registration_closes: "",
    end_date: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!isAuthenticated || !user?.id) {
        throw new Error("Not authenticated - please log in")
      }

      console.log("[v0] Creating tournament with user ID:", user.id)
      console.log("[v0] Tournament data:", formData)

      const tournamentData = {
        ...formData,
        player_pool_settings: formData.enable_player_pool
          ? {
              num_teams: formData.num_teams,
              players_per_team: formData.players_per_team,
              max_pool_size: formData.max_pool_size,
            }
          : null,
        draft_settings: {
          draft_mode: formData.draft_mode,
          pick_time_limit: formData.pick_time_limit,
          auto_start: formData.auto_start,
          allow_trades: formData.allow_trades,
          ...(formData.draft_mode === "auction_draft" && {
            auction_budget: formData.auction_budget,
            bid_time_limit: formData.bid_time_limit,
          }),
        },
      }

      const tournament = await tournamentService.createTournament(tournamentData, user.id)
      console.log("[v0] Tournament created successfully:", tournament)
      router.push("/admin/tournaments")
    } catch (error) {
      console.error("Error creating tournament:", error)
      alert(`Error creating tournament: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Please log in to create tournaments.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Tournament</h1>
          <p className="text-muted-foreground">Set up a new tournament with brackets, drafts, and prizes</p>
        </div>
        <Link href="/admin/tournaments">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tournament Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Set up the tournament details and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter tournament name..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="game">Game</Label>
                    <Select value={formData.game} onValueChange={(value) => handleInputChange("game", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select game..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter_strike">Counter Strike</SelectItem>
                        <SelectItem value="rainbow_six_siege">Rainbow Six Siege</SelectItem>
                        <SelectItem value="call_of_duty">Call of Duty</SelectItem>
                        <SelectItem value="zealot_hockey">Zealot Hockey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tournament_type">Tournament Format</Label>
                    <Select
                      value={formData.tournament_type}
                      onValueChange={(value) => handleInputChange("tournament_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">Single Elimination</SelectItem>
                        <SelectItem value="double_elimination">Double Elimination</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="swiss_system">Swiss System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Tournament description and rules..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Draft Mode Settings
                </CardTitle>
                <CardDescription>Configure draft type and settings for team formation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card
                    className={`cursor-pointer transition-all ${formData.draft_mode === "snake_draft" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                    onClick={() => handleInputChange("draft_mode", "snake_draft")}
                  >
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-semibold">Snake Draft</h3>
                      <p className="text-xs text-muted-foreground">Alternating pick order</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${formData.draft_mode === "linear_draft" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                    onClick={() => handleInputChange("draft_mode", "linear_draft")}
                  >
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-semibold">Linear Draft</h3>
                      <p className="text-xs text-muted-foreground">Fixed pick order</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${formData.draft_mode === "auction_draft" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                    onClick={() => handleInputChange("draft_mode", "auction_draft")}
                  >
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <h3 className="font-semibold">Auction Draft</h3>
                      <p className="text-xs text-muted-foreground">Bidding system</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pick_time_limit">Pick Time Limit (seconds)</Label>
                    <Select
                      value={formData.pick_time_limit.toString()}
                      onValueChange={(value) => handleInputChange("pick_time_limit", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="90">1.5 minutes</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.draft_mode === "auction_draft" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="auction_budget">Auction Budget</Label>
                        <Input
                          id="auction_budget"
                          type="number"
                          min="100"
                          value={formData.auction_budget}
                          onChange={(e) => handleInputChange("auction_budget", Number.parseInt(e.target.value) || 1000)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bid_time_limit">Bid Time Limit (seconds)</Label>
                        <Select
                          value={formData.bid_time_limit.toString()}
                          onValueChange={(value) => handleInputChange("bid_time_limit", Number.parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_start">Auto-start Draft</Label>
                    <p className="text-sm text-muted-foreground">Automatically start draft when full</p>
                  </div>
                  <Switch
                    id="auto_start"
                    checked={formData.auto_start}
                    onCheckedChange={(checked) => handleInputChange("auto_start", checked)}
                  />
                </div>

                {formData.draft_mode !== "auction_draft" && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow_trades">Allow Trades</Label>
                      <p className="text-sm text-muted-foreground">Enable player trading during draft</p>
                    </div>
                    <Switch
                      id="allow_trades"
                      checked={formData.allow_trades}
                      onCheckedChange={(checked) => handleInputChange("allow_trades", checked)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Player Pool Draft Settings</CardTitle>
                <CardDescription>
                  Configure player pool for draft-based tournaments. Player Pool Size = total players who can join
                  tournament registration. Draft Participants = players who will actually be drafted to teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_player_pool">Enable Player Pool</Label>
                    <p className="text-sm text-muted-foreground">Use player pool for team drafting</p>
                  </div>
                  <Switch
                    id="enable_player_pool"
                    checked={formData.enable_player_pool}
                    onCheckedChange={(checked) => handleInputChange("enable_player_pool", checked)}
                  />
                </div>

                {formData.enable_player_pool && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="num_teams">Number of Teams</Label>
                      <Select
                        value={formData.num_teams.toString()}
                        onValueChange={(value) => handleInputChange("num_teams", Number.parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Teams</SelectItem>
                          <SelectItem value="6">6 Teams</SelectItem>
                          <SelectItem value="8">8 Teams</SelectItem>
                          <SelectItem value="12">12 Teams</SelectItem>
                          <SelectItem value="16">16 Teams</SelectItem>
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
                          <SelectItem value="3">3 Players</SelectItem>
                          <SelectItem value="4">4 Players</SelectItem>
                          <SelectItem value="5">5 Players</SelectItem>
                          <SelectItem value="6">6 Players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_pool_size">Player Pool Size</Label>
                      <p className="text-xs text-muted-foreground mb-1">Total players who can join tournament</p>
                      <Input
                        id="max_pool_size"
                        type="number"
                        min={formData.num_teams * formData.players_per_team}
                        value={formData.max_pool_size}
                        onChange={(e) => handleInputChange("max_pool_size", Number.parseInt(e.target.value) || 50)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule & Registration</CardTitle>
                <CardDescription>Set tournament dates and registration periods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_opens">Registration Opens</Label>
                    <Input
                      id="registration_opens"
                      type="datetime-local"
                      value={formData.registration_opens}
                      onChange={(e) => handleInputChange("registration_opens", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_closes">Registration Closes</Label>
                    <Input
                      id="registration_closes"
                      type="datetime-local"
                      value={formData.registration_closes}
                      onChange={(e) => handleInputChange("registration_closes", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Tournament Start</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange("start_date", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">Tournament End</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange("end_date", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Draft Participants</Label>
                    <p className="text-xs text-muted-foreground mb-1">Players who will be drafted to teams</p>
                    <Select
                      value={formData.max_participants.toString()}
                      onValueChange={(value) => handleInputChange("max_participants", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 Players</SelectItem>
                        <SelectItem value="16">16 Players</SelectItem>
                        <SelectItem value="32">32 Players</SelectItem>
                        <SelectItem value="64">64 Players</SelectItem>
                        <SelectItem value="128">128 Players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.entry_fee}
                      onChange={(e) => handleInputChange("entry_fee", Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Pool & Rewards</CardTitle>
                <CardDescription>Configure tournament prizes and distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prize_pool">Total Prize Pool ($)</Label>
                  <Input
                    id="prize_pool"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prize_pool}
                    onChange={(e) => handleInputChange("prize_pool", Number.parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Prize Distribution:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>1st Place: 50% (${(formData.prize_pool * 0.5).toFixed(2)})</div>
                    <div>2nd Place: 30% (${(formData.prize_pool * 0.3).toFixed(2)})</div>
                    <div>3rd Place: 20% (${(formData.prize_pool * 0.2).toFixed(2)})</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tournament Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Preview</CardTitle>
                <CardDescription>Preview how your tournament will appear</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">{formData.name || "Tournament Name"}</h3>
                  <Badge variant="secondary" className="mb-2">
                    {formData.game || "Select Game"}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formData.tournament_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} •{" "}
                    {formData.max_participants} Players
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {formData.draft_mode.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium">${formData.prize_pool.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry Fee:</span>
                    <span className="font-medium">${formData.entry_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Players:</span>
                    <span className="font-medium">{formData.max_participants}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium">
                      {formData.tournament_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Draft Mode:</span>
                    <span className="font-medium">
                      {formData.draft_mode.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pick Time:</span>
                    <span className="font-medium">{formData.pick_time_limit}s</span>
                  </div>
                  {formData.enable_player_pool && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Player Pool Size:</span>
                      <span className="font-medium">{formData.max_pool_size}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={loading || !formData.name || !formData.game}>
                  <Trophy className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Tournament"}
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
