"use client"

import type React from "react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Trophy, Users, Calendar, DollarSign, ArrowLeft, Zap, Target, Settings, Crown, Shield } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createClient } from "@/lib/supabase/client"

export default function CreateTournamentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const tournamentType = searchParams.get("type")
  const [formData, setFormData] = useState({
    name:
      tournamentType === "team"
        ? "Team Tournament"
        : tournamentType === "solo"
          ? "Solo League"
          : tournamentType === "snake_draft"
            ? "Snake Draft Championship"
            : tournamentType === "linear_draft"
              ? "Linear Draft Masters"
              : tournamentType === "auction"
                ? "Auction Draft Tournament"
                : "",
    description:
      tournamentType === "team"
        ? "3-day team tournament with competitive brackets and team building phase"
        : tournamentType === "solo"
          ? "Extended solo league play with ELO-based matchmaking"
          : tournamentType === "snake_draft"
            ? "Month-long snake draft tournament with strategic captain selection and reversing pick order"
            : tournamentType === "linear_draft"
              ? "Month-long linear draft tournament with consistent pick order and strategic depth"
              : tournamentType === "auction"
                ? "Auction draft tournament with bidding system and virtual currency"
                : "",
    tournament_type:
      tournamentType === "snake_draft" || tournamentType === "linear_draft" || tournamentType === "auction"
        ? "month_long_draft"
        : "single_elimination",
    max_participants:
      tournamentType === "team"
        ? 16
        : tournamentType === "solo"
          ? 32
          : tournamentType === "snake_draft"
            ? 64
            : tournamentType === "linear_draft"
              ? 48
              : tournamentType === "auction"
                ? 32
                : 16,
    entry_fee:
      tournamentType === "snake_draft" || tournamentType === "linear_draft" || tournamentType === "auction" ? 0 : 0,
    prize_pool:
      tournamentType === "snake_draft"
        ? 10000
        : tournamentType === "linear_draft"
          ? 8000
          : tournamentType === "auction"
            ? 5000
            : 0,
    start_date: "",
    registration_opens: "",
    registration_closes: "",
    end_date: "",
    game: "zealot_hockey",
    featured: false,
    duration_days:
      tournamentType === "snake_draft" || tournamentType === "linear_draft" || tournamentType === "auction" ? 30 : 3,
    enable_player_pool: tournamentType === "team" ? true : false,
    player_pool_settings: {
      max_teams: 8,
      players_per_team: 5,
      max_pool_size: 50,
      draft_type: (tournamentType === "snake_draft"
        ? "snake"
        : tournamentType === "linear_draft"
          ? "linear"
          : tournamentType === "auction"
            ? "auction"
            : "auction") as "auction" | "snake" | "linear",
      auction_budget: 500,
      pick_time_limit: 120,
      auto_start: true,
    },
  })

  useEffect(() => {
    const supabase = createClient()
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user?.email === "resteral@example.com" || user?.id === "944b281e-89d5-46f7-b10b-2439f275e179") {
        setIsAdmin(true)
      }
    }
    getUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      console.log("[v0] Starting tournament creation for user:", user.id)
      console.log("[v0] Tournament data:", formData)

      const supabase = createClient()

      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id, username")
        .eq("id", user.id)
        .single()

      if (userCheckError && userCheckError.code === "PGRST116") {
        // User doesn't exist, create them
        console.log("[v0] Creating user in database:", user.id)
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            username: user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`,
            email: user.email,
            elo_rating: 1200,
            total_games: 0,
            wins: 0,
            losses: 0,
          })
          .select()
          .single()

        if (createError) {
          console.error("[v0] Failed to create user:", createError)
          throw new Error(`Failed to create user: ${createError.message}`)
        }
        console.log("[v0] User created successfully:", newUser.username)
      } else if (userCheckError) {
        console.error("[v0] Database error checking user:", userCheckError)
        throw new Error(`Database error: ${userCheckError.message}`)
      } else {
        console.log("[v0] User verified in database:", existingUser.username)
      }

      console.log("[v0] User verification complete, proceeding with tournament creation")

      if (formData.tournament_type === "month_long_draft") {
        console.log("[v0] Creating month-long draft tournament")
        const { monthLongTournamentService } = await import("@/lib/services/month-long-tournament-service")

        const tournamentData = {
          name: formData.name,
          description: formData.description,
          tournament_type: formData.player_pool_settings.draft_type as "snake_draft" | "linear_draft" | "auction_draft",
          duration_days: formData.duration_days,
          max_participants: formData.max_participants,
          entry_fee: formData.entry_fee,
          start_date: formData.start_date,
        }

        console.log("[v0] Month-long tournament data:", tournamentData)
        console.log("[v0] Using user ID:", user.id)

        const tournament = await monthLongTournamentService.createMonthLongTournament(tournamentData, user.id)

        console.log("[v0] Month-long tournament created successfully:", tournament)

        const { data: verifyTournament, error: verifyError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournament.id)
          .single()

        if (verifyError) {
          console.error("[v0] Failed to verify tournament creation:", verifyError)
          throw new Error(`Tournament creation verification failed: ${verifyError.message}`)
        }

        console.log("[v0] Tournament verified in database:", verifyTournament)

        if (formData.player_pool_settings.draft_type === "snake") {
          router.push("/tournaments/snake-draft")
        } else if (formData.player_pool_settings.draft_type === "linear") {
          router.push("/tournaments/linear-draft")
        } else {
          router.push(`/tournaments/${tournament.id}`)
        }
      } else {
        console.log("[v0] Creating regular tournament")
        console.log("[v0] Tournament service data:", formData)
        console.log("[v0] Using user ID:", user.id)

        if (!formData.name || formData.name.trim() === "") {
          throw new Error("Tournament name is required")
        }

        if (!formData.game) {
          throw new Error("Game selection is required")
        }

        if (formData.max_participants < 2) {
          throw new Error("Tournament must have at least 2 participants")
        }

        const tournament = await tournamentService.createTournament(formData, user.id)
        console.log("[v0] Regular tournament created successfully:", tournament)

        const { data: verifyTournament, error: verifyError } = await supabase
          .from("leagues")
          .select("*")
          .eq("id", tournament.id)
          .single()

        if (verifyError) {
          console.error("[v0] Failed to verify tournament creation:", verifyError)
          throw new Error(`Tournament creation verification failed: ${verifyError.message}`)
        }

        console.log("[v0] Tournament verified in database:", verifyTournament)
        router.push(`/tournaments/${tournament.id}`)
      }

      console.log("[v0] Tournament creation process completed successfully")
    } catch (error) {
      console.error("[v0] Error creating tournament:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] Full error details:", error)

      if (errorMessage.includes("duplicate key")) {
        alert("A tournament with this name already exists. Please choose a different name.")
      } else if (errorMessage.includes("foreign key")) {
        alert("Database constraint error. Please try again or contact support.")
      } else if (errorMessage.includes("not authenticated")) {
        alert("Please log in to create tournaments.")
      } else {
        alert(`Failed to create tournament: ${errorMessage}. Please check your settings and try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const tournamentTypes = [
    {
      value: "single_elimination",
      label: "Single Elimination",
      description: "One loss and you're out - fast and intense",
      icon: "⚡",
    },
    {
      value: "double_elimination",
      label: "Double Elimination",
      description: "Second chances - losers bracket for redemption",
      icon: "🔄",
    },
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Everyone plays everyone - most fair format",
      icon: "🔄",
    },
    {
      value: "month_long_draft",
      label: "Month-Long Draft Tournament",
      description: "Extended tournament with draft phases and weekly matches",
      icon: "📅",
    },
    ...(isAdmin
      ? [
          {
            value: "swiss_system",
            label: "Swiss System",
            description: "Pair players with similar records - balanced competition",
            icon: "🏔️",
          },
        ]
      : []),
  ]

  const gameOptions = [
    { value: "zealot_hockey", label: "Zealot Hockey", icon: "🏒" },
    { value: "counter_strike", label: "Counter Strike", icon: "🔫" },
    { value: "rainbow_six_siege", label: "Rainbow Six Siege", icon: "🏢" },
    { value: "call_of_duty", label: "Call of Duty", icon: "⚔️" },
  ]

  const participantOptions = [8, 16, 32, 64, 128]

  const teamCountOptions = [4, 6, 8, 10, 12, 16]
  const playersPerTeamOptions = [3, 4, 5, 6, 8]
  const poolSizeOptions = [30, 40, 50, 60, 80, 100]

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {tournamentType === "team"
                ? "Create Team Tournament"
                : tournamentType === "solo"
                  ? "Create Solo League"
                  : tournamentType === "snake_draft"
                    ? "Create Snake Draft Championship"
                    : tournamentType === "linear_draft"
                      ? "Create Linear Draft Masters"
                      : tournamentType === "auction"
                        ? "Create Auction Draft Tournament"
                        : "Create Tournament"}
            </h1>
            {isAdmin && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Crown className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {tournamentType === "team"
              ? "Set up a 3-day team tournament with drafting and competitive brackets"
              : tournamentType === "solo"
                ? "Create an extended solo league with ELO-based matchmaking"
                : tournamentType === "snake_draft"
                  ? "Month-long snake draft tournament with strategic captain selection and reversing pick order"
                  : tournamentType === "linear_draft"
                    ? "Month-long linear draft tournament with consistent pick order and strategic depth"
                    : tournamentType === "auction"
                      ? "Auction draft tournament with bidding system and virtual currency"
                      : "Set up a new competitive tournament with brackets and prizes"}
          </p>
        </div>
      </div>

      {tournamentType && (
        <div className="mb-6">
          <Badge variant="secondary" className="text-sm">
            {tournamentType === "team"
              ? "🏆 Team Tournament"
              : tournamentType === "solo"
                ? "👤 Solo League"
                : tournamentType === "snake_draft"
                  ? "🐍 Snake Draft Championship"
                  : tournamentType === "linear_draft"
                    ? "📊 Linear Draft Masters"
                    : tournamentType === "auction"
                      ? "🏛️ Auction Draft Tournament"
                      : ""}
          </Badge>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Details
              </CardTitle>
              <CardDescription>Configure your tournament settings and rules</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter an exciting tournament name"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your tournament, rules, and what makes it special..."
                      rows={4}
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Game</Label>
                      <Select
                        value={formData.game}
                        onValueChange={(value) => setFormData({ ...formData, game: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gameOptions.map((game) => (
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
                  )}
                </div>

                {/* Tournament Type */}
                <div className="space-y-3">
                  <Label>Tournament Format</Label>
                  <div className="grid gap-3">
                    {tournamentTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.tournament_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setFormData({ ...formData, tournament_type: type.value })}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{type.label}</h4>
                              {formData.tournament_type === type.value && <Badge variant="secondary">Selected</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-800">
                        <Shield className="h-5 w-5" />
                        Admin Schedule Settings
                      </CardTitle>
                      <CardDescription>Advanced scheduling options for super admins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="registration_opens">Registration Opens</Label>
                          <Input
                            id="registration_opens"
                            type="datetime-local"
                            value={formData.registration_opens}
                            onChange={(e) => setFormData({ ...formData, registration_opens: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="registration_closes">Registration Closes</Label>
                          <Input
                            id="registration_closes"
                            type="datetime-local"
                            value={formData.registration_closes}
                            onChange={(e) => setFormData({ ...formData, registration_closes: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date">Tournament End Date</Label>
                        <Input
                          id="end_date"
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="featured">Featured Tournament</Label>
                          <p className="text-sm text-muted-foreground">Display prominently on the tournaments page</p>
                        </div>
                        <Switch
                          id="featured"
                          checked={formData.featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Participants & Timing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!formData.enable_player_pool && (
                    <div className="space-y-2">
                      <Label>Max Participants</Label>
                      <Select
                        value={formData.max_participants.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, max_participants: Number.parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {participantOptions.map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {num} Players
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date & Time</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Prize & Entry */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.entry_fee}
                      onChange={(e) => setFormData({ ...formData, entry_fee: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
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
                      onChange={(e) => setFormData({ ...formData, prize_pool: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Duration for Month-Long Draft */}
                {formData.tournament_type === "month_long_draft" && (
                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Tournament Duration (Days)</Label>
                    <Select
                      value={formData.duration_days.toString()}
                      onValueChange={(value) => setFormData({ ...formData, duration_days: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">2 Weeks</SelectItem>
                        <SelectItem value="30">1 Month</SelectItem>
                        <SelectItem value="60">2 Months</SelectItem>
                        <SelectItem value="90">3 Months (Season)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    "Creating Tournament..."
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Tournament
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Player Pool Draft Settings
              </CardTitle>
              <CardDescription>Configure team-based draft with player pool</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable_player_pool">Enable Player Pool Draft</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow players to join a pool and be drafted into teams
                  </p>
                </div>
                <Switch
                  id="enable_player_pool"
                  checked={formData.enable_player_pool}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_player_pool: checked })}
                />
              </div>

              {formData.enable_player_pool && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Max Tournament Participants</Label>
                    <Select
                      value={formData.max_participants.toString()}
                      onValueChange={(value) => setFormData({ ...formData, max_participants: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {participantOptions.map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {num} Players
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Total players who can register for the tournament (includes player pool)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Teams</Label>
                      <Select
                        value={formData.player_pool_settings.max_teams.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            player_pool_settings: {
                              ...formData.player_pool_settings,
                              max_teams: Number.parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {teamCountOptions.map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} Teams
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Players per Team</Label>
                      <Select
                        value={formData.player_pool_settings.players_per_team.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            player_pool_settings: {
                              ...formData.player_pool_settings,
                              players_per_team: Number.parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {playersPerTeamOptions.map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} Players
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Pool Size</Label>
                      <Select
                        value={formData.player_pool_settings.max_pool_size.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            player_pool_settings: {
                              ...formData.player_pool_settings,
                              max_pool_size: Number.parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {poolSizeOptions.map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} Players
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Draft Type</Label>
                      <Select
                        value={formData.player_pool_settings.draft_type}
                        onValueChange={(value: "auction" | "snake" | "linear") =>
                          setFormData({
                            ...formData,
                            player_pool_settings: {
                              ...formData.player_pool_settings,
                              draft_type: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auction">
                            <div className="flex items-center gap-2">
                              <span>🏛️</span>
                              <div>
                                <div>Auction Draft</div>
                                <div className="text-xs text-muted-foreground">Bid on players with budget</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="snake">
                            <div className="flex items-center gap-2">
                              <span>🐍</span>
                              <div>
                                <div>Snake Draft</div>
                                <div className="text-xs text-muted-foreground">Reversing pick order each round</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="linear">
                            <div className="flex items-center gap-2">
                              <span>📊</span>
                              <div>
                                <div>Linear Draft</div>
                                <div className="text-xs text-muted-foreground">Same pick order every round</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.player_pool_settings.draft_type === "auction" && (
                      <div className="space-y-2">
                        <Label>Auction Budget ($)</Label>
                        <Select
                          value={formData.player_pool_settings.auction_budget.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              player_pool_settings: {
                                ...formData.player_pool_settings,
                                auction_budget: Number.parseInt(value),
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="300">$300</SelectItem>
                            <SelectItem value="500">$500</SelectItem>
                            <SelectItem value="750">$750</SelectItem>
                            <SelectItem value="1000">$1000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {formData.player_pool_settings.draft_type === "auction" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pick Time Limit (seconds)</Label>
                        <Select
                          value={formData.player_pool_settings.pick_time_limit.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              player_pool_settings: {
                                ...formData.player_pool_settings,
                                pick_time_limit: Number.parseInt(value),
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="120">2 minutes</SelectItem>
                            <SelectItem value="180">3 minutes</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto_start">Auto-start Draft</Label>
                          <p className="text-sm text-muted-foreground">Start automatically when all teams ready</p>
                        </div>
                        <Switch
                          id="auto_start"
                          checked={formData.player_pool_settings.auto_start}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              player_pool_settings: {
                                ...formData.player_pool_settings,
                                auto_start: checked,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Pool Configuration Summary</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Tournament Capacity</span>
                        <span className="font-medium text-lg">{formData.max_participants}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Team Slots</span>
                        <span className="font-medium text-lg">
                          {formData.player_pool_settings.max_teams * formData.player_pool_settings.players_per_team}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Pool Size</span>
                        <span className="font-medium text-lg">{formData.player_pool_settings.max_pool_size}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Available Spots</span>
                        <span className="font-medium text-lg text-green-600">
                          {formData.max_participants -
                            formData.player_pool_settings.max_teams * formData.player_pool_settings.players_per_team}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tournament Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">
                    {tournamentTypes.find((t) => t.value === formData.tournament_type)?.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{formData.max_participants}</span>
                </div>

                {formData.enable_player_pool && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium">{formData.player_pool_settings.max_teams}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Per Team:</span>
                      <span className="font-medium">{formData.player_pool_settings.players_per_team}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Draft:</span>
                      <Badge variant="outline" className="text-xs">
                        {formData.player_pool_settings.draft_type === "snake"
                          ? "🐍 Snake"
                          : formData.player_pool_settings.draft_type === "linear"
                            ? "📊 Linear"
                            : "🏛️ Auction"}
                      </Badge>
                    </div>
                  </>
                )}

                {formData.tournament_type === "month_long_draft" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{formData.duration_days} days</span>
                  </div>
                )}

                {formData.start_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Starts:</span>
                    <span className="font-medium">{new Date(formData.start_date).toLocaleDateString()}</span>
                  </div>
                )}

                {formData.prize_pool > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium text-green-600">${formData.prize_pool.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl">🏆</div>
                <p className="text-sm text-muted-foreground">
                  Players earn <strong>$100</strong> for each ELO game played in tournaments!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
