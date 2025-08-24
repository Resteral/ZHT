"use client"

import type React from "react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Trophy, Settings } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

export default function CreateTournamentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  const tournamentType = searchParams.get("type")

  const [formData, setFormData] = useState({
    tournament_type: tournamentType === "snake_draft" ? "month_long_draft" : "single_elimination",
    max_participants: 32, // Pool size
    game: "zealot_hockey",
    settings: {
      draft_mode: (tournamentType === "snake_draft"
        ? "snake_draft"
        : tournamentType === "linear_draft"
          ? "linear_draft"
          : tournamentType === "auction"
            ? "auction_draft"
            : "snake_draft") as "auction_draft" | "snake_draft" | "linear_draft",
      num_teams: 8, // Number of teams
      players_per_team: 4, // Players on each team
      auto_start: true,
      create_lobbies_on_finish: true,
      bracket_type: "single_elimination" as
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
        | "swiss_system",
    },
  })

  const playersNeeded = formData.settings.num_teams * formData.settings.players_per_team
  const excessPlayers = formData.max_participants - playersNeeded
  const hasConflict = playersNeeded > formData.max_participants
  const isValid = !hasConflict

  useEffect(() => {
    const supabase = createClient()
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[v0] Starting tournament creation")
      console.log("[v0] Tournament data:", formData)

      const supabase = createClient()
      let actualUserId = user?.id

      if (!user?.id) {
        console.log("[v0] No authenticated user, creating tournament anonymously")
        actualUserId = undefined
      }

      const tournamentData = {
        name: `${formData.settings.draft_mode.replace("_", " ").toUpperCase()} Tournament`,
        description: `${formData.settings.num_teams} teams, ${formData.settings.players_per_team} players each`,
        tournament_type: formData.tournament_type,
        max_participants: formData.max_participants,
        entry_fee: 0,
        prize_pool: 0,
        start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Start in 5 minutes
        game: formData.game,
        settings: formData.settings,
      }

      console.log("[v0] Creating tournament with data:", tournamentData)

      if (formData.tournament_type === "month_long_draft") {
        const { monthLongTournamentService } = await import("@/lib/services/month-long-tournament-service")
        const tournament = await monthLongTournamentService.createMonthLongTournament(
          tournamentData,
          actualUserId || "00000000-0000-0000-0000-000000000000",
        )
        router.push(`/tournaments/${tournament.id}/lobby`)
      } else {
        const result = await tournamentService.createTournament(tournamentData, actualUserId)
        router.push(`/tournaments/${result.id}/lobby`)
      }

      toast({
        title: "Tournament created!",
        description: "Players can now join the tournament pool",
      })
    } catch (error: any) {
      console.error("[v0] Error creating tournament:", error)
      toast({
        title: "Failed to create tournament",
        description: error?.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Tournament</h1>
          <p className="text-muted-foreground">Set up player pool and team structure</p>
        </div>
      </div>

      {tournamentType && (
        <div className="mb-6">
          <Badge variant="secondary" className="text-sm">
            {tournamentType === "snake_draft"
              ? "🐍 Snake Draft"
              : tournamentType === "linear_draft"
                ? "📊 Linear Draft"
                : tournamentType === "auction"
                  ? "🏛️ Auction Draft"
                  : "🏆 Tournament"}
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tournament Setup
          </CardTitle>
          <CardDescription>Configure player pool and team structure</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Draft Type</Label>
                <Select
                  value={formData.settings.draft_mode}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, draft_mode: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snake_draft">
                      <div className="flex items-center gap-2">
                        🐍 Snake Draft
                        <span className="text-xs text-muted-foreground ml-2">Alternating pick order</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="linear_draft">
                      <div className="flex items-center gap-2">
                        📊 Linear Draft
                        <span className="text-xs text-muted-foreground ml-2">Same pick order each round</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="auction_draft">
                      <div className="flex items-center gap-2">
                        🏛️ Auction Draft
                        <span className="text-xs text-muted-foreground ml-2">Bidding system</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How captains will select players for their teams</p>
              </div>

              <div className="space-y-2">
                <Label>Player Pool Size</Label>
                <Select
                  value={formData.max_participants.toString()}
                  onValueChange={(value) => setFormData({ ...formData, max_participants: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[16, 24, 32, 48, 64, 96, 128].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {num} Players in Pool
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Total number of players that can join the tournament pool
                </p>
              </div>

              <div className="space-y-2">
                <Label>Number of Teams</Label>
                <Select
                  value={formData.settings.num_teams.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, num_teams: Number.parseInt(value) },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 16].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          {num} Teams
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How many teams will be formed from the player pool</p>
              </div>

              <div className="space-y-2">
                <Label>Players per Team</Label>
                <Select
                  value={formData.settings.players_per_team.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, players_per_team: Number.parseInt(value) },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {num} Players per Team
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Number of players on each team after draft</p>
              </div>

              <div className="space-y-2">
                <Label>Bracket Format</Label>
                <Select
                  value={formData.settings.bracket_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, bracket_type: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">⚡ Single Elimination</SelectItem>
                    <SelectItem value="double_elimination">🔄 Double Elimination</SelectItem>
                    <SelectItem value="round_robin">🔄 Round Robin</SelectItem>
                    <SelectItem value="swiss_system">🏔️ Swiss System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How teams compete after the draft</p>
              </div>
            </div>

            {/* Tournament Summary */}
            <Card className={`${hasConflict ? "bg-destructive/10 border-destructive" : "bg-muted/50"}`}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Tournament Summary
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>{formData.settings.draft_mode.replace("_", " ").toUpperCase()}</strong> tournament format
                    </p>
                    <p>
                      <strong>{formData.max_participants}</strong> players can join the pool
                    </p>
                    <p>
                      <strong>{formData.settings.num_teams}</strong> teams with{" "}
                      <strong>{formData.settings.players_per_team}</strong> players each
                    </p>

                    {hasConflict ? (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>CONFLICT:</strong> Need {playersNeeded} players but only {formData.max_participants}{" "}
                        in pool
                      </div>
                    ) : excessPlayers > 0 ? (
                      <p className="text-muted-foreground">
                        <strong>{excessPlayers}</strong> excess players will be removed after draft
                      </p>
                    ) : (
                      <p className="text-green-600 font-medium">
                        ✓ Perfect match: All {formData.max_participants} players will be drafted
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={loading || !isValid} className="w-full" size="lg">
              {loading
                ? "Creating Tournament..."
                : hasConflict
                  ? "Fix Configuration First"
                  : "Create Tournament & Go to Lobby"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
