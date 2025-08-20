"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Plus, Gamepad2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

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

export default function TwoVTwoPage() {
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
      console.log("[v0] Loading 2v2 lobbies...")
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
        .eq("match_type", "2v2_draft")
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
      console.log("[v0] Creating 2v2 lobby...")

      if (!isAuthenticated || !user) {
        toast.error("Please log in to create a lobby")
        return
      }

      console.log("[v0] User authenticated:", user.id)

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: `2v2 Draft Lobby - ${new Date().toLocaleTimeString()}`,
          match_type: "2v2_draft",
          max_participants: 4,
          prize_pool: 40, // Updated from 200 to 40 ($10 per player * 4 players)
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

      if (participantError) {
        console.error("[v0] Error adding participant:", participantError)
        throw participantError
      }

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
        <h1 className="text-3xl font-bold mb-2">2v2 ELO Matches</h1>
        <p className="text-muted-foreground">
          Team-based 2v2 matches with captain draft. Earn $10 per game and improve your ELO rating.{" "}
          {/* Updated from $50 to $10 per game */}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Create New Match</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">Start a new 2v2 lobby with captain draft</p>
            <Button onClick={createLobby} disabled={creating} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Creating..." : "Create Lobby"}
            </Button>
          </CardContent>
        </Card>

        {lobbies.map((lobby) => {
          const currentParticipants = lobby.match_participants?.length || 0
          const isUserInLobby = lobby.match_participants?.some((p) => p.user_id === user?.id)

          return (
            <Card key={lobby.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    2v2 Match
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
                    <span className="text-sm">{currentParticipants}/4 Players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">45s picks</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Reward:</span>
                    <span className="text-green-500 font-medium">$10</span> {/* Updated from $50 to $10 */}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>ELO:</span>
                    <span className="text-purple-500 font-medium">+/- Rating</span>
                  </div>
                </div>

                <Button
                  onClick={() => joinLobby(lobby.id)}
                  className="w-full"
                  disabled={currentParticipants >= 4}
                  variant={isUserInLobby ? "outline" : "default"}
                >
                  {currentParticipants >= 4 ? "Full" : isUserInLobby ? "Enter Lobby" : "Join Lobby"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {lobbies.length === 0 && !loading && (
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active 2v2 Matches</h3>
          <p className="text-muted-foreground mb-4">Be the first to create a 2v2 lobby!</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading 2v2 lobbies...</div>
        </div>
      )}
    </div>
  )
}
