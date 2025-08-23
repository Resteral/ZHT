"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Gamepad2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"

interface DraftLobby {
  id: string
  match_type: string
  max_participants: number
  current_participants: number
  prize_pool: number
  status: string
  created_at: string
  match_participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
}

export default function OneVOnePage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()
  const [lobbies, setLobbies] = useState<DraftLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [previousLobbyData, setPreviousLobbyData] = useState<string>("")

  useEffect(() => {
    loadLobbies()
    const interval = setInterval(loadLobbies, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadLobbies = async () => {
    try {
      console.log("[v0] Loading 1v1 lobbies...")
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          match_type,
          max_participants,
          prize_pool,
          status,
          created_at,
          match_participants (
            user_id,
            users (username, elo_rating)
          )
        `)
        .eq("match_type", "1v1_draft")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error loading lobbies:", error)
        throw error
      }

      const currentDataHash = JSON.stringify(data)
      if (currentDataHash === previousLobbyData) {
        return // No changes, skip update
      }
      setPreviousLobbyData(currentDataHash)

      console.log("[v0] Loaded lobbies:", data)
      setLobbies(data || [])
    } catch (error) {
      console.error("Error loading lobbies:", error)
      toast.error(`Error loading lobbies: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createLobby = async () => {
    setCreating(true)
    try {
      console.log("[v0] Creating 1v1 lobby...")

      if (!isAuthenticated || !user) {
        toast.error("Please log in to create a lobby")
        return
      }

      console.log("[v0] User authenticated:", user.id)

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: `1v1 Draft Lobby - ${new Date().toLocaleTimeString()}`,
          match_type: "1v1_draft",
          max_participants: 2,
          prize_pool: 20, // $10 per player * 2 players
          status: "waiting",
          creator_id: user.id,
          game: "Omega Strikers",
        })
        .select()
        .single()

      if (matchError) {
        console.error("[v0] Error creating match:", matchError)
        throw matchError
      }

      console.log("[v0] Match created:", match)

      const { error: participantError } = await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
      })

      if (participantError) throw participantError

      console.log("[v0] Participant added, redirecting to lobby")
      router.push(`/leagues/lobby/${match.id}`)
    } catch (error) {
      console.error("Error creating lobby:", error)
      toast.error(`Failed to create lobby: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  const joinLobby = async (lobbyId: string) => {
    try {
      if (!isAuthenticated || !user) {
        toast.error("Please log in to join a lobby")
        return
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
    } catch (error) {
      console.error("Error joining lobby:", error)
      toast.error(`Failed to join lobby: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">1v1 ELO Matches</h1>
        <p className="text-muted-foreground">Quick 1-on-1 matches. Earn $10 per game and improve your ELO rating.</p>
      </div>

      <div className="mb-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Create a new 1v1 lobby or browse all formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UnifiedDraftSelector buttonText="Create 1v1 Lobby" className="w-full" mode="create" />
            <UnifiedDraftSelector
              buttonText="Browse All Formats"
              buttonVariant="outline"
              className="w-full"
              mode="both"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {lobbies.map((lobby) => {
          const currentParticipants = lobby.match_participants?.length || 0
          const isUserInLobby = lobby.match_participants?.some((p) => p.user_id === user?.id)

          return (
            <Card key={lobby.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    1v1 Match
                  </div>
                  <Badge variant="outline" className="text-green-500">
                    FREE
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{currentParticipants}/2 Players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">30s picks</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Reward:</span>
                    <span className="text-green-500 font-medium">$10</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>ELO:</span>
                    <span className="text-purple-500 font-medium">+/- Rating</span>
                  </div>
                </div>

                <Button
                  onClick={() => joinLobby(lobby.id)}
                  className="w-full"
                  disabled={currentParticipants >= 2}
                  variant={isUserInLobby ? "outline" : "default"}
                >
                  {currentParticipants >= 2 ? "Full" : isUserInLobby ? "Enter Lobby" : "Join Match"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {lobbies.length === 0 && !loading && (
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active 1v1 Matches</h3>
          <p className="text-muted-foreground mb-4">Create the first 1v1 lobby using the button above!</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading 1v1 lobbies...</div>
        </div>
      )}
    </div>
  )
}
