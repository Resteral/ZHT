"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Users,
  Trophy,
  Settings,
  Calendar,
  Clock,
  Target,
  Crown,
  Zap,
  BarChart3,
  DollarSign,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { tournamentService } from "@/lib/services/tournament-service"

export default function CreateTournamentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const tournamentType = searchParams.get("type")
  const isDuplicate = searchParams.get("duplicate") === "true"
  const sourceId = searchParams.get("sourceId")
  const duplicateName = searchParams.get("name")
  const duplicateGame = searchParams.get("game")
  const duplicateMaxParticipants = searchParams.get("maxParticipants")
  const duplicatePrizePool = searchParams.get("prizePool")
  const duplicateTournamentType = searchParams.get("tournamentType")

  const [formData, setFormData] = useState({
    name:
      isDuplicate && duplicateName
        ? duplicateName
        : `${
            tournamentType === "snake_draft"
              ? "Snake Draft"
              : tournamentType === "linear_draft"
                ? "Linear Draft"
                : tournamentType === "auction"
                  ? "Auction Draft"
                  : "Snake Draft"
          } Tournament`,
    description: "",
    duration_type: "short" as "short" | "long",
    tournament_type: isDuplicate && duplicateTournamentType ? duplicateTournamentType : "draft",
    max_participants: isDuplicate && duplicateMaxParticipants ? Number.parseInt(duplicateMaxParticipants) : 32,
    start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    game: isDuplicate && duplicateGame ? duplicateGame : "zealot_hockey",
    entry_fee: 0,
    prize_pool: isDuplicate && duplicatePrizePool ? Number.parseInt(duplicatePrizePool) : 0,
    team_buy_in: 50,
    auction_budget: 500,
    registration_opens: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString().slice(0, 16),
    registration_closes: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString().slice(0, 16),
    auction_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    tournament_start: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
    settings: {
      bracket_type: "single_elimination" as
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
        | "swiss_system",

      // Drafting style options
      draft_mode: (tournamentType === "snake_draft"
        ? "snake_draft"
        : tournamentType === "linear_draft"
          ? "linear_draft"
          : tournamentType === "auction"
            ? "auction_draft"
            : "snake_draft") as "auction_draft" | "snake_draft" | "linear_draft",

      captain_selection_method: "creator_choice" as "creator_choice" | "highest_elo" | "random",

      // Player organization modes
      player_organization: "solo_draft" as "premade_teams" | "solo_draft" | "hybrid",

      num_teams: 4,
      players_per_team: 4,
      max_teams: 4,
      games_per_team: 10,

      league_tournament_type: "weekly" as "daily" | "weekly" | "biweekly" | "monthly" | "seasonal" | "custom",
      duration_days: 7,

      // Team system settings
      allow_team_invitations: true,
      require_team_confirmation: true,
      team_registration_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),

      // Tournament flow settings
      auto_start: true,
      create_lobbies_on_finish: true,
    },
  })

  useEffect(() => {
    if (isDuplicate && sourceId) {
      loadTournamentForDuplication(sourceId)
    }
  }, [isDuplicate, sourceId])

  const loadTournamentForDuplication = async (tournamentId: string) => {
    try {
      console.log("[v0] Loading tournament for duplication:", tournamentId)
      const tournament = await tournamentService.getTournament(tournamentId)

      if (tournament) {
        // Copy all tournament settings while updating name and dates
        setFormData((prev) => ({
          ...prev,
          name: `${tournament.name} (Copy)`,
          description: tournament.description || "",
          game: tournament.game || "zealot_hockey",
          max_participants: tournament.max_participants || 32,
          entry_fee: tournament.entry_fee || 0,
          prize_pool: tournament.prize_pool || 0,
          team_buy_in: tournament.team_buy_in || 50,
          auction_budget: tournament.auction_budget || 500,
          // Set new dates (1 hour from now for start, etc.)
          start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
          registration_opens: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString().slice(0, 16),
          registration_closes: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString().slice(0, 16),
          auction_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          tournament_start: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
          // Copy all tournament settings
          settings: {
            ...prev.settings,
            ...tournament.player_pool_settings,
            // Ensure team settings are properly copied
            num_teams: tournament.player_pool_settings?.num_teams || tournament.player_pool_settings?.max_teams || 4,
            max_teams: tournament.player_pool_settings?.max_teams || tournament.player_pool_settings?.num_teams || 4,
            players_per_team: tournament.player_pool_settings?.players_per_team || 4,
          },
        }))

        console.log("[v0] Tournament settings loaded for duplication")
      }
    } catch (error) {
      console.error("[v0] Error loading tournament for duplication:", error)
    }
  }

  const leagueTournamentTypes = {
    daily: { name: "Daily Tournament", days: 1, icon: "⚡", description: "Fast-paced single day competition" },
    weekly: { name: "Weekly Tournament", days: 7, icon: "📅", description: "Week-long competitive series" },
    biweekly: { name: "Bi-Weekly Tournament", days: 14, icon: "🗓️", description: "Two week tournament format" },
    monthly: { name: "Monthly Tournament", days: 30, icon: "📆", description: "Month-long championship" },
    seasonal: { name: "Seasonal Tournament", days: 90, icon: "🏆", description: "3-month seasonal competition" },
    custom: { name: "Custom Duration", days: 0, icon: "⚙️", description: "Set your own duration" },
  }

  const updateDurationDefaults = (durationType: "short" | "long") => {
    if (durationType === "short") {
      // Tournaments: 1-7 days, smaller pools, live brackets
      setFormData((prev) => ({
        ...prev,
        duration_type: durationType,
        max_participants: 32,
        settings: {
          ...prev.settings,
          bracket_type: "single_elimination",
          num_teams: 8,
          max_teams: 8,
          games_per_team: 3,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        duration_type: durationType,
        max_participants: 128,
        settings: {
          ...prev.settings,
          // Remove bracket_type for long leagues - they use manual scheduling
          num_teams: 16,
          max_teams: 16,
          games_per_team: 20,
          captain_selection_method: "creator_choice",
        },
      }))
    }
  }

  const handleLeagueTournamentTypeChange = (value: string) => {
    const typeData = leagueTournamentTypes[value as keyof typeof leagueTournamentTypes]
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        league_tournament_type: value as any,
        duration_days: typeData.days,
      },
    }))
  }

  const handleTeamBuyInChange = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      team_buy_in: value,
      prize_pool: prev.settings.max_teams * value * 0.8, // 80% of buy-ins go to prize pool
    }))
  }

  const playersNeeded =
    formData.settings.player_organization === "premade_teams"
      ? formData.settings.max_teams * formData.settings.players_per_team
      : formData.settings.num_teams * formData.settings.players_per_team

  const isTeamBased =
    formData.settings.player_organization === "premade_teams" || formData.settings.player_organization === "hybrid"

  // Only flag as conflict if max_participants is LESS than what's needed for teams
  // This allows draft tournaments to have more players in the pool than just team slots
  const hasConflict = formData.max_participants < playersNeeded
  const isValid = !hasConflict

  const startDate = new Date(formData.start_date)
  const now = new Date()
  const isStartDateValid = startDate > now

  const currentLeagueTournamentType = leagueTournamentTypes[formData.settings.league_tournament_type]

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
          <h1 className="text-3xl font-bold tracking-tight">
            {isDuplicate ? "Duplicate Tournament" : "Create Tournament"}
          </h1>
          <p className="text-muted-foreground">
            {isDuplicate ? "Creating a copy with the same settings" : "Configure your tournament settings"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tournament Configuration
          </CardTitle>
          <CardDescription>
            {formData.duration_type === "short"
              ? "Set up bracket format, draft style, and team organization"
              : "Set up draft style, captain selection, and manual scheduling"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)

              try {
                console.log("[v0] Starting tournament creation")
                console.log("[v0] Tournament data:", formData)
                console.log("[v0] Current user:", user?.id)

                const startDateTime = new Date(formData.start_date).toISOString()

                const tournamentData = {
                  name: formData.name,
                  description:
                    formData.description ||
                    (formData.duration_type === "short"
                      ? `${formData.settings.bracket_type.replace("_", " ")} tournament with ${formData.settings.draft_mode.replace("_", " ")} drafting`
                      : `League with ${formData.settings.draft_mode.replace("_", " ")} drafting and manual scheduling`),
                  tournament_type: formData.duration_type === "long" ? "league" : "draft",
                  max_participants: formData.max_participants,
                  max_teams: isTeamBased ? formData.settings.max_teams : formData.settings.num_teams,
                  team_based: isTeamBased,
                  entry_fee: formData.entry_fee,
                  prize_pool: formData.prize_pool,
                  start_date: startDateTime,
                  game: formData.game,
                  team_buy_in: formData.team_buy_in,
                  auction_budget: formData.auction_budget,
                  registration_opens: formData.registration_opens,
                  registration_closes: formData.registration_closes,
                  auction_date: formData.auction_date,
                  tournament_start: formData.tournament_start,
                  player_pool_settings: {
                    ...formData.settings,
                    duration_type: formData.duration_type,
                    draft_mode: formData.settings.draft_mode,
                    ...(formData.duration_type === "short" && { bracket_type: formData.settings.bracket_type }),
                    player_organization: formData.settings.player_organization,
                  },
                }

                console.log("[v0] Creating tournament:", tournamentData)

                const tournament = await tournamentService.createTournament(tournamentData, user?.id)

                console.log("[v0] Tournament created successfully:", tournament)

                if (formData.duration_type === "long") {
                  router.push(`/leagues?tournament=${tournament.id}`)
                } else {
                  router.push(`/tournaments/${tournament.id}/lobby`)
                }

                toast({
                  title: "Tournament created!",
                  description: `${formData.duration_type === "long" ? "League" : "Tournament"} is now available for registration`,
                })
              } catch (error: any) {
                console.error("[v0] Error creating tournament:", error)
                console.error("[v0] Error message:", error?.message)

                toast({
                  title: "Failed to create tournament",
                  description: error?.message || "Please try again",
                  variant: "destructive",
                })
              } finally {
                setLoading(false)
              }
            }}
            className="space-y-6"
          >
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your tournament format, rules, and what makes it special..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">Optional description of your tournament</p>
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tournament Type & Duration
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer transition-all ${formData.duration_type === "short" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => updateDurationDefaults("short")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-full">
                          <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-blue-900 dark:text-blue-100">Tournament</h5>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            1-7 days • Live brackets • Quick competition
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${formData.duration_type === "long" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => updateDurationDefaults("long")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-full">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-green-900 dark:text-green-100">League</h5>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            30+ days • Manual scheduling • Extended play
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-sm text-muted-foreground">
                  {formData.duration_type === "short"
                    ? "Tournaments feature live brackets and quick elimination-style play, perfect for weekend competitions."
                    : "Leagues use manual game scheduling by the creator and focus on leaderboard rankings over weeks or months, ideal for seasonal play."}
                </div>
              </div>

              {formData.duration_type === "long" && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    League Tournament Type
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="league_tournament_type">Tournament Type</Label>
                    <Select
                      value={formData.settings.league_tournament_type}
                      onValueChange={handleLeagueTournamentTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(leagueTournamentTypes).map(([key, type]) => (
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

                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (Days)</Label>
                    {formData.settings.league_tournament_type === "custom" ? (
                      <Input
                        id="duration_days"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.settings.duration_days}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settings: { ...formData.settings, duration_days: Number.parseInt(e.target.value) || 1 },
                          })
                        }
                        placeholder="Enter custom duration..."
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{currentLeagueTournamentType.days} Days</span>
                        <Badge variant="secondary" className="ml-auto">
                          {currentLeagueTournamentType.icon} {currentLeagueTournamentType.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{currentLeagueTournamentType.icon}</span>
                      <h4 className="font-medium">{currentLeagueTournamentType.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{currentLeagueTournamentType.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formData.settings.duration_days} days
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {formData.settings.max_teams} teams
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-green-800 dark:text-green-200">
                  <DollarSign className="h-4 w-4" />
                  Tournament Pricing & Rewards
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-xs text-muted-foreground">Cost for players to enter tournament</p>
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
                    <p className="text-xs text-muted-foreground">Total prize money for winners</p>
                  </div>
                </div>

                {formData.duration_type === "long" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team_buy_in">Team Buy-In ($)</Label>
                      <Input
                        id="team_buy_in"
                        type="number"
                        min="50"
                        step="25"
                        value={formData.team_buy_in}
                        onChange={(e) => handleTeamBuyInChange(Number.parseFloat(e.target.value) || 0)}
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
                        onChange={(e) =>
                          setFormData({ ...formData, auction_budget: Number.parseFloat(e.target.value) || 0 })
                        }
                        placeholder="1000"
                      />
                      <p className="text-xs text-muted-foreground">Budget each team gets for player auctions</p>
                    </div>
                  </div>
                )}

                {formData.entry_fee > 0 && formData.max_participants > 0 && (
                  <div className="text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                    <strong>Projected Revenue:</strong> ${(formData.entry_fee * formData.max_participants).toFixed(2)}
                    {formData.prize_pool > 0 && (
                      <span>
                        {" "}
                        • <strong>Net:</strong> $
                        {(formData.entry_fee * formData.max_participants - formData.prize_pool).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {formData.duration_type === "long" && formData.team_buy_in > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How Team Purchasing Works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Players pay the buy-in to purchase a team slot</li>
                      <li>• Each team owner gets an auction budget to bid on players</li>
                      <li>• Auction draft determines team rosters</li>
                      <li>• Tournament runs for the specified duration</li>
                      <li>• Prize pool distributed to top performers</li>
                    </ul>
                  </div>
                )}
              </div>

              {formData.duration_type === "long" && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tournament Schedule
                  </h4>

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="auction_date">Auction Draft Date</Label>
                      <Input
                        id="auction_date"
                        type="datetime-local"
                        value={formData.auction_date}
                        onChange={(e) => setFormData({ ...formData, auction_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tournament_start">Tournament Start</Label>
                      <Input
                        id="tournament_start"
                        type="datetime-local"
                        value={formData.tournament_start}
                        onChange={(e) => setFormData({ ...formData, tournament_start: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.duration_type === "short" && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tournament Timing
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Draft Start Time
                      </Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className={!isStartDateValid ? "border-destructive" : ""}
                      />
                      <p className="text-xs text-muted-foreground">When draft begins, games start immediately after</p>
                      {!isStartDateValid && (
                        <p className="text-xs text-destructive">Start date must be in the future</p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Tournament starts: {new Date(formData.start_date).toLocaleString()} • Runs until completion
                  </div>
                </div>
              )}

              {formData.duration_type === "short" && (
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
                      <SelectItem value="single_elimination">
                        <div className="flex items-center gap-2">
                          ⚡ Single Elimination
                          <span className="text-xs text-muted-foreground ml-2">One loss eliminates</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="double_elimination">
                        <div className="flex items-center gap-2">
                          🔄 Double Elimination
                          <span className="text-xs text-muted-foreground ml-2">Two losses eliminate</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="round_robin">
                        <div className="flex items-center gap-2">
                          🔄 Round Robin
                          <span className="text-xs text-muted-foreground ml-2">Everyone plays everyone</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="swiss_system">
                        <div className="flex items-center gap-2">
                          🏔️ Swiss System
                          <span className="text-xs text-muted-foreground ml-2">Paired by performance</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">How teams compete in the tournament</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Draft Style</Label>
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
                    <SelectItem value="auction_draft">
                      <div className="flex items-center gap-2">
                        🏛️ Auction Draft
                        <span className="text-xs text-muted-foreground ml-2">Bidding system</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How players are selected for teams</p>
              </div>

              <div className="space-y-2">
                <Label>Captain Selection Method</Label>
                <Select
                  value={formData.settings.captain_selection_method}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, captain_selection_method: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator_choice">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Creator Choice
                        <span className="text-xs text-muted-foreground ml-2">Tournament creator selects</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="highest_elo">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Highest ELO
                        <span className="text-xs text-muted-foreground ml-2">Top rated players</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="random">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Random Selection
                        <span className="text-xs text-muted-foreground ml-2">Randomly chosen</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How team captains will be selected for all tournaments</p>
              </div>

              <div className="space-y-2">
                <Label>Player Organization</Label>
                <Select
                  value={formData.settings.player_organization}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, player_organization: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premade_teams">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Premade Teams
                        <span className="text-xs text-muted-foreground ml-2">Teams register together</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="solo_draft">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Solo Draft
                        <span className="text-xs text-muted-foreground ml-2">Individual players drafted</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Hybrid
                        <span className="text-xs text-muted-foreground ml-2">Both premade teams and solo players</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">How players join and form teams</p>
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
                <p className="text-sm text-muted-foreground">Maximum number of players that can participate</p>
              </div>

              {isTeamBased && (
                <div className="space-y-2">
                  <Label>Maximum Teams</Label>
                  <Select
                    value={formData.settings.max_teams.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, max_teams: Number.parseInt(value) },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            {num} Teams Maximum
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Maximum number of teams that can register. Supports 2-32 teams for flexible tournament formats.
                  </p>
                </div>
              )}

              {formData.settings.player_organization === "solo_draft" && (
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
                      {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((num) => (
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
              )}

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
                <p className="text-sm text-muted-foreground">Number of players on each team</p>
              </div>

              {formData.duration_type === "long" && (
                <div className="space-y-2">
                  <Label>Games per Team</Label>
                  <Select
                    value={formData.settings.games_per_team.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, games_per_team: Number.parseInt(value) },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44,
                        46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82,
                      ].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            {num} Games per Team
                            <span className="text-xs text-muted-foreground ml-2">
                              {num <= 10 && "Short season"}
                              {num > 10 && num <= 30 && "Regular season"}
                              {num > 30 && num <= 50 && "Extended season"}
                              {num > 50 && "Full season"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How many games each team will play during the league season. More games provide better standings
                    accuracy but require longer commitment.
                  </p>
                </div>
              )}

              {isTeamBased && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Team System Settings
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_invitations"
                        checked={formData.settings.allow_team_invitations}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            settings: { ...formData.settings, allow_team_invitations: !!checked },
                          })
                        }
                      />
                      <Label htmlFor="allow_invitations" className="text-sm">
                        Allow team invitations
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Teams can invite players from their profiles and register together
                    </p>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="require_confirmation"
                        checked={formData.settings.require_team_confirmation}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            settings: { ...formData.settings, require_team_confirmation: !!checked },
                          })
                        }
                      />
                      <Label htmlFor="require_confirmation" className="text-sm">
                        Require team confirmation
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      All team members must confirm participation before tournament starts
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="team_deadline" className="text-sm">
                        Team Registration Deadline
                      </Label>
                      <Input
                        id="team_deadline"
                        type="datetime-local"
                        value={formData.settings.team_registration_deadline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settings: { ...formData.settings, team_registration_deadline: e.target.value },
                          })
                        }
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Deadline for teams to complete registration and confirmations
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Card
              className={`${hasConflict || !isStartDateValid ? "bg-destructive/10 border-destructive" : "bg-muted/50"}`}
            >
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
                      <strong>Type:</strong>{" "}
                      {formData.duration_type === "short" ? "Tournament (Live Brackets)" : "League (Manual Scheduling)"}
                    </p>
                    {formData.duration_type === "short" && (
                      <p>
                        <strong>Format:</strong> {formData.settings.bracket_type.replace("_", " ").toUpperCase()}{" "}
                        bracket
                      </p>
                    )}
                    {formData.duration_type === "long" && (
                      <p>
                        <strong>League Type:</strong> {currentLeagueTournamentType.name} (
                        {formData.settings.duration_days} days)
                      </p>
                    )}
                    <p>
                      <strong>Draft Style:</strong> {formData.settings.draft_mode.replace("_", " ").toUpperCase()}
                    </p>
                    <p>
                      <strong>Captain Selection:</strong>{" "}
                      {formData.settings.captain_selection_method.replace("_", " ").toUpperCase()}
                    </p>
                    <p>
                      <strong>Organization:</strong>{" "}
                      {formData.settings.player_organization.replace("_", " ").toUpperCase()}
                    </p>
                    <p>
                      <strong>Draft Starts:</strong> {new Date(formData.start_date).toLocaleString()}
                    </p>
                    <p>
                      <strong>Duration:</strong> Runs until completion
                    </p>
                    {formData.entry_fee > 0 && (
                      <p>
                        <strong>Entry Fee:</strong> ${formData.entry_fee}
                      </p>
                    )}
                    {formData.duration_type === "long" && formData.team_buy_in > 0 && (
                      <p>
                        <strong>Team Buy-In:</strong> ${formData.team_buy_in}
                      </p>
                    )}
                    {formData.prize_pool > 0 && (
                      <p>
                        <strong>Prize Pool:</strong> ${formData.prize_pool}
                      </p>
                    )}
                    <p>
                      <strong>{formData.max_participants}</strong> players maximum can participate
                    </p>
                    {isTeamBased ? (
                      <p>
                        <strong>{formData.settings.max_teams}</strong> teams with{" "}
                        <strong>{formData.settings.players_per_team}</strong> players each
                        {formData.duration_type === "long" && (
                          <span>
                            , <strong>{formData.settings.games_per_team}</strong> games per team
                          </span>
                        )}
                      </p>
                    ) : (
                      <p>
                        <strong>{formData.settings.num_teams}</strong> teams with{" "}
                        <strong>{formData.settings.players_per_team}</strong> players each
                        {formData.duration_type === "long" && (
                          <span>
                            , <strong>{formData.settings.games_per_team}</strong> games per team
                          </span>
                        )}
                      </p>
                    )}

                    {!isStartDateValid && (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>DATE ERROR:</strong> Please fix the tournament start date
                      </div>
                    )}

                    {hasConflict ? (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>CONFLICT:</strong> Need {playersNeeded} players minimum but only{" "}
                        {formData.max_participants} maximum allowed
                      </div>
                    ) : (
                      <p className="text-green-600 font-medium">
                        ✓ Configuration valid: {playersNeeded} players needed for teams, {formData.max_participants}{" "}
                        maximum pool size
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {formData.duration_type === "long" && formData.prize_pool > 0 && (
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
            )}

            <Button type="submit" disabled={loading || !isValid || !isStartDateValid} className="w-full" size="lg">
              {loading
                ? "Creating Tournament..."
                : !isStartDateValid
                  ? "Fix Tournament Start Date First"
                  : hasConflict
                    ? "Increase Maximum Participants"
                    : `Create ${formData.duration_type === "long" ? "League" : "Tournament"} & Go to ${formData.duration_type === "long" ? "Leagues" : "Lobby"}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
