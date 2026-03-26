"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Calendar, DollarSign, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

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

interface TournamentCardProps {
  tournament: Tournament
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const router = useRouter()

  const [timeUntilStart, setTimeUntilStart] = useState<string>("")
  const [isStartingSoon, setIsStartingSoon] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const startTime = new Date(tournament.start_date).getTime()
      const now = new Date().getTime()
      const difference = startTime - now

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

        if (hours < 24) {
          setTimeUntilStart(`Starts in ${hours}h ${minutes}m`)
          setIsStartingSoon(hours < 2)
        } else {
          const days = Math.floor(hours / 24)
          setTimeUntilStart(`Starts in ${days}d ${hours % 24}h`)
          setIsStartingSoon(false)
        }
      } else {
        setTimeUntilStart("Starting now!")
        setIsStartingSoon(true)
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [tournament.start_date])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "bg-blue-500"
      case "drafting":
        return "bg-yellow-500"
      case "in_progress":
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "registration":
        return "Registration Open"
      case "drafting":
        return "Draft in Progress"
      case "in_progress":
      case "active":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  const getTournamentTypeText = (type: string) => {
    switch (type) {
      case "single_elimination":
        return "Single Elimination"
      case "double_elimination":
        return "Double Elimination"
      case "round_robin":
        return "Round Robin"
      case "auction_draft":
        return "League"
      default:
        return type
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{tournament.name}</CardTitle>
            <CardDescription>{tournament.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>{getTournamentTypeText(tournament.tournament_type)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {tournament.participant_count}/{tournament.max_participants}
            </span>
          </div>

          <div className="col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{new Date(tournament.start_date).toLocaleString()}</span>
            </div>
            {tournament.status === "registration" && (
              <div className={`text-sm font-medium ${isStartingSoon ? "text-orange-600" : "text-blue-600"}`}>
                {timeUntilStart}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${tournament.prize_pool.toLocaleString()}</span>
          </div>
        </div>

        {tournament.entry_fee > 0 && (
          <div className="text-sm text-muted-foreground">Entry Fee: ${tournament.entry_fee}</div>
        )}

        <Button className="w-full" onClick={() => router.push(`/tournaments/${tournament.id}`)}>
          <Eye className="h-4 w-4 mr-2" />
          {tournament.status === "drafting"
            ? "Join Draft"
            : tournament.status === "active"
              ? "View Matches"
              : "View Tournament"}
        </Button>
      </CardContent>
    </Card>
  )
}
