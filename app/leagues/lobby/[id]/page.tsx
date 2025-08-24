"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, MessageCircle, Crown, Sparkles, Users, UserPlus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { formatDateEST, formatTimeEST } from "@/lib/utils/timezone"

interface LobbyData {
  id: string
  name: string
  match_type: string
  max_participants: number
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

export default function MatchLobbyPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()
  const [lobby, setLobby] = useState<LobbyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showActivationAnimation, setShowActivationAnimation] = useState(false)
  const [captains, setCaptains] = useState<Array<{ user_id: string; username: string; elo_rating: number }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  const [recentJoins, setRecentJoins] = useState<string[]>([])
  const [showJoinNotification, setShowJoinNotification] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadLobbyData = useCallback(async () => {
    if (isProcessing) return

    try {
      console.log("[v0] Loading lobby data for:", params.id)

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          max_participants,
          prize_pool,
          status,
          created_at,
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", params.id)

      if (error) {
        console.error("[v0] Error loading lobby:", error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log("[v0] Lobby not found - likely cleaned up due to inactivity")
        toast.error("This lobby is no longer available. It may have been cleaned up due to inactivity.")
        router.push("/leagues")
        return
      }

      const lobbyData = data[0] // Get first result since we removed .single()

      console.log("[v0] Lobby data loaded successfully:", {
        status: lobbyData.status,
        participants: lobbyData.match_participants.length,
        maxParticipants: lobbyData.max_participants,
        participantNames: lobbyData.match_participants.map((p) => p.users?.username).join(", "),
      })

      setLobby(lobbyData)
    } catch (error) {
      console.error("Error loading lobby:", error)
      if (error.message?.includes("Cannot coerce")) {
        toast.error("This lobby is no longer available")
        router.push("/leagues")
      } else {
        toast.error("Failed to load lobby data")
      }
    } finally {
      if (loading) {
        setLoading(false)
      }
    }
  }, [params.id, isProcessing, loading, router])

  useEffect(() => {
    loadLobbyData()

    console.log("[v0] Setting up real-time subscriptions for lobby:", params.id)

    const matchSubscription = supabase
      .channel(`match-updates-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log("[v0] Match updated via subscription:", payload)

          if (payload.new?.status === "drafting" && payload.old?.status === "waiting") {
            toast.success("🎯 Lobby is starting! Captains have been selected!", {
              duration: 5000,
              position: "top-center",
            })

            try {
              const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.wav")
              audio.play().catch((e) => console.log("Audio play failed:", e))
            } catch (e) {
              console.log("Audio not available:", e)
            }
          }

          setTimeout(() => loadLobbyData(), 100)
        },
      )
      .subscribe((status) => {
        console.log("[v0] Match subscription status:", status)
      })

    const participantSubscription = supabase
      .channel(`participants-updates-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_participants",
          filter: `match_id=eq.${params.id}`,
        },
        async (payload) => {
          console.log("[v0] New participant joined via subscription:", payload)

          try {
            const { data: userData } = await supabase
              .from("users")
              .select("username")
              .eq("id", payload.new.user_id)
              .single()

            if (userData && payload.new.user_id !== user?.id) {
              const username = userData.username
              console.log("[v0] Showing join notification for:", username)

              setRecentJoins((prev) => [...prev.slice(-2), username])
              setShowJoinNotification(true)

              toast.success(`🎮 ${username} joined the lobby!`, {
                duration: 3000,
                position: "top-right",
              })

              setTimeout(() => setShowJoinNotification(false), 3000)
            }

            setTimeout(() => loadLobbyData(), 100)
          } catch (error) {
            console.error("[v0] Error handling participant join:", error)
            setTimeout(() => loadLobbyData(), 100)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "match_participants",
          filter: `match_id=eq.${params.id}`,
        },
        (payload) => {
          console.log("[v0] Participant left via subscription:", payload)
          toast.info("A player left the lobby", {
            duration: 2000,
            position: "top-right",
          })
          setTimeout(() => loadLobbyData(), 100)
        },
      )
      .subscribe((status) => {
        console.log("[v0] Participant subscription status:", status)
      })

    refreshIntervalRef.current = setInterval(() => {
      if (!isProcessing && !hasRedirected) {
        console.log("[v0] Periodic lobby data refresh")
        loadLobbyData()
      }
    }, 3000)

    return () => {
      console.log("[v0] Cleaning up lobby subscriptions")
      matchSubscription.unsubscribe()
      participantSubscription.unsubscribe()
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [params.id, user?.id, loadLobbyData, isProcessing, hasRedirected])

  useEffect(() => {
    if (lobby && lobby.match_participants.length >= lobby.max_participants && !isProcessing && !hasRedirected) {
      if (lobby.status === "waiting" || lobby.status === "active") {
        console.log("[v0] Lobby full, activating...")
        handleLobbyActivation()
      } else if (lobby.status === "drafting") {
        console.log("[v0] Lobby in drafting status, redirecting to draft room...")
        setHasRedirected(true)
        router.push(`/draft/room/${lobby.id}`)
      }
    }
  }, [lobby, router, isProcessing, hasRedirected])

  useEffect(() => {
    if (lobby) {
      const currentParticipants = lobby.match_participants.length
      const isFull = currentParticipants >= lobby.max_participants
      const isUserInLobby = lobby.match_participants.some((p) => p.user_id === user?.id)

      console.log("[v0] Button state analysis:", {
        lobbyId: lobby.id,
        lobbyName: lobby.name,
        currentParticipants,
        maxParticipants: lobby.max_participants,
        isFull,
        isUserInLobby,
        userAuthenticated: isAuthenticated,
        userId: user?.id,
        userName: user?.email || user?.user_metadata?.username,
        isProcessing,
        lobbyStatus: lobby.status,
        shouldShowJoinButton: !isFull && !isUserInLobby && isAuthenticated,
        participantUserIds: lobby.match_participants.map((p) => p.user_id),
      })
    }
  }, [lobby, user, isAuthenticated, isProcessing])

  const handleJoinLobby = async () => {
    console.log("[v0] Join lobby button clicked")
    console.log("[v0] User authenticated:", isAuthenticated)
    console.log("[v0] User object:", user)
    console.log("[v0] Lobby object:", lobby)

    if (!isAuthenticated || !user || !lobby) {
      console.log("[v0] Join lobby failed - missing requirements:", {
        isAuthenticated,
        hasUser: !!user,
        hasLobby: !!lobby,
      })
      toast.error("Please log in to join the lobby")
      return
    }

    setIsProcessing(true)

    try {
      const isAlreadyInLobby = lobby.match_participants.some((p) => p.user_id === user.id)
      console.log("[v0] User already in lobby:", isAlreadyInLobby)

      if (isAlreadyInLobby) {
        toast.info("You're already in this lobby")
        return
      }

      const currentParticipants = lobby.match_participants.length
      if (currentParticipants >= lobby.max_participants) {
        console.log("[v0] Lobby is full, cannot join")
        toast.error("Lobby is full")
        return
      }

      console.log("[v0] Attempting to insert participant:", {
        match_id: lobby.id,
        user_id: user.id,
      })

      const { data, error } = await supabase
        .from("match_participants")
        .insert({
          match_id: lobby.id,
          user_id: user.id,
        })
        .select()

      console.log("[v0] Insert result:", { data, error })

      if (error) {
        console.error("[v0] Database error joining lobby:", error)
        toast.error(`Failed to join lobby: ${error.message || error.details || "Database error"}`)
        return
      }

      console.log("[v0] Successfully joined lobby")
      toast.success("Joined lobby successfully!")

      await loadLobbyData()
      setTimeout(() => loadLobbyData(), 500)
    } catch (error) {
      console.error("[v0] Error joining lobby:", error)
      toast.error(`Failed to join lobby: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLeaveLobby = async () => {
    console.log("[v0] Leave lobby button clicked")

    if (!isAuthenticated || !user || !lobby) {
      toast.error("Unable to leave lobby")
      return
    }

    setIsProcessing(true)

    try {
      const { error } = await supabase
        .from("match_participants")
        .delete()
        .eq("match_id", lobby.id)
        .eq("user_id", user.id)

      if (error) {
        console.error("[v0] Database error leaving lobby:", error)
        toast.error(`Failed to leave lobby: ${error.message || "Database error"}`)
        return
      }

      console.log("[v0] Successfully left lobby")
      toast.success("Left lobby successfully!")

      await loadLobbyData()
      setTimeout(() => loadLobbyData(), 500)
    } catch (error) {
      console.error("[v0] Error leaving lobby:", error)
      toast.error(`Failed to leave lobby: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLobbyActivation = async () => {
    if (!lobby || isProcessing) return

    setIsProcessing(true)
    console.log("[v0] Starting lobby activation process")

    const sortedPlayers = [...lobby.match_participants]
      .filter((p) => p.users?.elo_rating)
      .sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))

    console.log(
      "[v0] Sorted players by ELO:",
      sortedPlayers.map((p) => `${p.users?.username} (${p.users?.elo_rating})`),
    )

    const topTwoCaptains = sortedPlayers.slice(0, 2).map((p) => ({
      user_id: p.user_id,
      username: p.users?.username || "Unknown",
      elo_rating: p.users?.elo_rating || 1200,
    }))

    console.log("[v0] Selected captains:", topTwoCaptains)
    setCaptains(topTwoCaptains)
    setShowActivationAnimation(true)

    try {
      const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.wav")
      audio.play().catch((e) => console.log("Audio play failed:", e))
    } catch (e) {
      console.log("Audio not available:", e)
    }

    try {
      const { error: statusError } = await supabase
        .from("matches")
        .update({
          status: "drafting",
          name: `${lobby.name} - Snake Draft`,
        })
        .eq("id", lobby.id)
        .in("status", ["waiting", "active"]) // Allow transition from both waiting and active

      if (statusError) {
        console.error("Error updating match status:", statusError)
        throw statusError
      }

      console.log("[v0] Lobby activated successfully, transitioning to snake draft")

      toast.success(`🏆 Snake Draft Starting! Captains: ${topTwoCaptains.map((c) => c.username).join(" vs ")}`, {
        duration: 3000,
        position: "top-center",
      })

      setHasRedirected(true)
      router.push(`/draft/room/${lobby.id}`)
    } catch (error) {
      console.error("Error activating lobby:", error)
      toast.error("Failed to activate lobby")
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">Loading lobby...</div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">Lobby not found</div>
      </div>
    )
  }

  const currentParticipants = lobby.match_participants.length
  const isFull = currentParticipants >= lobby.max_participants
  const isUserInLobby = lobby.match_participants.some((p) => p.user_id === user?.id)
  const isActive = lobby.status === "active" || lobby.status === "drafting"

  console.log("[v0] Render state:", {
    showJoinButton: !isFull && !isUserInLobby && isAuthenticated,
    isFull,
    isUserInLobby,
    isAuthenticated,
    isProcessing,
    currentParticipants,
    maxParticipants: lobby.max_participants,
  })

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      {showJoinNotification && recentJoins.length > 0 && (
        <div className="fixed top-20 right-4 z-40 animate-in slide-in-from-right duration-500">
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    {recentJoins[recentJoins.length - 1]} joined!
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {currentParticipants}/{lobby.max_participants} players
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showActivationAnimation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-1000">
          <div className="text-center space-y-6 animate-in zoom-in duration-1000">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-16 w-16 text-yellow-500 mx-auto opacity-75" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white animate-in slide-in-from-bottom duration-1000">
                LOBBY ACTIVATED!
              </h2>
              <div className="text-xl text-yellow-400 animate-in slide-in-from-bottom duration-1000 delay-500">
                Captains Selected
              </div>
              <div className="flex justify-center gap-8 animate-in slide-in-from-bottom duration-1000 delay-1000">
                {captains.map((captain, index) => (
                  <div key={captain.user_id} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Crown className="h-6 w-6 text-yellow-500" />
                      <span className="text-lg font-bold text-white">{captain.username}</span>
                    </div>
                    <div className="text-sm text-gray-300">ELO: {captain.elo_rating}</div>
                    <Badge variant="secondary" className="mt-1">
                      Captain {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-400 animate-in slide-in-from-bottom duration-1000 delay-1500">
                Transitioning to Snake Draft...
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{lobby.name || `${lobby.match_type} Match`}</h1>
            <p className="text-muted-foreground">
              {isActive
                ? "Draft starting! Captains have been selected."
                : isFull
                  ? "Lobby is full! Selecting captains..."
                  : "Waiting for players to join..."}
            </p>
          </div>
          <Badge
            variant={lobby.status === "waiting" ? "secondary" : lobby.status === "drafting" ? "default" : "outline"}
          >
            {lobby.status === "waiting"
              ? "Waiting"
              : lobby.status === "drafting"
                ? "Starting Draft"
                : lobby.status === "active"
                  ? "Activating"
                  : lobby.status}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Players ({currentParticipants}/{lobby.max_participants})
                    {captains.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">• Captains Selected</span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    {lobby.status === "drafting" && (
                      <Button onClick={() => router.push(`/draft/room/${lobby.id}`)} variant="outline" size="sm">
                        Join Draft
                      </Button>
                    )}
                    {!isFull && !isUserInLobby && isAuthenticated && (
                      <Button
                        onClick={() => {
                          console.log("[v0] Join button clicked - Button state:", {
                            isFull,
                            isUserInLobby,
                            currentParticipants,
                            maxParticipants: lobby.max_participants,
                            userAuthenticated: isAuthenticated,
                            userId: user?.id,
                            userName: user?.email || user?.user_metadata?.username,
                            isProcessing,
                          })
                          handleJoinLobby()
                        }}
                        size="sm"
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? "Joining..." : "Join Lobby"}
                      </Button>
                    )}
                    {isUserInLobby && isAuthenticated && lobby.status === "waiting" && (
                      <Button
                        onClick={handleLeaveLobby}
                        size="sm"
                        disabled={isProcessing}
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50 bg-transparent"
                      >
                        {isProcessing ? "Leaving..." : "Leave Lobby"}
                      </Button>
                    )}
                    {!isFull && !isUserInLobby && !isAuthenticated && (
                      <Button
                        onClick={() => {
                          console.log("[v0] Authentication required for join")
                          toast.error("Please log in to join the lobby")
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Login to Join
                      </Button>
                    )}
                    {(isFull || (isUserInLobby && lobby.status !== "waiting")) && (
                      <div className="text-xs text-muted-foreground">{isFull ? "Lobby Full" : "Already Joined"}</div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lobby.match_participants
                    .sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))
                    .map((participant, index) => {
                      const isCaptain = captains.some((c) => c.user_id === participant.user_id)
                      return (
                        <div
                          key={participant.user_id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-300 ${
                            isCaptain ? "border-yellow-500 bg-yellow-500/10 animate-pulse" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isCaptain && <Crown className="h-4 w-4 text-yellow-500 animate-pulse" />}
                            <div>
                              <div className="font-medium">
                                {participant.users?.username || "Unknown Player"}
                                {participant.user_id === user?.id && " (You)"}
                                {isCaptain && " (Captain)"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ELO: {participant.users?.elo_rating || 1200}
                                {index < 2 && " • Top Player"}
                              </div>
                            </div>
                          </div>
                          <Badge variant={isCaptain ? "default" : "secondary"}>{isCaptain ? "Captain" : "Ready"}</Badge>
                        </div>
                      )
                    })}

                  {Array.from({ length: lobby.max_participants - currentParticipants }).map((_, index) => (
                    <div key={`empty-${index}`} className="flex items-center p-3 border rounded-lg border-dashed">
                      <div className="text-muted-foreground">Waiting for player...</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {(isFull || isActive) && (
              <Card className={isActive ? "border-yellow-500 bg-yellow-500/5" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${isActive ? "text-yellow-500" : "text-green-500"}`}>
                      {isActive ? "Activating!" : "Lobby Full!"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isActive ? "Selecting captains for snake draft" : "Draft will begin automatically"}
                    </p>
                    {captains.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">First captain can pass their first pick</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Lobby Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatTimeEST(lobby.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{formatDateEST(lobby.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-500">${lobby.prize_pool / lobby.max_participants}</div>
                  <p className="text-sm text-muted-foreground">per player</p>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                    FREE Entry
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Lobby Chat
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
          </div>
        </div>
      </div>
    </div>
  )
}
