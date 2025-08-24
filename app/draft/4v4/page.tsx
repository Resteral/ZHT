"use client"

import { useRef } from "react"

import { useState, useEffect, useCallback } from "react"
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
  match_participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
}

interface CountdownState {
  lobbyId: string
  countdown: number
  lobbyName: string
}

export default function Draft4v4Page() {
  const [lobbies, setLobbies] = useState<DraftLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [processedLobbies, setProcessedLobbies] = useState<Set<string>>(new Set())
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadLobbies = useCallback(async () => {
    try {
      console.log("[v0] Loading 4v4 lobbies...")

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

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
          match_participants (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("match_type", "4v4_draft")
        .eq("status", "waiting")
        .gte("created_at", thirtyMinutesAgo)
        .order("created_at", { ascending: false })

      if (matchError) throw matchError

      const currentDataHash = JSON.stringify(matches)
      if (currentDataHash === intervalRef.current) {
        return // No changes, skip update
      }
      intervalRef.current = currentDataHash

      console.log("[v0] Loaded matches:", matches?.length || 0, "matches")

      const fullLobbies =
        matches?.filter((match) => {
          const isFull = (match.match_participants?.length || 0) >= match.max_participants
          const notProcessed = !processedLobbies.has(match.id)
          const notCurrentlyCountingDown = !countdownState || countdownState.lobbyId !== match.id
          return isFull && notProcessed && notCurrentlyCountingDown
        }) || []

      for (const lobby of fullLobbies) {
        console.log("[v0] Found full lobby, starting 8-second countdown:", lobby.id)
        setProcessedLobbies((prev) => new Set(prev).add(lobby.id))
        startCountdown(lobby.id, lobby.name || `${lobby.match_type} Match`)
        break
      }

      setLobbies(matches || [])
    } catch (err) {
      console.error("[v0] Error loading lobbies:", err)
      setError(err instanceof Error ? err.message : "Failed to load lobbies")
    } finally {
      setLoading(false)
    }
  }, [processedLobbies, countdownState])

  const startCountdown = useCallback((lobbyId: string, lobbyName: string) => {
    console.log("[v0] Starting 8-second countdown for lobby:", lobbyId)

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    setCountdownState({ lobbyId, countdown: 8, lobbyName })

    if (typeof window !== "undefined") {
      try {
        const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.wav")
        audio.volume = 0.5
        audio.play().catch((e) => console.log("[v0] Could not play sound:", e))
      } catch (e) {
        console.log("[v0] Audio not available:", e)
      }
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdownState((prev) => {
        if (!prev || prev.lobbyId !== lobbyId) {
          clearInterval(countdownIntervalRef.current!)
          return null
        }

        const newCountdown = prev.countdown - 1
        console.log("[v0] Countdown for", lobbyName, ":", newCountdown)

        if (newCountdown <= 3 && newCountdown > 0 && typeof window !== "undefined") {
          try {
            const tickAudio = new Audio(
              "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_Hkk0uJRpKMBGA3jp9MMzdlH0Z2Hz/pyYSBHYyq_Xh6kezcibOTW/public/tick-sound.mp3",
            )
            tickAudio.volume = 0.3
            tickAudio.play().catch((e) => console.log("[v0] Could not play tick sound:", e))
          } catch (e) {
            console.log("[v0] Tick audio not available:", e)
          }
        }

        if (newCountdown <= 0) {
          clearInterval(countdownIntervalRef.current!)
          autoStartLobby(lobbyId, lobbyName)
          return null
        }

        return { ...prev, countdown: newCountdown }
      })
    }, 1000)
  }, [])

  const autoStartLobby = async (lobbyId: string, lobbyName: string) => {
    try {
      console.log("[v0] Auto-starting lobby after countdown:", lobbyId)
      setCountdownState(null)

      const { error: statusError } = await supabase
        .from("matches")
        .update({
          status: "drafting",
          start_date: new Date().toISOString(),
        })
        .eq("id", lobbyId)

      if (statusError) {
        console.error("[v0] Error updating lobby status:", statusError)
        throw statusError
      }

      const { data: participants, error: participantsError } = await supabase
        .from("match_participants")
        .select(`
          user_id,
          users (
            id,
            username,
            elo_rating
          )
        `)
        .eq("match_id", lobbyId)

      if (participantsError) throw participantsError

      const sortedParticipants = participants
        ?.sort((a, b) => (a.users?.elo_rating || 0) - (b.users?.elo_rating || 0))
        .slice(0, 2)

      if (!sortedParticipants || sortedParticipants.length < 2) {
        throw new Error("Not enough participants to select captains")
      }

      const lowerEloCaptain = sortedParticipants[0] // Lower ELO picks first
      const higherEloCaptain = sortedParticipants[1]

      console.log(
        "[v0] Selected captains (lower ELO first):",
        lowerEloCaptain.users?.username,
        higherEloCaptain.users?.username,
      )

      const { data: captainDraft, error: draftError } = await supabase
        .from("captain_drafts")
        .insert({
          match_id: lobbyId,
          captain1_id: lowerEloCaptain.user_id, // Lower ELO captain is captain1
          captain2_id: higherEloCaptain.user_id,
          format: "4v4",
          max_rounds: 4,
          current_round: 1,
          current_pick: 1,
          current_captain: lowerEloCaptain.user_id, // Lower ELO captain starts
          status: "drafting",
          allow_first_pick_pass: true, // Enable pass for 4v4s
          snake_pattern: "1-2", // Default to 1-2 snake pattern
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (draftError) {
        console.error("[v0] Error creating captain draft:", draftError)
        throw draftError
      }

      const draftParticipants =
        participants?.map((p) => ({
          draft_id: captainDraft.id,
          user_id: p.user_id,
          is_captain: p.user_id === lowerEloCaptain.user_id || p.user_id === higherEloCaptain.user_id,
          team: null, // Will be assigned during draft
        })) || []

      const { error: participantsInsertError } = await supabase
        .from("captain_draft_participants")
        .insert(draftParticipants)

      if (participantsInsertError) {
        console.error("[v0] Error adding draft participants:", participantsInsertError)
        throw participantsInsertError
      }

      if (typeof window !== "undefined") {
        const event = new CustomEvent("lobbyStarted", {
          detail: {
            lobbyId,
            lobbyName: `${lobbyName} - Snake Draft`,
            playerCount: 8,
            prizePool: 400,
            draftId: captainDraft.id,
            captains: [lowerEloCaptain.users?.username, higherEloCaptain.users?.username],
          },
        })
        window.dispatchEvent(event)

        setTimeout(() => {
          if (participants?.some((p) => p.user_id === user?.id)) {
            router.push(`/draft/room/${captainDraft.id}`)
          }
        }, 3000)
      }

      console.log("[v0] Successfully created snake draft:", captainDraft.id)
    } catch (error) {
      console.error("[v0] Error auto-starting lobby:", error)
      setCountdownState(null)
      await supabase.from("matches").update({ status: "waiting" }).eq("id", lobbyId)

      setProcessedLobbies((prev) => {
        const newSet = new Set(prev)
        newSet.delete(lobbyId)
        return newSet
      })
    }
  }

  const createLobby = async () => {
    setCreating(true)
    try {
      console.log("[v0] Creating 4v4 lobby...")
      if (!user) {
        throw new Error("Please log in to create a lobby")
      }

      const { data: existingMatches, error: countError } = await supabase
        .from("matches")
        .select("id")
        .eq("match_type", "4v4_draft")
        .order("created_at", { ascending: false })

      if (countError) throw countError

      const gameNumber = (existingMatches?.length || 0) + 1

      const baseElo = 1200
      const eloVariation = Math.floor(Math.random() * 600) - 300
      const userElo = Math.max(800, Math.min(2000, baseElo + eloVariation))

      const { data: currentUser } = await supabase.from("users").select("elo_rating").eq("id", user.id).single()

      if (currentUser?.elo_rating === 1200) {
        await supabase.from("users").update({ elo_rating: userElo }).eq("id", user.id)
      }

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: `4v4 ELO Game #${gameNumber}`,
          match_type: "4v4_draft",
          max_participants: 8,
          prize_pool: 400,
          status: "waiting",
          creator_id: user.id,
          game: "Omega Strikers",
        })
        .select()
        .single()

      if (matchError) throw matchError

      const { error } = await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
      })

      if (error) throw error

      console.log("[v0] Created lobby:", match.id)
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
      if (!user) {
        throw new Error("Please log in to join a lobby")
      }

      const { data: existingParticipant, error: participantCheckError } = await supabase
        .from("match_participants")
        .select("id")
        .eq("match_id", lobbyId)
        .eq("user_id", user.id)
        .single()

      if (participantCheckError && participantCheckError.code !== "PGRST116") {
        throw participantCheckError
      }

      if (existingParticipant) {
        console.log("[v0] User already in lobby, redirecting to lobby page")
        router.push(`/leagues/lobby/${lobbyId}`)
        return
      }

      const { data: currentUser } = await supabase.from("users").select("elo_rating").eq("id", user.id).single()

      if (currentUser?.elo_rating === 1200) {
        const baseElo = 1200
        const eloVariation = Math.floor(Math.random() * 600) - 300
        const userElo = Math.max(800, Math.min(2000, baseElo + eloVariation))

        await supabase.from("users").update({ elo_rating: userElo }).eq("id", user.id)
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
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    loadLobbies()
    intervalRef.current = setInterval(loadLobbies, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loadLobbies])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading 4v4 lobbies...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">4v4 ELO Draft</h1>
        <p className="text-muted-foreground">Compete in 4v4 team battles. FREE entry + $50 reward per player!</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {countdownState && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg shadow-lg">
          <div className="flex items-center justify-center gap-3 text-green-800">
            <Clock className="h-6 w-6 animate-pulse" />
            <div className="text-center">
              <div className="text-lg font-bold">🎉 Lobby Full!</div>
              <div className="text-sm font-medium">{countdownState.lobbyName}</div>
              <div className="text-xl font-bold mt-1">
                Starting in {countdownState.countdown} second{countdownState.countdown !== 1 ? "s" : ""}...
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Create 4v4 Lobby
            </CardTitle>
            <CardDescription>Start a new 4v4 draft lobby</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={createLobby} disabled={creating} className="w-full">
              {creating ? "Creating..." : "Create Lobby"}
            </Button>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />8 Players Required
              </div>
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-4 w-4" />
                FREE + $50 Reward
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active 4v4 Lobbies</h2>

        {lobbies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active 4v4 lobbies</p>
              <p className="text-sm text-muted-foreground mt-2">Create the first lobby to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lobbies.map((lobby) => {
              const currentParticipants = lobby.match_participants?.length || 0
              const isCountingDown = countdownState?.lobbyId === lobby.id
              return (
                <Card key={lobby.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{lobby.name}</CardTitle>
                      <Badge variant={isCountingDown ? "destructive" : "secondary"}>
                        {isCountingDown ? `Starting in ${countdownState.countdown}s` : `${currentParticipants}/8`}
                      </Badge>
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
                        <div className="font-medium mb-2">Players ({currentParticipants}/8):</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {lobby.match_participants?.map((participant, index) => (
                            <div
                              key={participant.user_id}
                              className="flex justify-between items-center text-xs p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium">
                                  {(participant.users?.username || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{participant.users?.username || "Unknown Player"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {participant.users?.elo_rating || 1200} ELO
                                </span>
                                {participant.user_id === user?.id && (
                                  <Badge variant="outline" className="text-xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {Array.from({ length: 8 - currentParticipants }).map((_, index) => (
                            <div
                              key={`empty-${index}`}
                              className="flex justify-between items-center text-xs p-2 bg-muted/20 rounded border-dashed border"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <span className="text-muted-foreground">Waiting for player...</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => joinLobby(lobby.id)}
                        className="w-full"
                        disabled={currentParticipants >= 8 || isCountingDown}
                        variant={lobby.match_participants?.some((p) => p.user_id === user?.id) ? "outline" : "default"}
                      >
                        {isCountingDown
                          ? `Starting in ${countdownState.countdown}s`
                          : currentParticipants >= 8
                            ? "Lobby Full"
                            : lobby.match_participants?.some((p) => p.user_id === user?.id)
                              ? "Enter Lobby"
                              : user
                                ? "Join Lobby"
                                : "Login to Join"}
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
