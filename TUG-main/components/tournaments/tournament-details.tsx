"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Users, Calendar, DollarSign } from "lucide-react"
import { TournamentBracket } from "./tournament-bracket"
import { TournamentParticipants } from "./tournament-participants"
import { TournamentTeams } from "./tournament-teams"
import { tournamentService } from "@/lib/services/tournament-service"
import { UnifiedTournamentJoin } from "./unified-tournament-join"

interface TournamentDetailsProps {
  tournamentId: string
}

export function TournamentDetails({ tournamentId }: TournamentDetailsProps) {
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournament()
  }, [tournamentId])

  const loadTournament = async () => {
    try {
      const data = await tournamentService.getTournament(tournamentId)
      setTournament(data)
    } catch (error) {
      console.error("Error loading tournament:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading tournament...</div>
  }

  if (!tournament) {
    return <div className="text-center py-8">Tournament not found</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "bg-blue-500"
      case "in_progress":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <Badge className={getStatusColor(tournament.status)}>
                  {tournament.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="text-base">{tournament.description}</CardDescription>
            </div>

            <UnifiedTournamentJoin tournamentId={tournamentId} />
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {tournament.tournament_type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="font-medium">
                  {tournament.participant_count}/{tournament.max_participants}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Draft Start Time</p>
                <p className="font-medium">{new Date(tournament.start_date).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Games start after draft</p>
                {tournament.status === "registration" && (
                  <p className="text-xs text-blue-600 mt-1">
                    {(() => {
                      const startTime = new Date(tournament.start_date).getTime()
                      const now = new Date().getTime()
                      const difference = startTime - now

                      if (difference > 0) {
                        const hours = Math.floor(difference / (1000 * 60 * 60))
                        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

                        if (hours < 24) {
                          return `Draft starts in ${hours}h ${minutes}m`
                        } else {
                          const days = Math.floor(hours / 24)
                          return `Draft starts in ${days}d ${hours % 24}h`
                        }
                      } else {
                        return "Draft starting now!"
                      }
                    })()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="font-medium">${tournament.prize_pool.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {tournament.entry_fee > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Entry Fee:</strong> ${tournament.entry_fee}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament Content */}
      <Tabs defaultValue="bracket" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bracket">Live Bracket</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="participants">Players ({tournament.participant_count})</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket">
          <TournamentBracket tournamentId={tournamentId} tournament={tournament} />
        </TabsContent>

        <TabsContent value="teams">
          <TournamentTeams tournamentId={tournamentId} tournament={tournament} />
        </TabsContent>

        <TabsContent value="participants">
          <TournamentParticipants tournamentId={tournamentId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
