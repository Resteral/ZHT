"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Trophy, Crown, Zap, Timer } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { tournamentService } from "@/lib/services/tournament-service"

interface Player {
  id: string
  username: string
  elo_rating: number
  is_captain?: boolean
}

interface Tournament {
  id: string
  name: string
  description: string
  start_date: string
  max_participants: number
  settings: {
    num_teams: number
    players_per_team: number
    bracket_type: string
  }
  status: string
}

export default function TournamentLobbyPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [timeUntilStart, setTimeUntilStart] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUser(user)

        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single()

        if (tournamentError) throw tournamentError
        setTournament(tournamentData)

        const { data: participantsData, error: participantsError } = await supabase
          .from("tournament_participants")
          .select(`
            user_id,
            users!inner(username, elo_rating)
          `)
          .eq("tournament_id", tournamentId)
          .eq("status", "registered")

        if (participantsError) throw participantsError

        const playersData = participantsData
          .map((p: any) => ({
            id: p.user_id,
            username: p.users.username,
            elo_rating: p.users.elo_rating || 1000,
          }))
          .sort((a: Player, b: Player) => b.elo_rating - a.elo_rating)

        setPlayers(playersData)
      } catch (error) {
        console.error("[v0] Error fetching tournament data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const subscription = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  useEffect(() => {
    const updateTimer = () => {
      if (!tournament?.start_date) return

      const startTime = new Date(tournament.start_date).getTime()
      const now = new Date().getTime()
      const difference = startTime - now

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeUntilStart(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeUntilStart("Starting now!")
        if (tournament.status === "registration") {
          startDraft()
        }
      }
    }

    const timer = setInterval(updateTimer, 1000)
    updateTimer()

    return () => clearInterval(timer)
  }, [tournament])

  const joinTournament = async () => {
    if (!currentUser || !tournament) return

    setJoining(true)
    try {
      await tournamentService.joinTournament(tournamentId, currentUser.id)
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
    } finally {
      setJoining(false)
    }
  }

  const startDraft = async () => {
    if (!tournament) return

    try {
      const numCaptains = tournament.settings.num_teams
      const captains = players.slice(0, numCaptains)

      const totalPlayersNeeded = tournament.settings.num_teams * tournament.settings.players_per_team

      const selectedPlayers = players.slice(0, totalPlayersNeeded)
      const excessPlayers = players.slice(totalPlayersNeeded)

      console.log("[v0] Starting draft with captains:", captains)
      console.log("[v0] Selected players:", selectedPlayers.length)
      console.log("[v0] Removing excess players:", excessPlayers.length)

      await supabase.from("tournaments").update({ status: "drafting" }).eq("id", tournamentId)

      router.push(`/tournaments/${tournamentId}/draft`)
    } catch (error) {
      console.error("[v0] Error starting draft:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading tournament lobby...</div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Tournament not found</div>
      </div>
    )
  }

  const isUserInTournament = players.some((p) => p.id === currentUser?.id)
  const totalPlayersNeeded = tournament.settings.num_teams * tournament.settings.players_per_team
  const progressPercentage = (players.length / totalPlayersNeeded) * 100

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground">{tournament.description}</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Timer className="h-4 w-4 mr-2" />
            {timeUntilStart}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Players in Pool</span>
                <span className="text-sm text-muted-foreground">
                  {players.length} / {totalPlayersNeeded} needed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {tournament.settings.num_teams} teams × {tournament.settings.players_per_team} players each
                </span>
                <span className="font-medium">{Math.max(0, totalPlayersNeeded - players.length)} more needed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Pool
                <Badge variant="outline">{players.length} players</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index < tournament.settings.num_teams ? "border-yellow-200 bg-yellow-50" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{player.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.username}</span>
                          {index < tournament.settings.num_teams && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              <Crown className="h-3 w-3 mr-1" />
                              Captain
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">ELO: {player.elo_rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">#{index + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        {index < tournament.settings.num_teams ? "Captain" : "Player"}
                      </div>
                    </div>
                  </div>
                ))}

                {players.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No players in the pool yet. Be the first to join!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{tournament.settings.bracket_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{tournament.settings.num_teams}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Players per team:</span>
                  <span className="font-medium">{tournament.settings.players_per_team}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start time:</span>
                  <span className="font-medium">{new Date(tournament.start_date).toLocaleString()}</span>
                </div>
              </div>

              {!isUserInTournament && currentUser && (
                <Button onClick={joinTournament} disabled={joining} className="w-full" size="lg">
                  {joining ? (
                    "Joining..."
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Join Tournament Pool
                    </>
                  )}
                </Button>
              )}

              {isUserInTournament && (
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-green-800 font-medium">✅ You're in the pool!</div>
                  <div className="text-sm text-green-600 mt-1">Wait for the tournament to start</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Crown className="h-5 w-5" />
                Captain Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-700">
                <p className="mb-2">
                  The <strong>{tournament.settings.num_teams} highest ELO players</strong> will be selected as team
                  captains.
                </p>
                <p>Captains will draft teams, then score live bracket games after the tournament.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
