"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"

interface Participant {
  id: string
  user_id: string
  team_name: string
  seed: number
  status: string
  joined_at: string
  user_profile?: {
    username: string
    elo_rating: number
  }
}

interface TournamentParticipantsProps {
  tournamentId: string
}

export function TournamentParticipants({ tournamentId }: TournamentParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParticipants()
  }, [tournamentId])

  const loadParticipants = async () => {
    try {
      const data = await tournamentService.getParticipants(tournamentId)
      setParticipants(data)
    } catch (error) {
      console.error("Error loading participants:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "winner":
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case "eliminated":
        return <Medal className="h-4 w-4 text-gray-500" />
      default:
        return <Award className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "winner":
        return "bg-yellow-500"
      case "eliminated":
        return "bg-gray-500"
      default:
        return "bg-blue-500"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading participants...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Participants</CardTitle>
      </CardHeader>

      <CardContent>
        {participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No participants yet</div>
        ) : (
          <div className="space-y-3">
            {participants
              .sort((a, b) => a.seed - b.seed)
              .map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{participant.seed}</span>
                      {getStatusIcon(participant.status)}
                    </div>

                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{participant.team_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium">{participant.team_name}</p>
                      {participant.user_profile && (
                        <p className="text-sm text-muted-foreground">
                          @{participant.user_profile.username} • ELO: {participant.user_profile.elo_rating}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(participant.status)}>
                      {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                    </Badge>

                    <span className="text-sm text-muted-foreground">
                      Joined {new Date(participant.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
