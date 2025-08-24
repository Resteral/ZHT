"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, Plus, Gavel, Clock, Zap, BarChart3 } from "lucide-react"
import Link from "next/link"
import { tournamentService } from "@/lib/services/tournament-service"

interface Tournament {
  id: string
  name: string
  game: string
  max_teams: number
  current_teams: number
  entry_fee: number
  prize_pool: number
  start_date: string
  status: string
  format: string
  betting_enabled: boolean
  total_bets: number
  player_pool_size?: number
  max_player_pool?: number
  registration_open?: boolean
  tournament_type?: string
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      console.log("[v0] Fetching tournaments using tournament service...")

      const tournamentData = await tournamentService.getTournaments()

      console.log("[v0] Raw tournament data:", tournamentData)

      if (tournamentData) {
        const processedTournaments = tournamentData.map((tournament) => ({
          id: tournament.id,
          name: tournament.name || "Tournament",
          game: tournament.game || "zealot_hockey",
          max_teams: tournament.max_teams || 16,
          current_teams: tournament.participant_count || 0,
          entry_fee: tournament.entry_fee || 0,
          prize_pool: tournament.prize_pool || 1000,
          start_date: tournament.start_date || tournament.created_at || new Date().toISOString(),
          status: tournament.status || "registration",
          format: "bracket", // Default format
          betting_enabled: false, // Default betting
          total_bets: 0,
          player_pool_size: tournament.participant_count || 0,
          max_player_pool: tournament.max_participants || 64,
          registration_open: tournament.status === "registration" || tournament.status === "draft",
          tournament_type: tournament.tournament_type || "snake_draft",
        }))

        console.log("[v0] Processed tournaments:", processedTournaments)
        setTournaments(processedTournaments)
      }
    } catch (error) {
      console.error("[v0] Error fetching tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Create and join tournaments with Snake Draft, Linear Draft, and Auction formats
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Tournament Formats</h3>
            <p className="text-sm text-muted-foreground">
              Choose from Snake Draft, Linear Draft, or Auction tournaments • Strategic drafting • Competitive brackets
              • Prize pools up to $50K
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold text-green-500">$50K</div>
                <div className="text-xs text-muted-foreground">Max Prize Pool</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-500">3 Formats</div>
                <div className="text-xs text-muted-foreground">Draft Types</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">Live Brackets</div>
                <div className="text-xs text-muted-foreground">Real-time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-full">
                  <Zap className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-emerald-800">Snake Draft</CardTitle>
                  <CardDescription className="text-emerald-700">Reversing pick order strategy</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-emerald-700">
              Strategic captain selection with snake draft mechanics. Lower ELO captains get first pick advantage.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">Entry: Free</span>
              <span className="text-emerald-600">Prize: Up to $10K</span>
            </div>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href="/tournaments/create?type=snake_draft">
                <Zap className="h-4 w-4 mr-2" />
                Create Snake Tournament
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-blue-800">Linear Draft</CardTitle>
                  <CardDescription className="text-blue-700">Consistent pick order strategy</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-700">
              Master consistent draft positioning. Same pick order every round - strategy and skill determine success.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600">Entry: Free</span>
              <span className="text-blue-600">Prize: Up to $8K</span>
            </div>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link href="/tournaments/create?type=linear_draft">
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Linear Tournament
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-full">
                  <Gavel className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-purple-800">Auction Draft</CardTitle>
                  <CardDescription className="text-purple-700">Bidding-based player selection</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-purple-700">
              Budget management meets strategy. Bid on players with limited funds to build the ultimate team.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-600">Entry: $25</span>
              <span className="text-purple-600">Prize: Up to $50K</span>
            </div>
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/tournaments/create?type=auction_draft">
                <Gavel className="h-4 w-4 mr-2" />
                Create Auction Tournament
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active-tournaments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-tournaments">Active Tournaments</TabsTrigger>
          <TabsTrigger value="snake-draft">Snake Draft</TabsTrigger>
          <TabsTrigger value="linear-draft">Linear Draft</TabsTrigger>
          <TabsTrigger value="auction-draft">Auction Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="active-tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Active Tournaments</h2>
              <p className="text-muted-foreground">
                Join ongoing tournaments with different draft formats and prize pools
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="lg">
                <Link href="/tournaments/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No active tournaments</h3>
              <p className="text-sm mb-4">Create a new tournament to get started!</p>
              <Button asChild>
                <Link href="/tournaments/create?type=snake_draft">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-2xl">{tournament.game}</span>
                          {tournament.name}
                        </CardTitle>
                        <CardDescription>{tournament.tournament_type?.replace("_", " ").toUpperCase()}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            tournament.status === "registration"
                              ? "secondary"
                              : tournament.status === "team_building"
                                ? "default"
                                : "outline"
                          }
                        >
                          {tournament.status === "registration"
                            ? "Open"
                            : tournament.status === "team_building"
                              ? "Team Building"
                              : "Live"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {tournament.tournament_type === "team" ? "Team" : "Player"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {tournament.tournament_type === "snake_draft" || tournament.tournament_type === "linear_draft"
                            ? `${tournament.player_pool_size}/${tournament.max_player_pool} players`
                            : `${tournament.current_teams}/${tournament.max_teams} teams`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span>{tournament.format}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>${tournament.prize_pool} prize</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{tournament.registration_open ? "Registration Open" : "Registration Closed"}</span>
                      </div>
                    </div>

                    {tournament.betting_enabled && (
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-green-600 font-medium">
                            <DollarSign className="h-3 w-3 inline mr-1" />
                            Betting Available
                          </p>
                          <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {tournament.tournament_type === "snake_draft" || tournament.tournament_type === "linear_draft"
                            ? "Players registered"
                            : "Teams registered"}
                        </span>
                        <span>
                          {tournament.tournament_type === "snake_draft" || tournament.tournament_type === "linear_draft"
                            ? `${tournament.player_pool_size}/${tournament.max_player_pool}`
                            : `${tournament.current_teams}/${tournament.max_teams}`}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              tournament.tournament_type === "snake_draft" ||
                              tournament.tournament_type === "linear_draft"
                                ? (tournament.player_pool_size! / tournament.max_player_pool!) * 100
                                : (tournament.current_teams / tournament.max_teams) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/tournaments/${tournament.id}`}>
                          {tournament.status === "registration"
                            ? "Join Tournament"
                            : tournament.status === "team_building"
                              ? "Build Team"
                              : "View Bracket"}
                        </Link>
                      </Button>
                      {tournament.betting_enabled && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/betting?tournament=${tournament.id}`}>
                            <DollarSign className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="snake-draft" className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Snake Draft Tournaments</h3>
                <p className="text-sm text-muted-foreground">
                  Strategic drafting with reversing pick order • Lower ELO captains get first pick advantage • Free
                  entry with prize pools up to $10K
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.filter((t) => t.tournament_type === "snake_draft").length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Snake Draft tournaments</h3>
                <p className="text-sm mb-4">Create the first Snake Draft tournament!</p>
                <Button asChild>
                  <Link href="/tournaments/create?type=snake_draft">
                    <Zap className="h-4 w-4 mr-2" />
                    Create Snake Tournament
                  </Link>
                </Button>
              </div>
            ) : (
              tournaments
                .filter((t) => t.tournament_type === "snake_draft")
                .map((tournament) => (
                  <Card key={tournament.id} className="border-emerald-200 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-full">
                            <Zap className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <CardTitle className="text-emerald-800">{tournament.name}</CardTitle>
                            <CardDescription>{tournament.game}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              tournament.status === "registration"
                                ? "secondary"
                                : tournament.status === "team_building"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {tournament.status === "registration"
                              ? "Open"
                              : tournament.status === "team_building"
                                ? "Team Building"
                                : "Live"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {tournament.tournament_type === "team" ? "Team" : "Player"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool} players`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.format}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.registration_open ? "Registration Open" : "Registration Closed"}</span>
                        </div>
                      </div>

                      {tournament.betting_enabled && (
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">
                              <DollarSign className="h-3 w-3 inline mr-1" />
                              Betting Available
                            </p>
                            <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Players registered</span>
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool}`}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(tournament.player_pool_size! / tournament.max_player_pool!) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/tournaments/${tournament.id}`}>
                            {tournament.status === "registration"
                              ? "Join Tournament"
                              : tournament.status === "team_building"
                                ? "Build Team"
                                : "View Bracket"}
                          </Link>
                        </Button>
                        {tournament.betting_enabled && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/betting?tournament=${tournament.id}`}>
                              <DollarSign className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="linear-draft" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Linear Draft Tournaments</h3>
                <p className="text-sm text-muted-foreground">
                  Consistent pick order strategy • Same draft position every round • Free entry with prize pools up to
                  $8K
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.filter((t) => t.tournament_type === "linear_draft").length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Linear Draft tournaments</h3>
                <p className="text-sm mb-4">Create the first Linear Draft tournament!</p>
                <Button asChild>
                  <Link href="/tournaments/create?type=linear_draft">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Linear Tournament
                  </Link>
                </Button>
              </div>
            ) : (
              tournaments
                .filter((t) => t.tournament_type === "linear_draft")
                .map((tournament) => (
                  <Card key={tournament.id} className="border-blue-200 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-full">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-blue-800">{tournament.name}</CardTitle>
                            <CardDescription>{tournament.game}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              tournament.status === "registration"
                                ? "secondary"
                                : tournament.status === "team_building"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {tournament.status === "registration"
                              ? "Open"
                              : tournament.status === "team_building"
                                ? "Team Building"
                                : "Live"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {tournament.tournament_type === "team" ? "Team" : "Player"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool} players`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.format}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.registration_open ? "Registration Open" : "Registration Closed"}</span>
                        </div>
                      </div>

                      {tournament.betting_enabled && (
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">
                              <DollarSign className="h-3 w-3 inline mr-1" />
                              Betting Available
                            </p>
                            <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Players registered</span>
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool}`}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(tournament.player_pool_size! / tournament.max_player_pool!) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/tournaments/${tournament.id}`}>
                            {tournament.status === "registration"
                              ? "Join Tournament"
                              : tournament.status === "team_building"
                                ? "Build Team"
                                : "View Bracket"}
                          </Link>
                        </Button>
                        {tournament.betting_enabled && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/betting?tournament=${tournament.id}`}>
                              <DollarSign className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="auction-draft" className="space-y-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Auction Draft Tournaments</h3>
                <p className="text-sm text-muted-foreground">
                  Bidding-based player selection • Budget management strategy • $25 entry fee with prize pools up to
                  $50K
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.filter((t) => t.tournament_type === "auction_draft").length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Auction Draft tournaments</h3>
                <p className="text-sm mb-4">Create the first Auction Draft tournament!</p>
                <Button asChild>
                  <Link href="/tournaments/create?type=auction_draft">
                    <Gavel className="h-4 w-4 mr-2" />
                    Create Auction Tournament
                  </Link>
                </Button>
              </div>
            ) : (
              tournaments
                .filter((t) => t.tournament_type === "auction_draft")
                .map((tournament) => (
                  <Card key={tournament.id} className="border-purple-200 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-full">
                            <Gavel className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-purple-800">{tournament.name}</CardTitle>
                            <CardDescription>{tournament.game}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              tournament.status === "registration"
                                ? "secondary"
                                : tournament.status === "team_building"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {tournament.status === "registration"
                              ? "Open"
                              : tournament.status === "team_building"
                                ? "Team Building"
                                : "Live"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {tournament.tournament_type === "team" ? "Team" : "Player"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool} players`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.format}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.registration_open ? "Registration Open" : "Registration Closed"}</span>
                        </div>
                      </div>

                      {tournament.betting_enabled && (
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">
                              <DollarSign className="h-3 w-3 inline mr-1" />
                              Betting Available
                            </p>
                            <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Players registered</span>
                          <span>{`${tournament.player_pool_size}/${tournament.max_player_pool}`}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(tournament.player_pool_size! / tournament.max_player_pool!) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/tournaments/${tournament.id}`}>
                            {tournament.status === "registration"
                              ? "Join Tournament"
                              : tournament.status === "team_building"
                                ? "Build Team"
                                : "View Bracket"}
                          </Link>
                        </Button>
                        {tournament.betting_enabled && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/betting?tournament=${tournament.id}`}>
                              <DollarSign className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
