"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, Plus, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { monthLongTournamentService } from "@/lib/services/month-long-tournament-service"
import { toast } from "react-toastify"

interface Tournament {
  id: string
  name: string
  game: string
  max_participants: number
  current_participants: number
  entry_fee: number
  prize_pool: number
  start_date: string
  end_date: string
  status: string
  tournament_type: string
  duration_days: number
  phases: any[]
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        console.log("[v0] Fetching tournaments and user data...")

        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const [userResult, tournamentResult] = await Promise.all([
          supabase.auth.getUser(),
          monthLongTournamentService.getMonthLongTournaments(),
        ])

        setUser(userResult.data.user)

        if (tournamentResult && Array.isArray(tournamentResult)) {
          console.log("[v0] Setting tournaments:", tournamentResult.length)
          setTournaments(tournamentResult)
        } else {
          console.log("[v0] No tournaments found")
          setTournaments([])
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        setTournaments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const joinTournament = async (tournamentId: string) => {
    if (!user) {
      toast.error("Please sign in to join tournaments")
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { data: existingParticipant } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single()

      if (existingParticipant) {
        toast.error("You're already registered for this tournament!")
        return
      }

      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        elo_rating: 1200,
      })

      if (error) throw error

      toast.success("Successfully joined tournament!")

      const tournamentResult = await monthLongTournamentService.getMonthLongTournaments()
      if (tournamentResult && Array.isArray(tournamentResult)) {
        setTournaments(tournamentResult)
      }
    } catch (error) {
      console.error("Error joining tournament:", error)
      toast.error("Failed to join tournament. Please try again.")
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">Create custom tournaments with flexible settings and formats</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-8 mb-6">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
            <Plus className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Create Your Tournament</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Design tournaments with custom lengths, draft types, bracket styles, and start dates. Set your pool size,
              team count, and players per team for the perfect competition.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Custom Duration (1-365 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Multiple Draft Types</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Flexible Team Sizes</span>
            </div>
          </div>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/tournaments/create">
              <Plus className="h-5 w-5 mr-2" />
              Create Tournament
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active-tournaments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active-tournaments">Active Tournaments</TabsTrigger>
          <TabsTrigger value="completed">Completed Tournaments</TabsTrigger>
        </TabsList>

        <TabsContent value="active-tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Active Tournaments</h2>
              <p className="text-muted-foreground">Join ongoing tournaments or create your own</p>
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
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tournaments yet - be the first!</h3>
              <div className="max-w-md mx-auto space-y-3 mb-6">
                <p className="text-sm">
                  <strong>Ready to create tournaments with:</strong>
                </p>
                <div className="text-xs space-y-1 text-left bg-muted/50 p-3 rounded-lg">
                  <div>✅ Custom tournament lengths (1-365 days)</div>
                  <div>✅ Snake, Linear, or Auction draft types</div>
                  <div>✅ Single/Double elimination or Round Robin brackets</div>
                  <div>✅ Flexible team sizes and player pools</div>
                  <div>✅ Custom start dates and scheduling</div>
                </div>
              </div>
              <Button asChild size="lg">
                <Link href="/tournaments/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tournament
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments
                .filter((t) => t.status !== "completed")
                .map((tournament) => (
                  <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {tournament.name}
                          </CardTitle>
                          <CardDescription>
                            {tournament.duration_days} days •{" "}
                            {tournament.tournament_type?.replace("_", " ").toUpperCase()}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              tournament.status === "registration"
                                ? "secondary"
                                : tournament.status === "in_progress"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {tournament.status === "registration"
                              ? "Registration"
                              : tournament.status === "in_progress"
                                ? "In Progress"
                                : "Completed"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {tournament.current_participants}/{tournament.max_participants} players
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.duration_days} days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.phases?.length || 0} phases</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Participants</span>
                          <span>
                            {tournament.current_participants}/{tournament.max_participants}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${(tournament.current_participants / tournament.max_participants) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {tournament.status === "registration_open" ? (
                          <div className="flex gap-2 w-full">
                            <Button
                              onClick={() => joinTournament(tournament.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={tournament.current_participants >= tournament.max_participants}
                            >
                              {tournament.current_participants >= tournament.max_participants ? "Full" : "Join Now"}
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/tournaments/${tournament.id}`}>View Details</Link>
                            </Button>
                          </div>
                        ) : (
                          <Button asChild className="flex-1">
                            <Link href={`/tournaments/${tournament.id}`}>
                              {tournament.status === "registration"
                                ? "Join Tournament"
                                : tournament.status === "in_progress"
                                  ? "View Progress"
                                  : "View Results"}
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

        <TabsContent value="completed" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Completed Tournaments</h2>
              <p className="text-muted-foreground">View results from finished tournaments</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.filter((t) => t.status === "completed").length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No completed tournaments yet</h3>
                <p className="text-sm mb-4">Create and complete tournaments to see results here!</p>
              </div>
            ) : (
              tournaments
                .filter((t) => t.status === "completed")
                .map((tournament) => (
                  <Card key={tournament.id} className="hover:shadow-lg transition-shadow opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            {tournament.name}
                          </CardTitle>
                          <CardDescription>
                            {tournament.duration_days} days •{" "}
                            {tournament.tournament_type?.replace("_", " ").toUpperCase()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">Completed</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.current_participants} players</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.duration_days} days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.phases?.length || 0} phases</span>
                        </div>
                      </div>

                      <Button asChild className="w-full bg-transparent" variant="outline">
                        <Link href={`/tournaments/${tournament.id}`}>View Results</Link>
                      </Button>
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
