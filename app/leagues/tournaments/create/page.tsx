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
import { Trophy, ArrowLeft, Calendar, Users, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreateTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tournament_type: "weekly",
    duration_days: 7,
    max_teams: 8,
    team_buy_in: 50,
    auction_budget: 500,
    prize_pool: 0,
    registration_opens: "",
    registration_closes: "",
    auction_date: "",
    tournament_start: "",
  })

  const tournamentTypes = {
    daily: { name: "Daily Tournament", days: 1, icon: "⚡", description: "Fast-paced single day competition" },
    weekly: { name: "Weekly Tournament", days: 7, icon: "📅", description: "Week-long competitive series" },
    biweekly: { name: "Bi-Weekly Tournament", days: 14, icon: "🗓️", description: "Two week tournament format" },
    monthly: { name: "Monthly Tournament", days: 30, icon: "📆", description: "Month-long championship" },
    seasonal: { name: "Seasonal Tournament", days: 90, icon: "🏆", description: "3-month seasonal competition" },
    custom: { name: "Custom Duration", days: 0, icon: "⚙️", description: "Set your own duration" },
  }

  const teamCountOptions = [
    { value: 4, label: "4 Teams", description: "Small intimate tournament" },
    { value: 6, label: "6 Teams", description: "Compact competitive format" },
    { value: 8, label: "8 Teams", description: "Standard tournament size" },
    { value: 12, label: "12 Teams", description: "Medium-scale competition" },
    { value: 16, label: "16 Teams", description: "Large tournament format" },
    { value: 20, label: "20 Teams", description: "Major championship size" },
    { value: 24, label: "24 Teams", description: "Massive tournament scale" },
    { value: 32, label: "32 Teams", description: "Elite championship format" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tournamentData = {
        ...formData,
        status: "registration",
        prize_pool: formData.max_teams * formData.team_buy_in * 0.8, // 80% of buy-ins go to prize pool
      }

      console.log("Creating tournament:", tournamentData)
      // API call would go here

      router.push("/leagues/tournaments")
    } catch (error) {
      console.error("Error creating tournament:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      if (field === "tournament_type" && value !== "custom") {
        updated.duration_days = tournamentTypes[value as keyof typeof tournamentTypes].days
      }

      // Auto-calculate prize pool when team buy-in or max teams change
      if (field === "team_buy_in" || field === "max_teams") {
        updated.prize_pool = updated.max_teams * updated.team_buy_in * 0.8
      }
      return updated
    })
  }

  const currentTournamentType = tournamentTypes[formData.tournament_type as keyof typeof tournamentTypes]
  const selectedTeamOption = teamCountOptions.find((option) => option.value === formData.max_teams)

  return (
    <div className="container mx-auto p-6 space-y-6 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            Create Tournament
          </h1>
          <p className="text-muted-foreground">
            Anyone can host tournaments! Create your own customizable tournament with team purchasing and auction drafts
          </p>
        </div>
        <Link href="/leagues">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leagues
          </Button>
        </Link>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold">Tournament Creation Now Open to Everyone!</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Create your own tournaments with custom formats, team purchasing, and auction drafts. Set your own rules,
            prize pools, and duration. Perfect for organizing competitions with friends or the community!
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tournament Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Configure your tournament format, duration, and team structure</CardDescription>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your tournament format, rules, and what makes it special..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tournament_type">Tournament Type</Label>
                  <Select
                    value={formData.tournament_type}
                    onValueChange={(value) => handleInputChange("tournament_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tournamentTypes).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (Days)</Label>
                    {formData.tournament_type === "custom" ? (
                      <Input
                        id="duration_days"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.duration_days}
                        onChange={(e) => handleInputChange("duration_days", Number.parseInt(e.target.value) || 1)}
                        placeholder="Enter custom duration..."
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{currentTournamentType.days} Days</span>
                        <Badge variant="secondary" className="ml-auto">
                          {currentTournamentType.icon} {currentTournamentType.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_teams">Maximum Teams</Label>
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
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{currentTournamentType.icon}</span>
                    <h4 className="font-medium">{currentTournamentType.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{currentTournamentType.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formData.duration_days} days
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {formData.max_teams} teams
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Purchase & Auction Settings</CardTitle>
                <CardDescription>Configure team buying and auction draft parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team_buy_in">Team Buy-In ($)</Label>
                    <Input
                      id="team_buy_in"
                      type="number"
                      min="50"
                      step="25"
                      value={formData.team_buy_in}
                      onChange={(e) => handleInputChange("team_buy_in", Number.parseFloat(e.target.value) || 0)}
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground">Cost for players to buy a team slot</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auction_budget">Auction Budget ($)</Label>
                    <Input
                      id="auction_budget"
                      type="number"
                      min="500"
                      step="100"
                      value={formData.auction_budget}
                      onChange={(e) => handleInputChange("auction_budget", Number.parseFloat(e.target.value) || 0)}
                      placeholder="1000"
                    />
                    <p className="text-xs text-muted-foreground">Budget each team gets for player auctions</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">How It Works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Players pay the buy-in to purchase a team slot</li>
                    <li>• Each team owner gets an auction budget to bid on players</li>
                    <li>• Auction draft determines team rosters</li>
                    <li>• Tournament runs for the specified duration</li>
                    <li>• Prize pool distributed to top performers</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Set important dates for your tournament</CardDescription>
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
                    <Label htmlFor="auction_date">Auction Draft Date</Label>
                    <Input
                      id="auction_date"
                      type="datetime-local"
                      value={formData.auction_date}
                      onChange={(e) => handleInputChange("auction_date", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tournament_start">Tournament Start</Label>
                    <Input
                      id="tournament_start"
                      type="datetime-local"
                      value={formData.tournament_start}
                      onChange={(e) => handleInputChange("tournament_start", e.target.value)}
                      required
                    />
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
                    {currentTournamentType.icon} {currentTournamentType.name}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formData.duration_days} Days • {formData.max_teams} Teams
                  </p>
                  {selectedTeamOption && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedTeamOption.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Team Buy-In:</span>
                    <span className="font-medium">${formData.team_buy_in}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auction Budget:</span>
                    <span className="font-medium">${formData.auction_budget}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium text-green-500">${formData.prize_pool}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Teams:</span>
                    <span className="font-medium">{formData.max_teams}</span>
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
                    <span className="font-medium text-green-500">${(formData.prize_pool * 0.4).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2nd Place (25%):</span>
                    <span className="font-medium text-green-500">${(formData.prize_pool * 0.25).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3rd Place (15%):</span>
                    <span className="font-medium text-green-500">${(formData.prize_pool * 0.15).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4th-6th (20%):</span>
                    <span className="font-medium text-green-500">${(formData.prize_pool * 0.2).toFixed(0)}</span>
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
