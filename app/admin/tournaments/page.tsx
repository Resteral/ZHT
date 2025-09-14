"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Users, Calendar, Target, Search, Edit, Eye, Copy } from "lucide-react"
import Link from "next/link"
import { tournamentService } from "@/lib/services/tournament-service"

interface Tournament {
  id: string
  name: string
  game: string
  status: string
  participant_count: number
  prize_pool: number
  start_date: string
  end_date: string
  tournament_type: string
  max_participants: number
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    active: 0,
    totalParticipants: 0,
    totalPrizePool: 0,
    endingSoon: 0,
  })

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      console.log("[v0] Admin page fetching tournaments...")
      const data = await tournamentService.getTournaments()
      console.log("[v0] Admin page received tournaments:", data.length)

      setTournaments(data)

      // Calculate stats from real data
      const activeTournaments = data.filter(
        (t) => t.status === "registration" || t.status === "in_progress" || t.status === "drafting",
      )
      const totalParticipants = data.reduce((sum, t) => sum + (t.participant_count || 0), 0)
      const totalPrizePool = data.reduce((sum, t) => sum + (t.prize_pool || 0), 0)
      const endingSoon = data.filter((t) => {
        const endDate = new Date(t.end_date)
        const now = new Date()
        const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return daysUntilEnd <= 7 && daysUntilEnd > 0
      }).length

      setStats({
        active: activeTournaments.length,
        totalParticipants,
        totalPrizePool,
        endingSoon,
      })
    } catch (error) {
      console.error("[v0] Error fetching tournaments in admin page:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateTournament = (tournament: Tournament) => {
    // Create URL parameters with tournament settings for duplication
    const params = new URLSearchParams({
      duplicate: "true",
      sourceId: tournament.id,
      name: `${tournament.name} (Copy)`,
      game: tournament.game || "zealot_hockey",
      // Add other tournament settings that should be copied
      maxParticipants: tournament.max_participants?.toString() || "32",
      prizePool: tournament.prize_pool?.toString() || "0",
      tournamentType: tournament.tournament_type || "draft",
    })

    // Navigate to tournament creation with pre-filled data
    window.location.href = `/tournaments/create?${params.toString()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "secondary"
      case "drafting":
        return "default"
      case "in_progress":
        return "default"
      case "completed":
        return "outline"
      default:
        return "destructive"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "registration":
        return "Registration"
      case "drafting":
        return "Drafting"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournament Management</h1>
          <p className="text-muted-foreground">Create and manage tournaments across all games</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      {/* Tournament Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">Across all tournaments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPrizePool}</div>
            <p className="text-xs text-muted-foreground">Total active prizes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ending Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.endingSoon}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search tournaments..." className="w-full pl-10 pr-4 py-2 border rounded-md" />
              </div>
            </div>
            <select className="px-3 py-2 border rounded-md">
              <option>All Games</option>
              <option>Counter Strike</option>
              <option>Rainbow Six Siege</option>
              <option>Call of Duty</option>
              <option>Zealot Hockey</option>
            </select>
            <select className="px-3 py-2 border rounded-md">
              <option>All Status</option>
              <option>Registration</option>
              <option>Drafting</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tournament List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
          <CardDescription>Manage existing tournaments and their settings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
              <p className="text-sm mb-4">Create your first tournament to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tournament.game} • {tournament.participant_count}/{tournament.max_participants} participants •{" "}
                        {new Date(tournament.start_date).toLocaleDateString()} to{" "}
                        {new Date(tournament.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusColor(tournament.status)}>{getStatusLabel(tournament.status)}</Badge>
                    <span className="font-semibold text-green-600">${tournament.prize_pool}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tournaments/${tournament.id}/manage`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tournaments/${tournament.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateTournament(tournament)}
                        title="Create tournament with same settings"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
