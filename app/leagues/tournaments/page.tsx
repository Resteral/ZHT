"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Trophy, Users, DollarSign, Gavel, Clock, Star } from "lucide-react"
import Link from "next/link"

interface MonthLongTournament {
  id: string
  name: string
  description: string
  duration_days: number
  max_teams: number
  current_teams: number
  team_buy_in: number
  auction_budget: number
  prize_pool: number
  status: string
  registration_opens: string
  registration_closes: string
  auction_date: string
  tournament_start: string
  created_at: string
}

export default function MonthLongTournamentsPage() {
  const [tournaments, setTournaments] = useState<MonthLongTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    try {
      const mockTournaments: MonthLongTournament[] = [
        {
          id: "1",
          name: "Winter Championship Series",
          description: "Month-long tournament with team purchasing and weekly matches",
          duration_days: 30,
          max_teams: 16,
          current_teams: 12,
          team_buy_in: 100,
          auction_budget: 1000,
          prize_pool: 1280,
          status: "registration",
          registration_opens: "2024-03-01T00:00:00Z",
          registration_closes: "2024-03-15T23:59:59Z",
          auction_date: "2024-03-16T19:00:00Z",
          tournament_start: "2024-03-18T00:00:00Z",
          created_at: "2024-02-15T10:00:00Z",
        },
        {
          id: "2",
          name: "Spring Elite League",
          description: "Premium tournament with high stakes and professional players",
          duration_days: 60,
          max_teams: 12,
          current_teams: 8,
          team_buy_in: 250,
          auction_budget: 2000,
          prize_pool: 2400,
          status: "auction_phase",
          registration_opens: "2024-02-01T00:00:00Z",
          registration_closes: "2024-02-28T23:59:59Z",
          auction_date: "2024-03-01T20:00:00Z",
          tournament_start: "2024-03-05T00:00:00Z",
          created_at: "2024-01-15T10:00:00Z",
        },
      ]

      setTournaments(mockTournaments)
    } catch (error) {
      console.error("Error loading tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "secondary"
      case "auction_phase":
        return "default"
      case "active":
        return "default"
      case "completed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "registration":
        return "Registration Open"
      case "auction_phase":
        return "Auction Phase"
      case "active":
        return "Tournament Active"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">Loading tournaments...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Month-Long Tournaments</h1>
            <p className="text-muted-foreground">
              Host and join extended tournaments with team purchasing and league drafts
            </p>
          </div>
          <Button asChild>
            <Link href="/leagues/tournaments/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Link>
          </Button>
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">How Month-Long Tournaments Work</h3>
              <p className="text-sm text-muted-foreground">
                Buy team slots • Participate in league drafts • Compete over weeks/months • Win prize pools based on
                performance
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-500">$100+</div>
              <div className="text-xs text-muted-foreground">typical buy-in</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Tournaments</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments
                .filter((t) => t.status === "registration" || t.status === "auction_phase" || t.status === "active")
                .map((tournament) => (
                  <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            {tournament.name}
                          </CardTitle>
                          <CardDescription>{tournament.description}</CardDescription>
                        </div>
                        <Badge variant={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
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
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.duration_days} days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.team_buy_in} buy-in</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gavel className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.auction_budget} budget</span>
                        </div>
                      </div>

                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">Prize Pool</span>
                          <span className="text-lg font-bold text-green-600">${tournament.prize_pool}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Teams filled</span>
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

                      <div className="space-y-2 text-xs text-muted-foreground">
                        {tournament.status === "registration" && (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                Registration closes: {new Date(tournament.registration_closes).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Gavel className="h-3 w-3" />
                              <span>Auction: {new Date(tournament.auction_date).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                        {tournament.status === "auction_phase" && (
                          <div className="flex items-center gap-2">
                            <Gavel className="h-3 w-3 text-amber-500" />
                            <span className="text-amber-600">Auction in progress!</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/leagues/tournaments/${tournament.id}`}>
                            {tournament.status === "registration"
                              ? "Buy Team Slot"
                              : tournament.status === "auction_phase"
                                ? "Join Auction"
                                : "View Tournament"}
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/leagues/tournaments/${tournament.id}/details`}>Details</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {tournaments.filter(
              (t) => t.status === "registration" || t.status === "auction_phase" || t.status === "active",
            ).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No active tournaments</h3>
                <p className="text-sm mb-4">Create the first month-long tournament!</p>
                <Button asChild>
                  <Link href="/leagues/tournaments/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No upcoming tournaments</h3>
              <p className="text-sm">Tournaments will appear here when scheduled for the future</p>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No completed tournaments</h3>
              <p className="text-sm">Completed tournaments and their results will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
