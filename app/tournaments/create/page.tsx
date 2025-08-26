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
import { ArrowLeft, Users, Trophy, Settings, Calendar, Clock } from "lucide-react"
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
    tournament_type: "month_long_draft",
    start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    game: "zealot_hockey",
    team_based: false,
    max_teams: 8,
    signup_mode: "solo" as "solo" | "teams" | "hybrid",
    settings: {
      draft_mode: (tournamentType === "snake_draft"
        ? "snake_draft"
        : tournamentType === "linear_draft"
          ? "linear_draft"
          : tournamentType === "auction"
            ? "auction_draft"
            : "snake_draft") as "auction_draft" | "snake_draft" | "linear_draft",
      num_teams: 8,
      players_per_team: 4,
      auto_start: true,
      create_lobbies_on_finish: true,
      bracket_type: "single_elimination" as
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
        | "swiss_system",
      allow_solo_players: true,
      allow_premade_teams: false,
    },
  })

  const maxParticipants = formData.settings.num_teams * formData.settings.players_per_team
  const isValid = true // Remove redundant validation

  const startDate = new Date(formData.start_date)
  const endDate = new Date(formData.end_date)
  const now = new Date()
  const isStartDateValid = startDate > now
  const isEndDateValid = endDate > startDate
  const isDateValid = isStartDateValid && isEndDateValid

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
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)

              try {
                console.log("[v0] Starting anonymous tournament creation")
                console.log("[v0] Tournament data:", formData)

                const startDateTime = new Date(formData.start_date).toISOString()
                const endDateTime = new Date(formData.end_date).toISOString()

                const tournamentData = {
                  name: formData.name,
                  description: `${formData.settings.num_teams} teams, ${formData.settings.players_per_team} players each`,
                  tournament_type: "draft",
                  max_participants: maxParticipants,
                  team_based: formData.team_based,
                  max_teams: formData.max_teams,
                  entry_fee: 0,
                  start_date: startDateTime,
                  end_date: endDateTime,
                  game: formData.game,
                  player_pool_settings: {
                    ...formData.settings,
                    draft_mode: formData.settings.draft_mode,
                    signup_mode: formData.signup_mode,
                    allow_solo_players: formData.settings.allow_solo_players,
                    allow_premade_teams: formData.settings.allow_premade_teams,
                  },
                }

                console.log("[v0] Creating anonymous tournament:", tournamentData)

                const { tournamentService } = await import("@/lib/services/tournament-service")
                const tournament = await tournamentService.createTournament(tournamentData)

                console.log("[v0] Tournament created successfully:", tournament)

                router.push(`/tournaments/${tournament.id}/lobby`)

                toast({
                  title: "Tournament created!",
                  description: "Tournament is now available for players to join",
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
                <Label>Tournament Type</Label>
                <Select
                  value={formData.signup_mode}
                  onValueChange={(value: "solo" | "teams" | "hybrid") => {
                    const isTeamBased = value === "teams" || value === "hybrid"
                    setFormData({
                      ...formData,
                      signup_mode: value,
                      team_based: isTeamBased,
                      settings: {
                        ...formData.settings,
                        allow_solo_players: value === "solo" || value === "hybrid",
                        allow_premade_teams: value === "teams" || value === "hybrid",
                      },
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Solo Players Only
                        <span className="text-xs text-muted-foreground ml-2">Individual registration</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Hybrid Tournament
                        <span className="text-xs text-muted-foreground ml-2">Both solo & teams</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.signup_mode === "solo" && "Players join individually and are drafted into teams"}
                  {formData.signup_mode === "teams" && "Only premade teams can register for this tournament"}
                  {formData.signup_mode === "hybrid" && "Both individual players and premade teams can participate"}
                </p>
              </div>

              {(formData.signup_mode === "teams" || formData.signup_mode === "hybrid") && (
                <div className="space-y-2">
                  <Label>Maximum Teams</Label>
                  <Select
                    value={formData.max_teams.toString()}
                    onValueChange={(value) => setFormData({ ...formData, max_teams: Number.parseInt(value) })}
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

              {(formData.signup_mode === "solo" || formData.signup_mode === "hybrid") && (
                <div className="space-y-2">
                  <Label>Player Pool Size</Label>
                  <Select
                    value={formData.settings.max_pool_size.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, max_pool_size: Number.parseInt(value) },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[30, 40, 50, 60, 80, 100, 128].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {num} Players Maximum
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Maximum individual players in the draft pool</p>
                </div>
              )}

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

            <Card className={`${!isDateValid ? "bg-destructive/10 border-destructive" : "bg-muted/50"}`}>
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
                      <strong>{maxParticipants}</strong> players maximum can join
                    </p>
                    <p>
                      <strong>{formData.settings.num_teams}</strong> teams with{" "}
                      <strong>{formData.settings.players_per_team}</strong> players each
                    </p>
                    <p>
                      <strong>{formData.signup_mode.charAt(0).toUpperCase() + formData.signup_mode.slice(1)}</strong>{" "}
                      Tournament
                    </p>
                    {formData.team_based && (
                      <p>
                        <strong>Max Teams:</strong> {formData.max_teams} teams can register
                      </p>
                    )}
                    {(formData.signup_mode === "solo" || formData.signup_mode === "hybrid") && (
                      <p>
                        <strong>Player Pool:</strong> Up to {formData.settings.max_pool_size} individual players
                      </p>
                    )}

                    {!isDateValid && (
                      <div className="text-destructive font-medium">
                        ⚠️ <strong>DATE ERROR:</strong> Please fix the tournament dates
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={loading || !isDateValid} className="w-full" size="lg">
              {loading
                ? "Creating Tournament..."
                : !isDateValid
                  ? "Fix Tournament Dates First"
                  : "Create Tournament & Go to Lobby"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
