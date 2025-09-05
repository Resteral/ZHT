"use client"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Users, Trophy, Settings, Calendar, Clock, Target, Crown, Zap, BarChart3 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function CreateTournamentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

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
    duration_type: "short" as "short" | "long",
    tournament_type: "draft",
    max_participants: 32,
    start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    game: "zealot_hockey",
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

      // Team settings
      num_teams: 8,
      players_per_team: 4,
      max_teams: 8,
      games_per_team: 10,

      // Team system settings
      allow_team_invitations: true,
      require_team_confirmation: true,
      team_registration_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),

      // Tournament flow settings
      auto_start: true,
      create_lobbies_on_finish: true,
    },
  })

  const updateDurationDefaults = (durationType: "short" | "long") => {
    const now = new Date()
    if (durationType === "short") {
      // Short tournaments: 1-7 days, smaller pools, live brackets
      setFormData((prev) => ({
        ...prev,
        duration_type: durationType,
        max_participants: 32,
        end_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 3 days
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
        end_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 45 days
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
  const endDate = new Date(formData.end_date)
  const now = new Date()
  const isStartDateValid = startDate > now
  const isEndDateValid = endDate > startDate
  const isDateValid = isStartDateValid && isEndDateValid

  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const isDurationValid = formData.duration_type === "short" ? durationDays <= 7 : durationDays >= 30

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
          <p className="text-muted-foreground">
            Configure{" "}
            {formData.duration_type === "short" ? "bracket type, draft style" : "draft style, captain selection"}, and
            team organization
          </p>
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

                const startDateTime = new Date(formData.start_date).toISOString()
                const endDateTime = new Date(formData.end_date).toISOString()

                const tournamentData = {
                  name: formData.name,
                  description:
                    formData.duration_type === "short"
                      ? `${formData.settings.bracket_type.replace("_", " ")} tournament with ${formData.settings.draft_mode.replace("_", " ")} drafting`
                      : `League with ${formData.settings.draft_mode.replace("_", " ")} drafting and manual scheduling`,
                  tournament_type: formData.duration_type === "long" ? "league" : "draft",
                  max_participants: formData.max_participants,
                  max_teams: isTeamBased ? formData.settings.max_teams : formData.settings.num_teams,
                  team_based: isTeamBased,
                  entry_fee: 0,
                  start_date: startDateTime,
                  end_date: endDateTime,
                  game: formData.game,
                  player_pool_settings: {
                    ...formData.settings,
                    duration_type: formData.duration_type,
                    draft_mode: formData.settings.draft_mode,
                    ...(formData.duration_type === "short" && { bracket_type: formData.settings.bracket_type }),
                    player_organization: formData.settings.player_organization,
                  },
                }

                console.log("[v0] Creating tournament:", tournamentData)

                const { tournamentService } = await import("@/lib/services/tournament-service")
                const tournament = await tournamentService.createTournament(tournamentData)

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
                          <h5 className="font-medium text-blue-900 dark:text-blue-100">Short Tournament</h5>
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
                          <h5 className="font-medium text-green-900 dark:text-green-100">Long League</h5>
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
                    ? "Short tournaments feature live brackets and quick elimination-style play, perfect for weekend competitions."
                    : "Long leagues use manual game scheduling by the creator and focus on leaderboard rankings over weeks or months, ideal for seasonal play."}
                </div>
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
                    <p className="text-xs text-muted-foreground">When tournament begins</p>
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
                      className={!isEndDateValid || !isDurationValid ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">When tournament concludes</p>
                    {!isEndDateValid && <p className="text-xs text-destructive">End date must be after start date</p>}
                    {!isDurationValid && (
                      <p className="text-xs text-destructive">
                        {formData.duration_type === "short"
                          ? "Short tournaments must be 7 days or less"
                          : "Long leagues must be 30 days or more"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Duration: {durationDays} days •
                  {formData.duration_type === "short" && durationDays <= 7 && " ✓ Valid for short tournament"}
                  {formData.duration_type === "long" && durationDays >= 30 && " ✓ Valid for long league"}
                  {!isDurationValid && " ⚠️ Duration doesn't match selected type"}
                </div>
              </div>

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

              {formData.duration_type === "long" && (
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
                  <p className="text-sm text-muted-foreground">How team captains will be selected</p>
                </div>
              )}

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
                      {[4, 6, 8, 10, 12, 16, 20, 24].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            {num} Teams Maximum
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Maximum number of teams that can register</p>
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
                      {[5, 8, 10, 12, 15, 18, 20, 24, 30].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            {num} Games per Team
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How many games each team will play during the league season
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
              className={`${hasConflict || !isDateValid || !isDurationValid ? "bg-destructive/10 border-destructive" : "bg-muted/50"}`}
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
                      {formData.duration_type === "short"
                        ? "Short Tournament (Live Brackets)"
                        : "Long League (Manual Scheduling)"}
                    </p>
                    <p>
                      <strong>Duration:</strong> {durationDays} days
                    </p>
                    {formData.duration_type === "short" && (
                      <p>
                        <strong>Format:</strong> {formData.settings.bracket_type.replace("_", " ").toUpperCase()}{" "}
                        bracket
                      </p>
                    )}
                    <p>
                      <strong>Draft Style:</strong> {formData.settings.draft_mode.replace("_", " ").toUpperCase()}
                    </p>
                    {formData.duration_type === "long" && (
                      <p>
                        <strong>Captain Selection:</strong>{" "}
                        {formData.settings.captain_selection_method.replace("_", " ").toUpperCase()}
                      </p>
                    )}
                    <p>
                      <strong>Organization:</strong>{" "}
                      {formData.settings.player_organization.replace("_", " ").toUpperCase()}
                    </p>
                    <p>
                      <strong>Starts:</strong> {new Date(formData.start_date).toLocaleString()}
                    </p>
                    <p>
                      <strong>Ends:</strong> {new Date(formData.end_date).toLocaleString()}
                    </p>
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

                    {!isDateValid && (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>DATE ERROR:</strong> Please fix the tournament dates
                      </div>
                    )}

                    {!isDurationValid && (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>DURATION ERROR:</strong>{" "}
                        {formData.duration_type === "short"
                          ? "Short tournaments must be 7 days or less"
                          : "Long leagues must be 30 days or more"}
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

            <Button
              type="submit"
              disabled={loading || !isValid || !isDateValid || !isDurationValid}
              className="w-full"
              size="lg"
            >
              {loading
                ? "Creating Tournament..."
                : !isDateValid
                  ? "Fix Tournament Dates First"
                  : !isDurationValid
                    ? "Fix Tournament Duration"
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
