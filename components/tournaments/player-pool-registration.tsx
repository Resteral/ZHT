"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Target, Crown, Zap, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface PlayerPoolRegistrationProps {
  tournamentId: string
  maxParticipants: number
  onRegistrationChange?: (participantCount: number) => void
}

interface Participant {
  user_id: string
  users: {
    username: string
    elo_rating: number
  }
}

export function PlayerPoolRegistration({
  tournamentId,
  maxParticipants,
  onRegistrationChange,
}: PlayerPoolRegistrationProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadParticipants = async () => {
    try {
      console.log("[v0] Loading tournament participants:", tournamentId)

      const { data, error } = await supabase
        .from("match_participants")
        .select(`
          user_id,
          users (
            username,
            elo_rating
          )
        `)
        .eq("match_id", tournamentId)
        .order("created_at", { ascending: true })

      if (error) throw error

      console.log("[v0] Loaded participants:", data?.length || 0)
      setParticipants(data || [])

      if (onRegistrationChange) {
        onRegistrationChange(data?.length || 0)
      }
    } catch (err) {
      console.error("[v0] Error loading participants:", err)
      toast.error("Failed to load participants")
    } finally {
      setLoading(false)
    }
  }

  const registerForTournament = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to join the tournament")
      return
    }

    setRegistering(true)
    try {
      console.log("[v0] Registering for tournament:", tournamentId)

      // Check if already registered
      const existingParticipant = participants.find((p) => p.user_id === user.id)
      if (existingParticipant) {
        toast.success("You're already registered for this tournament!")
        return
      }

      // Check if tournament is full
      if (participants.length >= maxParticipants) {
        toast.error("Tournament is full!")
        return
      }

      const { error } = await supabase.from("match_participants").insert({
        match_id: tournamentId,
        user_id: user.id,
      })

      if (error) throw error

      toast.success("Successfully joined the player pool!")
      loadParticipants() // Refresh participant list
    } catch (err) {
      console.error("[v0] Error registering for tournament:", err)
      toast.error(err instanceof Error ? err.message : "Failed to join tournament")
    } finally {
      setRegistering(false)
    }
  }

  useEffect(() => {
    loadParticipants()

    // Set up real-time subscription for participant changes
    const subscription = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_participants",
          filter: `match_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Participant change detected, reloading...")
          loadParticipants()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  const currentParticipants = participants.length
  const progressPercentage = (currentParticipants / maxParticipants) * 100
  const isRegistered = participants.some((p) => p.user_id === user?.id)
  const isFull = currentParticipants >= maxParticipants

  // Sort participants by ELO for display
  const sortedParticipants = [...participants].sort(
    (a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200),
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading player pool...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Player Pool Registration
          </CardTitle>
          <CardDescription>
            Join the player pool to be drafted by team captains. Highest ELO becomes tournament owner!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Players Registered</span>
              <span className="font-medium">
                {currentParticipants}/{maxParticipants}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {!isRegistered && !isFull && (
            <Button onClick={registerForTournament} disabled={registering} className="w-full" size="lg">
              <UserPlus className="h-4 w-4 mr-2" />
              {registering ? "Joining..." : "Join Player Pool"}
            </Button>
          )}

          {isRegistered && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Zap className="h-4 w-4" />
                <span className="font-medium">You're in the player pool!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">Wait for the tournament to start and captains to draft you</p>
            </div>
          )}

          {isFull && !isRegistered && (
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-red-700">
                <Users className="h-4 w-4" />
                <span className="font-medium">Tournament Full</span>
              </div>
              <p className="text-sm text-red-600 mt-1">This tournament has reached maximum capacity</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registered Players</span>
            <Badge variant="secondary">{currentParticipants} players</Badge>
          </CardTitle>
          <CardDescription>Players sorted by ELO rating. Highest ELO becomes tournament owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedParticipants.map((participant, index) => (
              <div key={participant.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(participant.users?.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{participant.users?.username || "Unknown Player"}</div>
                    <div className="text-xs text-muted-foreground">{participant.users?.elo_rating || 1200} ELO</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 && sortedParticipants.length > 1 && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Owner
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
    </div>
  )
}
