"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Medal, Award, Users, Clock, Wifi, WifiOff, RefreshCw, UserPlus } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

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
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [tournament, setTournament] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadData = useCallback(async () => {
    try {
      const { data: tournamentData, error } = await supabase
        .from("tournaments")
        .select(`
          *,
          tournament_participants (
            id,
            user_id,
            team_name,
            seed,
            status,
            joined_at,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", tournamentId)
        .single()

      if (error) throw error

      setTournament(tournamentData)
      setParticipants(tournamentData.tournament_participants || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error loading tournament data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }, [tournamentId, supabase])

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`tournament-data-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Participant update:", payload)
          loadData() // Reload all data on any change
          setLastUpdate(new Date())
        },
      )
      .on("presence", { event: "sync" }, () => setIsConnected(true))
      .on("presence", { event: "leave" }, () => setIsConnected(false))
      .subscribe((status) => {
        console.log("[v0] Subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

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

  const registrationProgress = tournament ? (participants.length / tournament.max_participants) * 100 : 0
  const spotsRemaining = tournament ? tournament.max_participants - participants.length : 0

  if (loading) {
    return <div className="text-center py-8">Loading participants...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Tournament Registration
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" title="Live updates connected" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Connection lost" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {participants.length} players registered
            <span className="ml-2 text-xs">• Updated {lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tournament?.status === "registration" || tournament?.status === "registration_open" ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 animate-pulse">
              <UserPlus className="h-3 w-3 mr-1" />
              Registration Open
            </Badge>
          ) : tournament?.status === "active" || tournament?.status === "in_progress" ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Tournament Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Registration Closed
            </Badge>
          )}
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {tournament && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Registration Progress</CardTitle>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{participants.length}</p>
                <p className="text-sm text-muted-foreground">of {tournament.max_participants}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={registrationProgress} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{registrationProgress.toFixed(1)}% filled</span>
              <span className={`font-medium ${spotsRemaining <= 5 ? "text-orange-600" : "text-green-600"}`}>
                {spotsRemaining} spots remaining
              </span>
            </div>

            {spotsRemaining <= 5 && spotsRemaining > 0 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <Clock className="h-4 w-4 inline mr-1" />
                  <strong>Almost Full!</strong> Only {spotsRemaining} spots left. Register soon!
                </p>
              </div>
            )}

            {spotsRemaining === 0 &&
              tournament?.status !== "registration" &&
              tournament?.status !== "registration_open" && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <Trophy className="h-4 w-4 inline mr-1" />
                    <strong>Tournament Full!</strong> Registration is now closed.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered Players</CardTitle>
        </CardHeader>

        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Players Yet</h3>
              <p className="text-muted-foreground">Be the first to join this tournament!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants
                .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                .map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md ${
                      index < 3
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold px-2 py-1 rounded ${
                            index < 3 ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          #{index + 1}
                        </span>
                        {getStatusIcon(participant.status)}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {participant.team_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="font-medium text-lg">{participant.team_name}</p>
                        {participant.user_profile && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>@{participant.user_profile.username}</span>
                            <span>•</span>
                            <span className="font-medium">ELO: {participant.user_profile.elo_rating}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(participant.status)}>
                        {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                      </Badge>

                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Joined</p>
                        <p className="font-medium">{new Date(participant.joined_at).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(participant.joined_at).toLocaleTimeString()}
                        </p>
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
