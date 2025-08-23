"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Users, Trophy, Clock } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function CreateRoundRobinTournament() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    game: "hockey",
    max_participants: 8,
    entry_fee: 0,
    prize_pool: 0,
    start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("Please log in to create tournaments")
      return
    }

    setLoading(true)
    try {
      const tournamentData = {
        ...formData,
        tournament_type: "round_robin",
        team_based: true,
        player_pool_settings: {
          enable_player_pool: true,
          draft_mode: "round_robin",
          auto_start: true,
          num_teams: Math.ceil(formData.max_participants / 4), // 4 players per team
          players_per_team: 4,
          max_pool_size: formData.max_participants,
          registration_open: true,
        },
      }

      const tournament = await tournamentService.createTournament(tournamentData, user.id)

      toast.success("Round robin tournament created successfully!")
      router.push(`/tournaments/${tournament.id}`)
    } catch (error) {
      console.error("Error creating tournament:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create tournament")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const estimatedMatches =
    (Math.ceil(formData.max_participants / 4) * (Math.ceil(formData.max_participants / 4) - 1)) / 2

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Create Round Robin Tournament</h1>
          </div>
          <p className="text-muted-foreground">
            Every team plays every other team. The team with the most points wins!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Round Robin Championship"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game">Game</Label>
                  <Select value={formData.game} onValueChange={(value) => handleInputChange("game", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hockey">Hockey</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
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
                  placeholder="Describe your round robin tournament..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Max Players</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    min="4"
                    max="32"
                    step="4"
                    value={formData.max_participants}
                    onChange={(e) => handleInputChange("max_participants", Number.parseInt(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Must be divisible by 4</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.entry_fee}
                    onChange={(e) => handleInputChange("entry_fee", Number.parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_pool">Prize Pool ($)</Label>
                  <Input
                    id="prize_pool"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prize_pool}
                    onChange={(e) => handleInputChange("prize_pool", Number.parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date & Time</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  required
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tournament Preview
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Teams</div>
                      <div className="text-muted-foreground">{Math.ceil(formData.max_participants / 4)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Players per Team</div>
                      <div className="text-muted-foreground">4</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Matches</div>
                      <div className="text-muted-foreground">{estimatedMatches}</div>
                    </div>
                    <div>
                      <div className="font-medium">Format</div>
                      <div className="text-muted-foreground">Round Robin</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Every team plays every other team once. Winner determined by points (3 for win, 1 for draw).
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  "Creating Tournament..."
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Create Round Robin Tournament
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
