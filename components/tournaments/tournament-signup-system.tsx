"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Target, Crown, Zap, UserPlus, Trophy, Clock, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentSignupSystemProps {
  tournament: any
  onSignupComplete?: () => void
}

interface PlayerInPool {
  id: string
  user_id: string
  status: string
  created_at: string
  users: {
    username: string
    elo_rating: number
  }
}

export function TournamentSignupSystem({ tournament, onSignupComplete }: TournamentSignupSystemProps) {
  const [playersInPool, setPlayersInPool] = useState<PlayerInPool[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadPlayerPool = async () => {
    try {
      console.log("[v0] Loading player pool for tournament:", tournament.id)

      const { data, error } = await supabase
        .from("tournament_player_pool")
        .select(`
          id,
          user_id,
          status,
          created_at,
          users (
            username,
            elo_rating
          )
        `)
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: true })

      if (error) throw error

      console.log("[v0] Loaded player pool:", data?.length || 0, "players")
      setPlayersInPool(data || [])
    } catch (err) {
      console.error("[v0] Error loading player pool:", err)
      toast.error("Failed to load player pool")
    } finally {
      setLoading(false)
    }
  }

  const signUpForTournament = async () => {
    setSigning(true)
    try {
      console.log("[v0] Signing up for tournament with no restrictions:", tournament.id)

      const { error } = await supabase.from("tournament_player_pool").insert({
        tournament_id: tournament.id,
        user_id: user?.id || "anonymous",
        status: "available",
      })

      if (error && !error.message.includes("duplicate")) {
        throw error
      }

      if (user?.id) {
        const { error: walletError } = await supabase.rpc("update_user_balance", {
          user_id: user.id,
          amount: 25,
        })

        if (walletError) {
          console.error("Error updating wallet balance:", walletError)
        }

        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: 25,
          transaction_type: "tournament_participation",
          description: `Tournament signup reward - ${tournament.name}`,
          reference_id: tournament.id,
        })
      }

      toast.success("Successfully joined the player pool! (+$25 reward)")
      loadPlayerPool()
      onSignupComplete?.()
    } catch (err) {
      console.error("[v0] Error signing up for tournament:", err)
      toast.error(err instanceof Error ? err.message : "Failed to join tournament")
    } finally {
      setSigning(false)
    }
  }

  useEffect(() => {
    loadPlayerPool()

    const subscription = supabase
      .channel(`tournament-pool-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          console.log("[v0] Player pool change detected:", payload.eventType)

          if (payload.eventType === "INSERT") {
            toast.success("New player joined the pool!")
          }

          loadPlayerPool()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournament.id])

  const maxPoolSize = 999999 // Unlimited capacity
  const currentPlayers = playersInPool.length
  const progressPercentage = Math.min((currentPlayers / 50) * 100, 100) // Show progress up to 50 players
  const isSignedUp = playersInPool.some((p) => p.user_id === user?.id)
  const isFull = false // Never full
  const canJoin = true // Always can join

  const sortedPlayers = [...playersInPool].sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tournament signup...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tournament Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament Signup - Open to All!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Players</p>
              <p className="font-bold">{currentPlayers}/∞</p>
            </div>
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Entry Fee</p>
              <p className="font-bold">FREE</p>
            </div>
            <div className="text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Prize Pool</p>
              <p className="font-bold text-green-600">${tournament.prize_pool || 0}</p>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                OPEN
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Pool Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Instant Tournament Access
          </CardTitle>
          <CardDescription>Join instantly! No limits, no waiting. Everyone welcome!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Players Joined</span>
              <span className="font-medium">{currentPlayers} (Unlimited)</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Participation Reward */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Instant Reward</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Earn <strong>$25</strong> instantly when you join! No restrictions!
            </p>
          </div>

          <Button onClick={signUpForTournament} disabled={signing} className="w-full" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            {signing ? "Joining..." : "Join Tournament (+$25)"}
          </Button>

          {isSignedUp && (
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="font-medium">You're in! Welcome to the tournament!</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Tournament is live and ready to play. More players can join anytime!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Pool Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Player Pool</span>
            <Badge variant="secondary">{currentPlayers} players</Badge>
          </CardTitle>
          <CardDescription>
            Players sorted by ELO rating. Top players will be selected as team captains when the tournament starts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(player.users?.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{player.users?.username || "Unknown Player"}</div>
                    <div className="text-xs text-muted-foreground">{player.users?.elo_rating || 1200} ELO</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {index < (tournament.player_pool_settings?.max_teams || 4) && (
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

            {Array.from({ length: maxPoolSize - currentPlayers }).map((_, index) => (
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
    </div>
  )
}
