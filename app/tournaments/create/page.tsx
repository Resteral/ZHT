"use client"

import type React from "react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Trophy, Settings, Calendar, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

export default function CreateTournamentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  const tournamentType = searchParams.get("type")

  const [formData, setFormData] = useState({
    name: `${
      tournamentType === "snake_draft"
        ? "Snake Draft"
        : tournamentType === "linear_draft"
          ? "Linear Draft"
          : tournamentType === "auction"
            ? "Auction Draft"
            : "Snake Draft"
    } Tournament`,
    tournament_type: "month_long_draft",
    max_participants: 32, // Pool size - this is now the participant limit
    start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hour from now
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 30 days from now
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

  const startDate = new Date(formData.start_date)
  const endDate = new Date(formData.end_date)
  const now = new Date()
  const isStartDateValid = startDate > now
  const isEndDateValid = endDate > startDate
  const isDateValid = isStartDateValid && isEndDateValid

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
      console.log("[v0] Current user state:", user)

      const supabase = createClient()

      let actualUserId = user?.id
      console.log("[v0] Initial actualUserId:", actualUserId)

      if (!actualUserId) {
        console.log("[v0] No authenticated user, ensuring system user exists")

        // Check if system user exists, create if not
        const systemUserId = "00000000-0000-0000-0000-000000000000"
        const { data: systemUser, error: systemUserError } = await supabase
          .from("users")
          .select("id")
          .eq("id", systemUserId)
          .single()

        if (systemUserError && systemUserError.code === "PGRST116") {
          // System user doesn't exist, create it
          console.log("[v0] Creating system user")
          const { error: createSystemUserError } = await supabase.from("users").insert({
            id: systemUserId,
            username: "System",
            email: "system@tournament.local",
            elo_rating: 1000,
          })

          if (createSystemUserError) {
            console.error("[v0] Error creating system user:", createSystemUserError)
            throw new Error("Failed to create system user")
          }
        }

        actualUserId = systemUserId
      }

      console.log("[v0] Final actualUserId:", actualUserId)

      const startDateTime = new Date(formData.start_date).toISOString()
      const endDateTime = new Date(formData.end_date).toISOString()
      const durationDays = Math.ceil(
        (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24),
      )

      const tournamentData = {
        name: formData.name,
        description: `${formData.settings.num_teams} teams, ${formData.settings.players_per_team} players each`,
        tournament_type: formData.settings.draft_mode, // Use actual draft mode
        duration_days: durationDays,
        max_participants: formData.max_participants, // Use actual form value, not 999999
        entry_fee: 0,
        start_date: startDateTime,
        end_date: endDateTime,
        game: formData.game,
        player_pool_settings: formData.settings,
      }

      console.log("[v0] Creating tournament with data:", tournamentData)

      const { monthLongTournamentService } = await import("@/lib/services/month-long-tournament-service")
      const tournament = await monthLongTournamentService.createMonthLongTournament(tournamentData, actualUserId)

      console.log("[v0] Tournament created successfully:", tournament)

      if (user?.id && actualUserId !== "00000000-0000-0000-0000-000000000000") {
        try {
          console.log("[v0] Adding tournament creator to lobby as first player")

          // Check if user exists in users table, create if not
          const { data: existingUser, error: userCheckError } = await supabase
            .from("users")
            .select("id, username")
            .eq("id", user.id)
            .single()

          if (userCheckError && userCheckError.code === "PGRST116") {
            // User doesn't exist, create them
            console.log("[v0] Creating user record for tournament creator")
            const { error: createUserError } = await supabase.from("users").insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split("@")[0] || "Host",
              email: user.email,
              elo_rating: 1200, // Give host a decent starting ELO
            })

            if (createUserError) {
              console.error("[v0] Error creating user:", createUserError)
            }
          }

          // Add the creator as the first tournament participant
          const { error: participantError } = await supabase.from("tournament_participants").insert({
            tournament_id: tournament.id,
            user_id: user.id,
            status: "registered",
            joined_at: new Date().toISOString(),
          })

          if (participantError) {
            console.error("[v0] Error adding creator to tournament:", participantError)
          } else {
            console.log("[v0] Successfully added tournament creator as first player")
          }
        } catch (error) {
          console.error("[v0] Error in host auto-join process:", error)
        }
      }

      router.push(`/tournaments/${tournament.id}/lobby`)

      toast({
        title: "Tournament created!",
        description: "You've been added as the first player in the lobby",
      })
    } catch (error: any) {
      console.error("[v0] Error creating tournament - Full error object:", error)
      console.error("[v0] Error message:", error?.message)
      console.error("[v0] Error status:", error?.status)
      console.error("[v0] Error code:", error?.code)
      console.error("[v0] Error details:", error?.details)
      console.error("[v0] Error hint:", error?.hint)

      console.error("[v0] Stringified error:", JSON.stringify(error, null, 2))

      toast({
        title: "Failed to create tournament",
        description: error?.message || error?.details || "Please try again",
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
          <p className="text-muted-foreground">Set up dates, player pool and team structure</p>
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
          <CardDescription>Configure dates, player pool and team structure</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tournament_name">Tournament Name</Label>
                <Input
                  id="tournament_name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tournament name"
                  className="text-lg font-medium"
                />
                <p className="text-sm text-muted-foreground">Give your tournament a unique and memorable name</p>
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Tournament Timing
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Date & Time
                    </Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={!isStartDateValid ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">When draft begins and captains are assigned</p>
                    {!isStartDateValid && <p className="text-xs text-destructive">Start date must be in the future</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      End Date & Time
                    </Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={!isEndDateValid ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">When tournament concludes</p>
                    {!isEndDateValid && <p className="text-xs text-destructive">End date must be after start date</p>}
                  </div>
                </div>
              </div>

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
                <Label>Tournament Participant Limit</Label>
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
                          {num} Players Maximum
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Maximum number of players that can join this tournament</p>
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

            <Card className={`${hasConflict || !isDateValid ? "bg-destructive/10 border-destructive" : "bg-muted/50"}`}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Tournament Summary
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Name:</strong> {formData.name}
                    </p>
                    <p>
                      <strong>Starts:</strong> {new Date(formData.start_date).toLocaleString()}
                    </p>
                    <p>
                      <strong>Ends:</strong> {new Date(formData.end_date).toLocaleString()}
                    </p>
                    <p>
                      <strong>{formData.settings.draft_mode.replace("_", " ").toUpperCase()}</strong> tournament format
                    </p>
                    <p>
                      <strong>{formData.max_participants}</strong> players maximum can join
                    </p>
                    <p>
                      <strong>{formData.settings.num_teams}</strong> teams with{" "}
                      <strong>{formData.settings.players_per_team}</strong> players each
                    </p>

                    {!isDateValid && (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>DATE ERROR:</strong> Please fix the tournament dates
                      </div>
                    )}

                    {hasConflict ? (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>CONFLICT:</strong> Need {playersNeeded} players but only {formData.max_participants}{" "}
                        maximum allowed
                      </div>
                    ) : excessPlayers > 0 ? (
                      <p className="text-muted-foreground">
                        Up to <strong>{excessPlayers}</strong> excess players will be removed after draft
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

            <Button type="submit" disabled={loading || !isValid || !isDateValid} className="w-full" size="lg">
              {loading
                ? "Creating Tournament..."
                : !isDateValid
                  ? "Fix Tournament Dates First"
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
