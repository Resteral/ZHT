"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trophy, Users, Calendar, DollarSign } from "lucide-react"
import { TournamentCard } from "./tournament-card"
import { tournamentService } from "@/lib/services/tournament-service"
import { useRouter } from "next/navigation"

interface Tournament {
  id: string
  name: string
  description: string
  tournament_type: string
  max_participants: number
  entry_fee: number
  prize_pool: number
  status: string
  start_date: string
  participant_count: number
}

export function TournamentDashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getTournaments()
      setTournaments(data)
    } catch (error) {
      console.error("Error loading tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  const activeTournaments = tournaments.filter((t) => t.status === "in_progress")
  const upcomingTournaments = tournaments.filter((t) => t.status === "registration")
  const completedTournaments = tournaments.filter((t) => t.status === "completed")

  if (loading) {
    return <div className="text-center py-8">Loading tournaments...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTournaments.length}</div>
            {activeTournaments.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Next draft: {(() => {
                  const nextDraft = activeTournaments
                    .filter((t) => new Date(t.start_date) > new Date())
                    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]

                  if (nextDraft) {
                    const hours = Math.floor(
                      (new Date(nextDraft.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60),
                    )
                    return hours > 24 ? `${Math.floor(hours / 24)}d` : `${hours}h`
                  }
                  return "None scheduled"
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournaments.reduce((sum, t) => sum + t.participant_count, 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTournaments.length}</div>
            {upcomingTournaments.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Next starts: {(() => {
                  const nextTournament = upcomingTournaments.sort(
                    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
                  )[0]

                  const hours = Math.floor(
                    (new Date(nextTournament.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60),
                  )
                  return hours > 24 ? `${Math.floor(hours / 24)}d` : `${hours}h`
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prize Pool</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tournaments.reduce((sum, t) => sum + t.prize_pool, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active ({activeTournaments.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingTournaments.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTournaments.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-4">
          {activeTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active tournaments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming tournaments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No completed tournaments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
