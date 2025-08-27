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
import { UserSyncService } from "@/lib/services/user-sync-service"
import { TournamentBettingInterface } from "./tournament-betting-interface"

interface UnifiedTournamentJoinProps {
  tournamentId: string
  tournament?: any
}

interface Participant {
  user_id: string
  status: string
  joined_at: string
  team_name?: string
  seed?: number
  users: {
    username: string
    elo_rating: number
  }
}

export function UnifiedTournamentJoin({ tournamentId, tournament: initialTournament }: UnifiedTournamentJoinProps) {
  const [tournament, setTournament] = useState(initialTournament)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(!initialTournament)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournamentData = async () => {
    try {
      console.log("[v0] Loading unified tournament data for:", tournamentId)

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

      const { data: participantData, error: participantError } = await supabase
        .from("tournament_participants")
        .select("user_id, team_name, status, joined_at, seed")
        .eq("tournament_id", tournamentId)
        .order("joined_at", { ascending: true })

      if (participantError) {
        console.error("[v0] Error loading participants:", participantError)
        setParticipants([])
        return
      }

      if (participantData && participantData.length > 0) {
        // Fetch user data separately to avoid schema relationship issues
        const userIds = participantData.map((p) => p.user_id)
        const { data: userData } = await supabase.from("users").select("id, username, elo_rating").in("id", userIds)

        // Create user lookup map
        const userMap = new Map()
        userData?.forEach((user) => {
          userMap.set(user.id, user)
        })

        // Combine participant data with user data
        const participants: Participant[] = participantData.map((entry: any) => ({
          user_id: entry.user_id,
          status: entry.status,
          joined_at: entry.joined_at,
          team_name: entry.team_name,
          seed: entry.seed,
          users: userMap.get(entry.user_id) || { username: "Unknown", elo_rating: 1200 },
        }))
        setParticipants(participants)
      } else {
        setParticipants([])
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
      console.log("[v0] Joining tournament via unified system:", tournamentId)

      let userId = user?.id
      let finalUser = null

      if (isAuthenticated && user) {
        console.log("[v0] Validating authenticated user:", user.id)

        const syncResult = await UserSyncService.syncAuthUser(
          user.id,
          user.username || `User_${user.id.substring(0, 8)}`,
        )

        if (!syncResult.success) {
          console.error("[v0] User sync failed:", syncResult.error)
          toast.error(`Failed to sync user: ${syncResult.error}`)
          return
        }

        userId = syncResult.userId
        console.log("[v0] User sync successful:", syncResult.username, "Using database ID:", userId)

        console.log("[v0] Verifying user exists in database:", userId)
        const { data: existingUser, error: userCheckError } = await supabase
          .from("users")
          .select("id, username, elo_rating, balance")
          .eq("id", userId)
          .single()

        if (userCheckError || !existingUser) {
          console.error("[v0] User not found in database, creating new record:", userCheckError)

          // Create the user record with the correct ID
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              id: userId,
              username: user.username || `User_${userId.substring(0, 8)}`,
              email: user.email || `${userId}@temp.com`,
              elo_rating: 1200,
              balance: 0,
              total_games: 0,
              wins: 0,
              losses: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (createError) {
            console.error("[v0] Failed to create user record:", createError)
            toast.error(`Failed to create user account: ${createError.message}`)
            return
          }

          finalUser = newUser
          console.log("[v0] Created new user record:", finalUser.username)
        } else {
          finalUser = existingUser
          console.log("[v0] User verified in database:", finalUser.username)
        }

        const isValidUser = await UserSyncService.validateUserSync(userId)
        if (!isValidUser) {
          console.error("[v0] User validation failed for database ID:", userId)
          toast.error("User validation failed. Please try again.")
          return
        }

        console.log("[v0] User validation successful for database ID:", userId)
      } else {
        console.log("[v0] Creating anonymous user")
        const anonymousId = crypto.randomUUID()
        const anonymousUsername = `Guest_${Math.random().toString(36).substring(2, 8)}`

        const { data: anonymousUser, error: anonymousError } = await supabase
          .from("users")
          .insert({
            id: anonymousId,
            username: anonymousUsername,
            email: `${anonymousId}@temp.com`,
            elo_rating: 1200,
            balance: 25, // Starting bonus for anonymous users
            total_games: 0,
            wins: 0,
            losses: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (anonymousError) {
          console.error("[v0] Failed to create anonymous user:", anonymousError)
          toast.error("Failed to create guest account")
          return
        }

        userId = anonymousId
        finalUser = anonymousUser
        console.log("[v0] Created anonymous user:", finalUser.username)
      }

      const existingParticipant = participants.find((p) => p.user_id === userId)
      if (existingParticipant) {
        toast.error("You're already registered for this tournament!")
        return
      }

      const maxParticipants = tournament.max_participants || 16
      if (participants.length >= maxParticipants) {
        toast.error("Tournament is full!")
        return
      }

      console.log("[v0] Joining tournament with validated database user ID:", userId)

      const participantData = {
        tournament_id: tournamentId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        status: "registered",
        seed: participants.length + 1,
        team_name: `Team ${participants.length + 1}`,
      }

      const playerPoolData = {
        tournament_id: tournamentId,
        user_id: userId,
        draft_position: participants.length + 1,
        status: "available",
        captain_type: participants.length < 2 ? "captain" : "player",
        created_at: new Date().toISOString(),
      }

      console.log("[v0] Adding player to tournament participants...")
      const { data: joinData, error: joinError } = await supabase
        .from("tournament_participants")
        .insert(participantData)
        .select()

      if (joinError) {
        console.error("[v0] Error joining tournament:", joinError)
        toast.error(`Failed to join tournament: ${joinError.message}`)
        return
      }

      console.log("[v0] Successfully registered for tournament, now adding to player pool...")
      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .insert(playerPoolData)
        .select()

      if (poolError) {
        console.error("[v0] Error adding to player pool:", poolError)
        console.log("[v0] Removing from tournament participants due to player pool failure...")
        await supabase.from("tournament_participants").delete().eq("tournament_id", tournamentId).eq("user_id", userId)

        toast.error(`Failed to join player pool: ${poolError.message}`)
        return
      }

      console.log("[v0] Successfully added to player pool:", poolData)
      console.log("[v0] Player successfully registered for tournament and added to player pool")

      if (userId && isAuthenticated && finalUser) {
        try {
          const { data: existingReward } = await supabase
            .from("financial_transactions")
            .select("id")
            .eq("user_id", userId)
            .eq("external_transaction_id", `tournament_join_${tournamentId}`)
            .eq("transaction_type", "tournament_participation")
            .single()

          if (!existingReward) {
            const currentBalance = finalUser.balance || 0
            const rewardAmount = 25

            const { error: balanceError } = await supabase
              .from("users")
              .update({
                balance: currentBalance + rewardAmount,
              })
              .eq("id", userId)

            if (!balanceError) {
              await supabase.from("user_wallets").upsert(
                {
                  user_id: userId,
                  balance: currentBalance + rewardAmount,
                  total_deposited: rewardAmount,
                  updated_at: new Date().toISOString(),
                },
                {
                  onConflict: "user_id",
                },
              )

              await supabase.from("financial_transactions").insert({
                user_id: userId,
                amount: rewardAmount,
                transaction_type: "tournament_participation",
                description: `Tournament join reward - ${tournament.name}`,
                external_transaction_id: `tournament_join_${tournamentId}`,
                status: "completed",
                currency: "USD",
                created_at: new Date().toISOString(),
              })

              toast.success("Successfully joined tournament! (+$25 reward)")
            } else {
              toast.success("Successfully joined tournament!")
            }
          } else {
            toast.success("Successfully joined tournament!")
          }
        } catch (rewardError) {
          console.error("[v0] Error processing reward:", rewardError)
          toast.success("Successfully joined tournament!")
        }
      } else {
        toast.success("Successfully joined tournament!")
      }

      await loadTournamentData()
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join tournament")
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    loadTournamentData()

    const subscription = supabase
      .channel(`unified-tournament-${tournamentId}`)
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

  const currentParticipants = participants.length
  const maxParticipants = tournament.max_participants || 16
  const progressPercentage = (currentParticipants / maxParticipants) * 100

  const isUserJoined = participants.find((p) => p.user_id === user?.id)
  const isFull = currentParticipants >= maxParticipants
  const canJoin =
    !isUserJoined && !isFull && (tournament.status === "active" || tournament.status === "registration_open")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
      case "registration_open":
      case "active":
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
      case "active":
        return "Active"
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

            {isUserJoined && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You're registered for this tournament! Wait for the tournament to begin.
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
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players ({currentParticipants})</TabsTrigger>
          <TabsTrigger value="betting">Betting</TabsTrigger>
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
                    {tournament.tournament_type?.includes("draft")
                      ? "Draft-based tournament with team formation"
                      : "Direct participation tournament"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Entry Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    {tournament.entry_fee > 0 ? `$${tournament.entry_fee} entry fee` : "Free to join"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registered Players</span>
                <Badge variant="secondary">{currentParticipants} players</Badge>
              </CardTitle>
              <CardDescription>Tournament participants sorted by ELO rating.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {participants
                  .sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))
                  .map((participant, index) => (
                    <div
                      key={participant.user_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(participant.users?.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{participant.users?.username || "Unknown Player"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {participant.users?.elo_rating || 1200} ELO
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index < 2 && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Captain
                          </Badge>
                        )}
                        {participant.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

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

        <TabsContent value="betting" className="space-y-4">
          <TournamentBettingInterface
            tournamentId={tournamentId}
            tournamentName={tournament.name}
            participants={participants}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
