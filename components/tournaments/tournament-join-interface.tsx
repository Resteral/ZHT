"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Trophy,
  DollarSign,
  Clock,
  Crown,
  UserPlus,
  Star,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentJoinInterfaceProps {
  tournamentId: string
  tournament?: any
}

interface PlayerInPool {
  user_id: string
  status: string
  captain_type?: string
  created_at: string
  users: {
    username: string
    elo_rating: number
  }
}

export function TournamentJoinInterface({ tournamentId, tournament: initialTournament }: TournamentJoinInterfaceProps) {
  const [tournament, setTournament] = useState(initialTournament)
  const [playerPool, setPlayerPool] = useState<PlayerInPool[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(!initialTournament)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournamentData = async () => {
    try {
      console.log("[v0] Loading tournament join data for:", tournamentId)

      // Load tournament details if not provided
      if (!tournament) {
        const { data: tournamentData, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single()

        if (error) {
          console.error("[v0] Error loading tournament:", error)
          return
        }
        setTournament(tournamentData)
      }

      // Load player pool for draft-based tournaments
      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          created_at,
          users (username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolError && !poolError.message.includes("does not exist")) {
        console.error("[v0] Error loading player pool:", poolError)
      } else {
        const players: PlayerInPool[] = (poolData || []).map((entry: any) => ({
          user_id: entry.user_id,
          status: entry.status,
          captain_type: entry.captain_type,
          created_at: entry.created_at,
          users: entry.users || { username: "Unknown", elo_rating: 1200 },
        }))
        setPlayerPool(players)
      }

      // Load direct participants for non-draft tournaments
      const { data: participantData, error: participantError } = await supabase
        .from("tournament_participants")
        .select(`
          *,
          users (username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (participantError && !participantError.message.includes("does not exist")) {
        console.error("[v0] Error loading participants:", participantError)
      } else {
        setParticipants(participantData || [])
      }
    } catch (error) {
      console.error("[v0] Error loading tournament data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }

  const joinTournament = async () => {
    setJoining(true)
    try {
      console.log("[v0] Attempting to join tournament:", tournamentId)

      let userId = user?.id

      // If user is not authenticated, create a temporary anonymous user
      if (!isAuthenticated || !user) {
        console.log("[v0] Creating anonymous user for tournament join")
        const anonymousUsername = `Guest_${Math.random().toString(36).substring(2, 8)}`

        // Create anonymous user in database
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert({
            id: crypto.randomUUID(),
            username: anonymousUsername,
            elo_rating: 1200,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (userError) {
          console.error("[v0] Error creating anonymous user:", userError)
          toast.error("Failed to join tournament. Please try again.")
          return
        }

        userId = newUser.id
        console.log("[v0] Created anonymous user:", anonymousUsername)
      }

      // Check if user already joined
      const { data: existingParticipant } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .single()

      if (existingParticipant) {
        toast.error("You're already registered for this tournament!")
        return
      }

      // Add user to tournament participants
      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        status: "registered",
      })

      if (error) {
        console.error("[v0] Error joining tournament:", error)
        toast.error("Failed to join tournament. Please try again.")
        return
      }

      toast.success("Successfully joined tournament!")
      await loadTournamentData() // Refresh data
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join tournament")
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    loadTournamentData()

    // Set up real-time subscription
    const subscription = supabase
      .channel(`tournament-join-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Tournament pool update detected")
          loadTournamentData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Tournament participants update detected")
          loadTournamentData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tournament...</p>
        </CardContent>
      </Card>
    )
  }

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Tournament not found</p>
        </CardContent>
      </Card>
    )
  }

  const isDraftTournament =
    tournament.tournament_type?.includes("draft") || tournament.player_pool_settings?.enable_player_pool
  const currentParticipants = isDraftTournament ? playerPool.length : participants.length
  const maxParticipants = tournament.max_participants || 16
  const progressPercentage = (currentParticipants / maxParticipants) * 100

  const userInPool = playerPool.find((p) => p.user_id === user?.id)
  const userInParticipants = participants.find((p) => p.user_id === user?.id)
  const isUserJoined = userInPool || userInParticipants
  const isFull = currentParticipants >= maxParticipants
  const canJoin =
    !isUserJoined && !isFull && (tournament.status === "active" || tournament.status === "registration_open")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
      case "registration_open":
        return "bg-blue-500"
      case "in_progress":
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
      case "registration_open":
        return "Registration Open"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return status.replace("_", " ").toUpperCase()
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
                <Badge className={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
              </div>
              <CardDescription className="text-base">{tournament.description}</CardDescription>
            </div>

            <Button onClick={loadTournamentData} variant="outline" size="sm" className="bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {tournament.tournament_type?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                    "Tournament"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="font-medium">
                  {currentParticipants}/{maxParticipants}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : "TBD"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="font-medium">${tournament.prize_pool?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Join Tournament Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tournament Progress</span>
                <span className="font-medium">
                  {currentParticipants}/{maxParticipants}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Join Button */}
            {canJoin && (
              <Button
                onClick={joinTournament}
                disabled={joining}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {joining
                  ? "Joining..."
                  : `Join Tournament${tournament.entry_fee > 0 ? ` ($${tournament.entry_fee})` : ""}`}
              </Button>
            )}

            {/* Status Messages */}
            {isUserJoined && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You're registered for this tournament!
                  {isDraftTournament && " Wait for captains to draft you to their teams."}
                </AlertDescription>
              </Alert>
            )}

            {isFull && !isUserJoined && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This tournament is full. Check back later for new tournaments!</AlertDescription>
              </Alert>
            )}

            {!canJoin && !isUserJoined && !isFull && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Registration is closed. Tournament is {getStatusText(tournament.status).toLowerCase()}.
                </AlertDescription>
              </Alert>
            )}

            {!isAuthenticated && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>You can join as a guest player or sign in for full features.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Details Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players ({currentParticipants})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Tournament Type</h4>
                  <p className="text-sm text-muted-foreground">
                    {isDraftTournament
                      ? "Draft-based tournament with captain selection and team formation"
                      : "Direct participation tournament"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Entry Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    {tournament.entry_fee > 0 ? `$${tournament.entry_fee} entry fee` : "Free to join"}
                    {isDraftTournament && " • Minimum 1000 ELO rating"}
                  </p>
                </div>
              </div>

              {tournament.entry_fee > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Entry Fee:</strong> ${tournament.entry_fee}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{isDraftTournament ? "Player Pool" : "Registered Players"}</span>
                <Badge variant="secondary">{currentParticipants} players</Badge>
              </CardTitle>
              <CardDescription>
                {isDraftTournament
                  ? "Players sorted by ELO rating. Highest ELO players will be selected as captains."
                  : "Tournament participants in order of registration."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(isDraftTournament ? playerPool : participants)
                  .sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))
                  .map((player, index) => (
                    <div key={player.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(player.users?.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{player.users?.username || "Unknown Player"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {player.users?.elo_rating || 1200} ELO
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDraftTournament && index < 2 && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Captain
                          </Badge>
                        )}
                        {player.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Empty slots */}
                {Array.from({ length: maxParticipants - currentParticipants }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border-dashed border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Waiting for player...</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
