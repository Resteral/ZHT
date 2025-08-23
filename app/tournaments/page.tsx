"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, ArrowRight, Plus, Gavel, User, Clock, Zap, BarChart3 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

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
}

const gameIcons = {
  zealot_hockey: "🏒",
  call_of_duty: "🎯",
  rainbow_six_siege: "🛡️",
  counter_strike: "💥",
}

const gameNames = {
  zealot_hockey: "Zealot Hockey",
  call_of_duty: "Call of Duty",
  rainbow_six_siege: "Rainbow Six Siege",
  counter_strike: "Counter Strike",
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const { data: tournamentData } = await supabase
        .from("matches")
        .select("*")
        .eq("match_type", "tournament")
        .in("status", ["registration", "team_building", "active"])
        .order("created_at", { ascending: false })
        .limit(10)

      if (tournamentData) {
        const processedTournaments = tournamentData.map((tournament) => ({
          id: tournament.id,
          name: tournament.name || "Tournament",
          game: tournament.game || "zealot_hockey",
          max_teams: tournament.max_participants || 16,
          current_teams: tournament.current_participants || 0,
          entry_fee: tournament.entry_fee || 50,
          prize_pool: tournament.prize_pool || 800,
          start_date: tournament.start_date || new Date().toISOString(),
          status: tournament.status,
          format: tournament.tournament_format || "bracket",
          betting_enabled: tournament.betting_enabled || false,
          total_bets: tournament.total_bets || 0,
        }))
        setTournaments(processedTournaments)
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments & Leagues</h1>
          <p className="text-muted-foreground">
            Choose between team tournaments (3 days), solo leagues (extended play), or month-long draft championships
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Tournament & League Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Choose team tournaments, solo leagues, or draft championships • Earn $10 per game played • Win massive
              prize pools • Multiple formats and durations available
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold text-green-500">$10</div>
                <div className="text-xs text-muted-foreground">Per Game Played</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-500">3-30 Days</div>
                <div className="text-xs text-muted-foreground">Various Durations</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">Prize Pools</div>
                <div className="text-xs text-muted-foreground">Winners</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button asChild>
            <Link href="/auth/sign-up">
              <DollarSign className="h-4 w-4 mr-2" />
              Start with $25
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/draft/3v3">
              <Users className="h-4 w-4 mr-2" />
              Join Draft
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Tournaments</h2>
            <p className="text-muted-foreground">
              Join ongoing tournaments with different draft formats and prize pools
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="lg" variant="outline">
              <Link href="/tournaments/create?type=snake_draft">
                <Zap className="h-4 w-4 mr-2" />
                Create Snake Tournament
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tournaments/create?type=linear_draft">
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Linear Tournament
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <Zap className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-emerald-800">Snake Draft Tournament</CardTitle>
                    <CardDescription className="text-emerald-700">
                      Strategic drafting with reversing pick order
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                  $10K Prize Pool
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-emerald-700">64</div>
                  <div className="text-emerald-600 text-xs">Max Players</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-emerald-700">30</div>
                  <div className="text-emerald-600 text-xs">Days</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-emerald-700">Free</div>
                  <div className="text-emerald-600 text-xs">Entry</div>
                </div>
              </div>
              <p className="text-sm text-emerald-700">
                Strategic captain selection with snake draft mechanics. Lower ELO captain gets first pick advantage.
              </p>
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Link href="/tournaments/snake-draft">
                  <Zap className="h-4 w-4 mr-2" />
                  Join Snake Draft Tournament
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
                    <CardTitle className="text-blue-800">Linear Draft Tournament</CardTitle>
                    <CardDescription className="text-blue-700">
                      Consistent pick order strategy tournament
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  $8K Prize Pool
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-700">48</div>
                  <div className="text-blue-600 text-xs">Max Players</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-700">30</div>
                  <div className="text-blue-600 text-xs">Days</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-700">Free</div>
                  <div className="text-blue-600 text-xs">Entry</div>
                </div>
              </div>
              <p className="text-sm text-blue-700">
                Master consistent draft positioning. Same pick order every round - strategy and skill determine success.
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/tournaments/linear-draft">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Join Linear Draft Tournament
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="team-tournaments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team-tournaments">Team Tournaments</TabsTrigger>
          <TabsTrigger value="solo-leagues">Solo Leagues</TabsTrigger>
          <TabsTrigger value="marketplace">Team Marketplace</TabsTrigger>
          <TabsTrigger value="brackets">Live Brackets</TabsTrigger>
        </TabsList>

        <TabsContent value="team-tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Team Tournaments</h2>
              <p className="text-muted-foreground">3-day tournaments with team building and competitive brackets</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="lg" variant="outline">
                <Link href="/tournaments/create?type=snake_draft">
                  <Zap className="h-4 w-4 mr-2" />
                  Snake Draft
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tournaments/create?type=linear_draft">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Linear Draft
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/tournaments/create?type=team">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team Tournament
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
              <h3 className="text-lg font-semibold mb-2">No tournaments available</h3>
              <p className="text-sm mb-4">Check back later for new tournaments!</p>
              <Button asChild>
                <Link href="/tournaments/create?type=team">
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
                          <span className="text-2xl">{gameIcons[tournament.game as keyof typeof gameIcons]}</span>
                          {tournament.name}
                        </CardTitle>
                        <CardDescription>{gameNames[tournament.game as keyof typeof gameNames]}</CardDescription>
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
                          Team
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {tournament.current_teams}/{tournament.max_teams} teams
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
                        <span>3 days</span>
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
                        <span>Teams registered</span>
                        <span>
                          {tournament.current_teams}/{tournament.max_teams}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(tournament.current_teams / tournament.max_teams) * 100}%` }}
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

        <TabsContent value="solo-leagues" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Solo Leagues</h2>
              <p className="text-muted-foreground">Extended league play for individual competition</p>
            </div>
            <Button asChild size="lg">
              <Link href="/tournaments/create?type=solo">
                <Plus className="h-4 w-4 mr-2" />
                Create Solo League
              </Link>
            </Button>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Solo League Play</h3>
                <p className="text-sm text-muted-foreground">
                  Individual competition • Extended seasons • ELO-based matchmaking • $10 per game played
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-500">Extended</div>
                <div className="text-xs text-muted-foreground">League Duration</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Solo ELO League
                    </CardTitle>
                    <CardDescription>Individual competitive play with ELO rankings</CardDescription>
                  </div>
                  <Badge variant="secondary">Open</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Extended season • $10 per game • ELO matchmaking</div>
                  <Button asChild>
                    <Link href="/draft/1v1">Join Solo League</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Tournament Team Marketplace</h3>
                <p className="text-sm text-muted-foreground">
                  Build championship teams • Spend tournament winnings • Premium players and power-ups • Live auctions
                  for tournament preparation
                </p>
              </div>
            </div>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Marketplace Coming Soon</h3>
            <p className="text-sm">Team marketplace functionality will be available soon!</p>
          </div>
        </TabsContent>

        <TabsContent value="brackets">
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Live Brackets Coming Soon</h3>
            <p className="text-sm">Tournament bracket functionality will be available soon!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
