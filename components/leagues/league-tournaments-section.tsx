"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Clock, DollarSign } from "lucide-react"
import Link from "next/link"
import { tournamentService } from "@/lib/services/tournament-service"

interface LeagueTournament {
  id: string
  name: string
  description: string
  tournament_type: string
  status: string
  max_participants: number
  participant_count: number
  entry_fee: number
  prize_pool: number
  start_date: string
  end_date: string
  duration_days: number
  created_at: string
}

export function LeagueTournamentsSection() {
  const [leagueTournaments, setLeagueTournaments] = useState<LeagueTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeagueTournaments()
  }, [])

  const loadLeagueTournaments = async () => {
    try {
      console.log("[v0] Loading league tournaments for ZHL League section...")
      const tournaments = await tournamentService.getLeagueTournaments()
      setLeagueTournaments(tournaments)
      console.log("[v0] Loaded league tournaments:", tournaments.length)
    } catch (error) {
      console.error("[v0] Error loading league tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "secondary"
      case "active":
      case "in_progress":
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
      case "active":
      case "in_progress":
        return "Tournament Active"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {leagueTournaments.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {leagueTournaments.map((tournament) => (
            <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-blue-500" />
                      {tournament.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{tournament.description}</p>
                  </div>
                  <Badge variant={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {tournament.participant_count}/{tournament.max_participants} players
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{tournament.duration_days} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${tournament.entry_fee} entry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span>${tournament.prize_pool} prize</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Prize Pool</span>
                    <span className="text-lg font-bold text-blue-600">${tournament.prize_pool}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Participants</span>
                    <span>
                      {tournament.participant_count}/{tournament.max_participants}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(tournament.participant_count / tournament.max_participants) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Started: {new Date(tournament.start_date).toLocaleDateString()}</span>
                  </div>
                  {tournament.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Ends: {new Date(tournament.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/tournaments/${tournament.id}`}>
                      {tournament.status === "registration"
                        ? "Join League"
                        : tournament.status === "active" || tournament.status === "in_progress"
                          ? "View League"
                          : "View Results"}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}/details`}>Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Long Tournaments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-500" />
                Active ZHL League Tournaments
              </CardTitle>
              <p className="text-sm text-muted-foreground">Currently running long-term tournaments</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">No Active League Tournaments</p>
                <p className="text-sm">Create the first ZHL league tournament to get started</p>
                <Button asChild className="mt-4">
                  <Link href="/tournaments/create?type=long">
                    <Trophy className="h-4 w-4 mr-2" />
                    Create League Tournament
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* League Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                ZHL League Statistics
              </CardTitle>
              <p className="text-sm text-muted-foreground">Your performance in ZHL league tournaments</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">No League Statistics Yet</p>
                <p className="text-sm">Join your first ZHL league tournament to start tracking your performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
