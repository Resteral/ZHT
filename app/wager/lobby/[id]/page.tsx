"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Swords, Clock, DollarSign, MessageCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface WagerLobbyData {
  id: string
  name: string
  wager_amount: number
  max_participants: number
  status: string
  created_at: string
  wager_participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
}

export default function WagerLobbyPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()
  const [lobby, setLobby] = useState<WagerLobbyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes default

  useEffect(() => {
    loadWagerLobbyData()
    const interval = setInterval(loadWagerLobbyData, 2000)
    return () => clearInterval(interval)
  }, [params.id])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const loadWagerLobbyData = async () => {
    try {
      console.log("[v0] Loading wager lobby data for:", params.id)
      const { data, error } = await supabase
        .from("wager_matches")
        .select(`
          id,
          name,
          wager_amount,
          max_participants,
          status,
          created_at,
          wager_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", params.id)
        .single()

      if (error) {
        console.error("[v0] Error loading wager lobby:", error)
        throw error
      }

      console.log("[v0] Loaded wager lobby data:", data)
      setLobby(data)
    } catch (error) {
      console.error("Error loading wager lobby:", error)
      toast.error("Failed to load wager lobby data")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinWager = async () => {
    if (!isAuthenticated || !user || !lobby) {
      toast.error("Please log in to join the wager")
      return
    }

    try {
      // Check if user is already in the wager
      const isAlreadyInWager = lobby.wager_participants.some((p) => p.user_id === user.id)
      if (isAlreadyInWager) {
        toast.info("You're already in this wager")
        return
      }

      const { error } = await supabase.from("wager_participants").insert({
        wager_match_id: lobby.id,
        user_id: user.id,
      })

      if (error) throw error

      toast.success("Joined wager successfully!")
      loadWagerLobbyData()
    } catch (error) {
      console.error("Error joining wager:", error)
      toast.error("Failed to join wager")
    }
  }

  const handleReady = async () => {
    toast.info("Ready functionality coming soon!")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">Loading wager lobby...</div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">Wager lobby not found</div>
      </div>
    )
  }

  const currentParticipants = lobby.wager_participants.length
  const isFull = currentParticipants >= lobby.max_participants
  const isUserInWager = lobby.wager_participants.some((p) => p.user_id === user?.id)
  const totalPot = lobby.wager_amount * lobby.max_participants
  const platformFee = totalPot * 0.25 // 25% platform fee
  const winnerPot = totalPot * 0.75 // 75% to winner

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Swords className="h-8 w-8 text-red-500" />
              {lobby.name || "Wager Match"}
            </h1>
            <p className="text-muted-foreground">Winner takes 75% of the pot</p>
          </div>
          <Badge variant={lobby.status === "waiting" ? "secondary" : "default"}>
            {lobby.status === "waiting" ? "Waiting for Opponent" : "Ready to Start"}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Wager Match</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {lobby.wager_participants.slice(0, 2).map((participant, index) => (
                      <div key={participant.user_id} className="text-center p-4 border rounded-lg">
                        <div className="font-medium text-lg">
                          {participant.users?.username || "Unknown Player"}
                          {participant.user_id === user?.id && " (You)"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ELO: {participant.users?.elo_rating || 1200}
                        </div>
                        <Badge variant="secondary" className="mt-2">
                          Waiting
                        </Badge>
                      </div>
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: lobby.max_participants - currentParticipants }).map((_, index) => (
                      <div key={`empty-${index}`} className="text-center p-4 border rounded-lg border-dashed">
                        <div className="text-muted-foreground">Waiting for opponent...</div>
                        {!isUserInWager && (
                          <Button onClick={handleJoinWager} className="mt-2">
                            Accept Wager
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-center py-4 border-t">
                    <div className="text-2xl font-bold">VS</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{formatTime(timeLeft)}</div>
                  <p className="text-sm text-muted-foreground">Match expires</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Wager Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Each player wagers:</span>
                    <span className="font-bold">${lobby.wager_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total pot:</span>
                    <span className="font-bold">${totalPot}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Winner payout (75%):</span>
                    <span className="font-bold">${winnerPot.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Platform fee (25%):</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Pre-Match Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <div className="text-xs text-muted-foreground text-center">Chat system coming soon!</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <input placeholder="Type a message..." className="flex-1 px-2 py-1 text-sm border rounded" disabled />
                  <Button size="sm" disabled>
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {isUserInWager && (
                <Button className="w-full" onClick={handleReady} variant="secondary">
                  Ready Up
                </Button>
              )}

              {isFull && (
                <Button className="w-full" onClick={() => router.push(`/wager/match/${params.id}`)}>
                  Start Wager Match
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
