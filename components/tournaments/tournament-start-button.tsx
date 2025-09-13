"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Users, Clock, AlertTriangle, CheckCircle, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TournamentStartButtonProps {
  tournament: {
    id: string
    name: string
    status: string
    max_participants: number
    created_by: string
    start_date?: string
    tournament_type: string
  }
  participantCount: number
  onStatusChange?: (newStatus: string) => void
}

export function TournamentStartButton({ tournament, participantCount, onStatusChange }: TournamentStartButtonProps) {
  const [starting, setStarting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [tournamentSettings, setTournamentSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTournamentSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("player_pool_settings, max_teams")
          .eq("id", tournament.id)
          .single()

        if (error) throw error
        setTournamentSettings(data)
      } catch (error) {
        console.error("[v0] Error loading tournament settings:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTournamentSettings()
  }, [tournament.id])

  const getMinimumPlayers = () => {
    if (!tournamentSettings) return 4

    const maxTeams = tournamentSettings.max_teams || tournamentSettings.player_pool_settings?.max_teams || 8
    const playersPerTeam = tournamentSettings.player_pool_settings?.players_per_team || 4

    return maxTeams * playersPerTeam
  }

  const minParticipants = getMinimumPlayers()
  const canStart =
    tournament.status === "registration" && participantCount >= minParticipants && tournament.created_by === user?.id

  const handleStartTournament = async () => {
    if (!user || !canStart) return

    setStarting(true)
    try {
      console.log("[v0] Starting tournament:", tournament.id)

      const { error: statusError } = await supabase
        .from("tournaments")
        .update({
          status: "drafting",
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournament.id)

      if (statusError) throw statusError

      await supabase.from("tournament_status_history").insert({
        tournament_id: tournament.id,
        previous_status: "registration",
        new_status: "drafting",
        changed_by: user.id,
        change_type: "manual",
        changed_at: new Date().toISOString(),
      })

      console.log("[v0] Tournament started successfully")
      toast.success("Tournament started! Players can now join the draft.")

      onStatusChange?.("drafting")

      router.push(`/tournaments/${tournament.id}/draft`)
    } catch (error) {
      console.error("[v0] Error starting tournament:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start tournament")
    } finally {
      setStarting(false)
    }
  }

  const getStatusInfo = () => {
    switch (tournament.status) {
      case "registration":
        return {
          color: "bg-blue-500",
          icon: <Clock className="h-4 w-4" />,
          text: "Registration Open",
        }
      case "drafting":
        return {
          color: "bg-yellow-500",
          icon: <Play className="h-4 w-4" />,
          text: "Draft in Progress",
        }
      case "active":
        return {
          color: "bg-green-500",
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Tournament Active",
        }
      case "completed":
        return {
          color: "bg-purple-500",
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Completed",
        }
      default:
        return {
          color: "bg-gray-500",
          icon: <AlertTriangle className="h-4 w-4" />,
          text: tournament.status,
        }
    }
  }

  const statusInfo = getStatusInfo()
  const progressPercentage = Math.min((participantCount / minParticipants) * 100, 100)

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="text-center">Loading tournament settings...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Tournament Control
          </span>
          <Badge className={`${statusInfo.color} text-white`}>
            {statusInfo.icon}
            {statusInfo.text}
          </Badge>
        </CardTitle>
        <CardDescription>Manage tournament progression and start the draft when ready</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-blue-700">{participantCount}</div>
            <div className="text-sm text-blue-600">Players Registered</div>
          </div>
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-700">{minParticipants}</div>
            <div className="text-sm text-green-600">
              Minimum Required ({tournamentSettings?.max_teams || 8} teams ×{" "}
              {tournamentSettings?.player_pool_settings?.players_per_team || 4} players)
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold text-purple-700">{tournamentSettings?.max_teams || 8}</div>
            <div className="text-sm text-purple-600">Teams Needed</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tournament Readiness</span>
            <span className="font-medium">
              {participantCount}/{minParticipants} players (
              {tournamentSettings?.player_pool_settings?.players_per_team || 4} per team)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {tournament.status === "registration" && (
          <>
            {canStart ? (
              <Button onClick={handleStartTournament} disabled={starting} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                {starting ? "Starting Tournament..." : "Start Tournament Draft"}
              </Button>
            ) : (
              <div className="space-y-2">
                {participantCount < minParticipants && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Need {minParticipants - participantCount} more players to start the tournament (
                      {tournamentSettings?.max_teams || 8} teams of{" "}
                      {tournamentSettings?.player_pool_settings?.players_per_team || 4} players each)
                    </AlertDescription>
                  </Alert>
                )}
                {tournament.created_by !== user?.id && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Only the tournament creator can start the tournament</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}

        {tournament.status === "drafting" && (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Play className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="font-medium text-yellow-800">Draft in Progress</div>
            <div className="text-sm text-yellow-600 mt-1">Players are currently drafting teams</div>
            <Button
              onClick={() => router.push(`/tournaments/${tournament.id}/draft`)}
              variant="outline"
              className="mt-3"
            >
              View Draft Room
            </Button>
          </div>
        )}

        {tournament.status === "active" && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="font-medium text-green-800">Tournament Active</div>
            <div className="text-sm text-green-600 mt-1">Matches are currently being played</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
