"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Clock, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface DraftLobby {
  id: string
  name: string
  match_type: string
  max_participants: number
  prize_pool: number
  status: string
  created_at: string
  game: string
  match_participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
}

export default function Draft6v6Page() {
  const [lobbies, setLobbies] = useState<DraftLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [previousLobbyData, setPreviousLobbyData] = useState<string>("")
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadLobbies = async () => {
    try {
      console.log("[v0] Loading 6v6 lobbies...")
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          max_participants,
          prize_pool,
          status,
          created_at,
          game,
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("match_type", "6v6_draft")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })

      if (matchError) throw matchError

      const currentDataHash = JSON.stringify(matches)
      if (currentDataHash === previousLobbyData) {
        return // No changes, skip update
      }
      setPreviousLobbyData(currentDataHash)

      console.log("[v0] Loaded 6v6 matches:", matches)
      setLobbies(matches || [])
    } catch (err) {
      console.error("[v0] Error loading lobbies:", err)
      setError(err instanceof Error ? err.message : "Failed to load lobbies")
    } finally {
      setLoading(false)
    }
  }

  const createLobby = async () => {
    setCreating(true)
    try {
      console.log("[v0] Creating 6v6 lobby...")
      if (!isAuthenticated || !user) {
        throw new Error("Please log in to create a lobby")
      }

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: `6v6 Draft Lobby - ${new Date().toLocaleTimeString()}`,
          match_type: "6v6_draft",
          max_participants: 12,
          prize_pool: 120, // $10 per player * 12 players
          status: "waiting",
          creator_id: user.id,
          game: "Omega Strikers",
        })
        .select()
        .single()

      if (matchError) throw matchError

      const { error: participantError } = await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
      })

      if (participantError) throw participantError

      console.log("[v0] Created 6v6 lobby:", match.id)
      router.push(`/leagues/lobby/${match.id}`)
    } catch (err) {
      console.error("[v0] Error creating lobby:", err)
      setError(err instanceof Error ? err.message : "Failed to create lobby")
    } finally {
      setCreating(false)
    }
  }

  const joinLobby = async (lobbyId: string) => {
    try {
      if (!isAuthenticated || !user) {
        throw new Error("Please log in to join a lobby")
      }

      // Check if user is already in the lobby
      const { data: existingParticipant } = await supabase
        .from("match_participants")
        .select("id")
        .eq("match_id", lobbyId)
        .eq("user_id", user.id)
        .single()

      if (existingParticipant) {
        // User is already in the lobby, just navigate to it
        router.push(`/leagues/lobby/${lobbyId}`)
        return
      }

      const { error } = await supabase.from("match_participants").insert({
        match_id: lobbyId,
        user_id: user.id,
      })

      if (error) throw error

      router.push(`/leagues/lobby/${lobbyId}`)
    } catch (err) {
      console.error("Error joining lobby:", err)
      setError(err instanceof Error ? err.message : "Failed to join lobby")
    }
  }

  useEffect(() => {
    loadLobbies()
    const interval = setInterval(loadLobbies, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading 6v6 lobbies...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">6v6 ELO Draft</h1>
        <p className="text-muted-foreground">Compete in 6v6 team battles. FREE entry + $10 reward per player!</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Create 6v6 Lobby
            </CardTitle>
            <CardDescription>Start a new 6v6 draft lobby</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={createLobby} disabled={creating} className="w-full">
              {creating ? "Creating..." : "Create Lobby"}
            </Button>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                12 Players Required
              </div>
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-4 w-4" />
                FREE + $10 Reward
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active 6v6 Lobbies</h2>

        {lobbies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active 6v6 lobbies</p>
              <p className="text-sm text-muted-foreground mt-2">Create the first lobby to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lobbies.map((lobby) => {
              const currentParticipants = lobby.match_participants?.length || 0
              const isUserInLobby = lobby.match_participants?.some((p) => p.user_id === user?.id)

              return (
                <Card key={lobby.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{lobby.name}</CardTitle>
                      <Badge variant="secondary">{currentParticipants}/12</Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />${lobby.prize_pool}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(lobby.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <div className="font-medium mb-2">Players ({currentParticipants}/12):</div>
                        <div className="space-y-1">
                          {lobby.match_participants?.slice(0, 6).map((participant, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{participant.users?.username || "Unknown"}</span>
                              <span className="text-muted-foreground">{participant.users?.elo_rating || 1200} ELO</span>
                            </div>
                          ))}
                          {currentParticipants > 6 && (
                            <div className="text-xs text-muted-foreground">+{currentParticipants - 6} more...</div>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => joinLobby(lobby.id)}
                        className="w-full"
                        disabled={currentParticipants >= 12}
                        variant={isUserInLobby ? "outline" : "default"}
                      >
                        {currentParticipants >= 12 ? "Full" : isUserInLobby ? "Enter Lobby" : "Join Lobby"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
