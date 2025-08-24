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
import { Trophy, Users, Calendar, DollarSign, ArrowLeft, Zap, Settings, Crown, Shield } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

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
    settings: {
      draft_mode: (tournamentType === "snake_draft"
        ? "snake_draft"
        : tournamentType === "linear_draft"
          ? "linear_draft"
          : tournamentType === "auction"
            ? "auction_draft"
            : "snake_draft") as "auction_draft" | "snake_draft" | "linear_draft",
      pick_time_limit: 120,
      auto_start: true,
      num_teams: 4,
      players_per_team: 4,
      create_lobbies_on_finish: true,
      bracket_type: "single_elimination" as
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
        | "swiss_system",
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
      console.log("[v0] Starting tournament creation")
      console.log("[v0] Tournament data:", formData)

      const supabase = createClient()
      let actualUserId = user?.id

      if (!user?.id) {
        console.log("[v0] No authenticated user, creating tournament anonymously")
        actualUserId = undefined
      }

      console.log("[v0] Proceeding with tournament creation")

      if (formData.tournament_type === "month_long_draft") {
        console.log("[v0] Creating month-long draft tournament")
        const { monthLongTournamentService } = await import("@/lib/services/month-long-tournament-service")

        const tournamentData = {
          name: formData.name,
          description: formData.description,
          tournament_type: formData.settings.draft_mode as "snake_draft" | "linear_draft" | "auction_draft",
          duration_days: formData.duration_days,
          max_participants: formData.max_participants,
          entry_fee: formData.entry_fee,
          start_date: formData.start_date,
          bracket_type: formData.settings.bracket_type,
        }

        console.log("[v0] Month-long tournament data:", tournamentData)
        console.log("[v0] Using user ID:", actualUserId || "anonymous")

        const tournament = await monthLongTournamentService.createMonthLongTournament(
          tournamentData,
          actualUserId || "00000000-0000-0000-0000-000000000000",
        )

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

        if (formData.settings.draft_mode === "snake_draft") {
          router.push(`/tournaments/${tournament.id}/draft`)
        } else {
          router.push(`/tournaments/${tournament.id}`)
        }
      } else {
        console.log("[v0] Creating regular tournament")
        console.log("[v0] Tournament service data:", formData)
        console.log("[v0] Using user ID:", actualUserId || "anonymous")

        if (!formData.name || formData.name.trim() === "") {
          throw new Error("Tournament name is required")
        }

        if (!formData.game) {
          throw new Error("Game selection is required")
        }

        if (formData.max_participants < 2) {
          throw new Error("Tournament must have at least 2 participants")
        }

        const result = await tournamentService.createTournament(formData, actualUserId)
        console.log("[v0] Tournament created successfully:", result)

        toast.success("🎉 Tournament created successfully!", {
          description: `${formData.name} is now open for registration`,
          duration: 5000,
        })

        router.push(`/tournaments/${result.id}`)
      }
    } catch (error: any) {
      console.error("[v0] Error creating tournament:", error)
      toast.error("Failed to create tournament", {
        description: error.message || "Please try again",
      })
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

  const bracketTypeOptions = [
    {
      value: "single_elimination",
      label: "Single Elimination",
      description: "One loss and you're out - fast and intense",
      icon: "⚡",
    },
    {
      value: "double_elimination",
      label: "Double Elimination",
      description: "Second chances with losers bracket",
      icon: "🔄",
    },
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Everyone plays everyone - most fair",
      icon: "🔄",
    },
    {
      value: "swiss_system",
      label: "Swiss System",
      description: "Pair teams with similar records",
      icon: "🏔️",
    },
  ]

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
              ? "Set up a tournament that creates lobbies when finished"
              : tournamentType === "solo"
                ? "Create a tournament with direct player participation"
                : tournamentType === "snake_draft"
                  ? "Month-long snake draft tournament with strategic captain selection and reversing pick order"
                  : tournamentType === "linear_draft"
                    ? "Month-long linear draft tournament with consistent pick order and strategic depth"
                    : tournamentType === "auction"
                      ? "Auction draft tournament with bidding system and virtual currency"
                      : "Set up a new competitive tournament that creates lobbies when completed"}
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
                  <div className="space-y-2">
                    <Label>Max Participants</Label>
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
                  </div>

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

                {(tournamentType === "snake_draft" || formData.tournament_type === "month_long_draft") && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Calendar className="h-5 w-5" />
                        Snake Tournament Schedule
                      </CardTitle>
                      <CardDescription>Set when your snake draft tournament begins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="snake_start_date" className="text-base font-medium">
                          Tournament Start Date & Time
                        </Label>
                        <Input
                          id="snake_start_date"
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="text-lg p-3"
                          required
                        />
                        <p className="text-sm text-blue-700">
                          This is when players can start joining and the draft phase begins
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(tournamentType === "snake_draft" || formData.settings.draft_mode === "snake_draft") && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Trophy className="h-5 w-5" />
                        Bracket Type Selection
                      </CardTitle>
                      <CardDescription>Choose how teams will compete after the draft</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Tournament Bracket Format</Label>
                        <div className="grid gap-3">
                          {bracketTypeOptions.map((bracket) => (
                            <div
                              key={bracket.value}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                formData.settings.bracket_type === bracket.value
                                  ? "border-green-500 bg-green-100"
                                  : "border-border hover:border-green-300"
                              }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  settings: { ...formData.settings, bracket_type: bracket.value as any },
                                })
                              }
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{bracket.icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{bracket.label}</h4>
                                    {formData.settings.bracket_type === bracket.value && (
                                      <Badge variant="secondary" className="bg-green-200 text-green-800">
                                        Selected
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{bracket.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                          After the snake draft completes, teams will compete in this bracket format
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    "Creating Tournament..."
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {tournamentType === "snake_draft" ? "Create Snake Tournament & Go to Draft" : "Create Tournament"}
                    </>
                  )}
                </Button>
              </form>
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

                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{formData.settings.num_teams}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Per Team:</span>
                  <span className="font-medium">{formData.settings.players_per_team}</span>
                </div>

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

                {(tournamentType === "snake_draft" || formData.settings.draft_mode === "snake_draft") && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Bracket:</span>
                    <span className="font-medium">
                      {bracketTypeOptions.find((b) => b.value === formData.settings.bracket_type)?.label}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {(tournamentType === "snake_draft" || formData.settings.draft_mode === "snake_draft") && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl">🐍</div>
                  <p className="text-sm font-medium text-blue-800">Snake Draft Tournament</p>
                  <p className="text-xs text-blue-600">
                    Draft order reverses each round, then teams compete in{" "}
                    {bracketTypeOptions.find((b) => b.value === formData.settings.bracket_type)?.label.toLowerCase()}{" "}
                    format!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
