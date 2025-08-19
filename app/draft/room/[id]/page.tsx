"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, Crown, Users, DollarSign, TrendingUp } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"

interface ELODraftRoomPageProps {
  params: {
    id: string
  }
}

interface Participant {
  id: string
  user_id: string
  username: string
  elo_rating: number
  is_captain?: boolean
}

interface DraftState {
  status: "captain_selection" | "drafting" | "completed"
  current_pick: number
  current_captain: string | null
  team1_captain: string | null
  team2_captain: string | null
  team1_players: string[]
  team2_players: string[]
  available_players: string[]
  draft_order: string[]
}

export default function ELODraftRoomPage({ params }: ELODraftRoomPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [draftStatus, setDraftStatus] = useState<string>("loading")
  const [isParticipant, setIsParticipant] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [showBettingLobby, setShowBettingLobby] = useState(false)
  const [bettingMarkets, setBettingMarkets] = useState<any[]>([])

  useEffect(() => {
    initializeDraft()
    const subscriptions = setupRealTimeSubscriptions()

    const interval = setInterval(() => {
      setSpectatorCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 3) - 1))
    }, 5000)

    return () => {
      clearInterval(interval)
      subscriptions()
    }
  }, [params.id])

  useEffect(() => {
    if (draftState?.status === "completed") {
      setShowBettingLobby(true)
      loadBettingMarkets()

      if (isParticipant) {
        const timer = setTimeout(() => {
          router.push(`/draft/score/${params.id}`)
        }, 30000) // 30 seconds to place bets

        return () => clearTimeout(timer)
      }
    }
  }, [draftState?.status, isParticipant, params.id, router])

  const loadBettingMarkets = async () => {
    if (!draftState) return

    const team1Players = draftState.team1_players.map((id) => getPlayerByUserId(id)).filter(Boolean)
    const team2Players = draftState.team2_players.map((id) => getPlayerByUserId(id)).filter(Boolean)

    const team1AvgElo = team1Players.reduce((sum, p) => sum + (p?.elo_rating || 0), 0) / team1Players.length
    const team2AvgElo = team2Players.reduce((sum, p) => sum + (p?.elo_rating || 0), 0) / team2Players.length

    // Calculate odds based on ELO difference
    const eloDiff = team1AvgElo - team2AvgElo
    const team1WinProb = 1 / (1 + Math.pow(10, -eloDiff / 400))
    const team2WinProb = 1 - team1WinProb

    const markets = [
      {
        id: "match_winner",
        title: "Match Winner",
        options: [
          {
            id: "team1",
            name: `Team 1 (Avg ELO: ${Math.round(team1AvgElo)})`,
            odds: (1 / team1WinProb).toFixed(2),
            probability: (team1WinProb * 100).toFixed(1),
          },
          {
            id: "team2",
            name: `Team 2 (Avg ELO: ${Math.round(team2AvgElo)})`,
            odds: (1 / team2WinProb).toFixed(2),
            probability: (team2WinProb * 100).toFixed(1),
          },
        ],
      },
      {
        id: "total_goals",
        title: "Total Goals Over/Under",
        options: [
          { id: "over_5", name: "Over 5.5 Goals", odds: "1.85", probability: "54.1" },
          { id: "under_5", name: "Under 5.5 Goals", odds: "1.95", probability: "51.3" },
        ],
      },
    ]

    setBettingMarkets(markets)
  }

  const placeBet = async (marketId: string, optionId: string, amount: number) => {
    if (!user) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from("betting_slips").insert({
        user_id: user.id,
        match_id: params.id,
        market_type: marketId,
        selection: optionId,
        stake: amount,
        status: "pending",
        placed_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update user balance
      const { error: balanceError } = await supabase
        .from("users")
        .update({
          account_balance: supabase.raw(`account_balance - ${amount}`),
        })
        .eq("id", user.id)

      if (balanceError) throw balanceError

      console.log(`[v0] Bet placed: ${marketId} - ${optionId} for $${amount}`)
    } catch (error) {
      console.error("[v0] Error placing bet:", error)
    }
  }

  const setupRealTimeSubscriptions = () => {
    const supabase = createClient()

    // Subscribe to match updates
    const matchSubscription = supabase
      .channel(`match-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log("[v0] Match updated:", payload)
          if (payload.new && payload.new.draft_state) {
            setDraftState(payload.new.draft_state)
          }
        },
      )
      .subscribe()

    // Subscribe to draft state updates (we'll store draft state in match description or separate table)
    const draftSubscription = supabase
      .channel(`draft-${params.id}`)
      .on("broadcast", { event: "draft_update" }, (payload) => {
        console.log("[v0] Draft state updated:", payload)
        setDraftState(payload.draft_state)
      })
      .subscribe()

    return () => {
      matchSubscription.unsubscribe()
      draftSubscription.unsubscribe()
    }
  }

  const cleanupSubscriptions = () => {
    const supabase = createClient()
    supabase.removeAllChannels()
  }

  const initializeDraft = async () => {
    const supabase = createClient()

    try {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("status, match_type, name, max_participants, description")
        .eq("id", params.id)
        .single()

      if (matchError || !match) {
        throw new Error("Draft not found")
      }

      if (match.status === "completed") {
        router.push(`/draft/score/${params.id}`)
        return
      }

      // Get participants with their ELO ratings
      const { data: participantData, error: participantError } = await supabase
        .from("match_participants")
        .select(`
          id,
          user_id,
          users!inner(username, elo_rating)
        `)
        .eq("match_id", params.id)

      if (participantError) {
        throw new Error("Failed to load participants")
      }

      const participantsWithElo = participantData
        .map((p) => ({
          id: p.id,
          user_id: p.user_id,
          username: p.users.username,
          elo_rating: p.users.elo_rating || 1000,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating) // Sort by ELO descending

      setParticipants(participantsWithElo)
      setIsParticipant(participantsWithElo.some((p) => p.user_id === user?.id))
      setDraftData(match)

      if (match.status === "drafting" && participantsWithElo.length >= 2) {
        const [highestElo, secondHighestElo] = participantsWithElo.slice(0, 2)
        const lowerEloCaptain = secondHighestElo // Lower ELO captain gets first pick
        const higherEloCaptain = highestElo

        const availablePlayers = participantsWithElo.slice(2).map((p) => p.user_id)

        setDraftState({
          status: "captain_selection",
          current_pick: 1,
          current_captain: lowerEloCaptain.user_id,
          team1_captain: lowerEloCaptain.user_id,
          team2_captain: higherEloCaptain.user_id,
          team1_players: [lowerEloCaptain.user_id],
          team2_players: [higherEloCaptain.user_id],
          available_players: availablePlayers,
          draft_order: generateSnakeDraftOrder(2, availablePlayers.length),
        })
        setDraftStatus("active")
      } else {
        setDraftStatus(match.status === "waiting" ? "waiting" : match.status === "active" ? "active" : "completed")
      }

      // Initialize draft state from match description if available
      if (match.description) {
        const description = JSON.parse(match.description)
        if (description.draft_state) {
          setDraftState(description.draft_state)
        }
      }
    } catch (error) {
      console.error("[v0] Error initializing draft:", error)
      setDraftStatus("error")
    }
  }

  const generateSnakeDraftOrder = (numCaptains: number, numPlayers: number) => {
    const order = []
    let currentTeam = 1 // Start with team 1 (lower ELO captain)
    let picksInRound = 0

    for (let pick = 0; pick < numPlayers; pick++) {
      order.push(`team${currentTeam}`)
      picksInRound++

      if (pick === 0) {
        // After first pick, switch to other team for 2 picks
        currentTeam = 2
        picksInRound = 0
      } else if (picksInRound === 2) {
        // After 2 picks, switch teams and reset counter
        currentTeam = currentTeam === 1 ? 2 : 1
        picksInRound = 0
      }
    }

    return order
  }

  const handlePlayerPick = async (playerId: string) => {
    if (!draftState || !isParticipant || draftState.current_captain !== user?.id) {
      return
    }

    const currentTeam = draftState.draft_order[draftState.current_pick - 1]
    const newState = { ...draftState }

    // Add player to current team
    if (currentTeam === "team1") {
      newState.team1_players.push(playerId)
    } else {
      newState.team2_players.push(playerId)
    }

    // Remove from available players
    newState.available_players = newState.available_players.filter((id) => id !== playerId)

    // Move to next pick
    newState.current_pick += 1

    if (newState.current_pick <= newState.draft_order.length) {
      const nextTeam = newState.draft_order[newState.current_pick - 1]
      newState.current_captain = nextTeam === "team1" ? newState.team1_captain : newState.team2_captain
    } else {
      newState.status = "completed"
      newState.current_captain = null
    }

    await broadcastDraftUpdate(newState, "pick", playerId)
    setDraftState(newState)
  }

  const handlePass = async () => {
    if (!draftState || !isParticipant || draftState.current_captain !== user?.id) {
      return
    }

    const newState = { ...draftState }
    newState.current_pick += 1

    if (newState.current_pick <= newState.draft_order.length) {
      const nextTeam = newState.draft_order[newState.current_pick - 1]
      newState.current_captain = nextTeam === "team1" ? newState.team1_captain : newState.team2_captain
    } else {
      newState.status = "completed"
      newState.current_captain = null
    }

    await broadcastDraftUpdate(newState, "pass")
    setDraftState(newState)
  }

  const broadcastDraftUpdate = async (newDraftState: DraftState, action: "pick" | "pass", playerId?: string) => {
    const supabase = createClient()

    try {
      // Broadcast to all connected users in this draft
      await supabase.channel(`draft-${params.id}`).send({
        type: "broadcast",
        event: "draft_update",
        draft_state: newDraftState,
        action,
        player_id: playerId,
        captain_id: user?.id,
        timestamp: new Date().toISOString(),
      })

      // Also update the match record with the new draft state
      await supabase
        .from("matches")
        .update({
          description: JSON.stringify({
            ...JSON.parse(draftData?.description || "{}"),
            draft_state: newDraftState,
          }),
        })
        .eq("id", params.id)

      console.log("[v0] Draft update broadcasted:", { action, playerId, newDraftState })
    } catch (error) {
      console.error("[v0] Error broadcasting draft update:", error)
    }
  }

  const getPlayerByUserId = (userId: string) => {
    return participants.find((p) => p.user_id === userId)
  }

  const isCurrentUserTurn = draftState?.current_captain === user?.id

  if (draftStatus === "loading") {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading draft room...</p>
          </div>
        </div>
      </div>
    )
  }

  if (draftStatus === "error") {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Draft not found</p>
          <Button onClick={() => router.push("/leagues")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Matches
          </Button>
        </div>
      </div>
    )
  }

  if (draftStatus === "waiting") {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Draft has not started yet</p>
          <Button onClick={() => router.push("/leagues")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Matches
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Snake Draft</h1>
          <p className="text-muted-foreground">
            {isParticipant ? "You are participating in this draft" : "Watching live snake draft"}
            {!isParticipant && spectatorCount > 0 && (
              <span className="ml-2 text-sm">• {spectatorCount} spectators watching</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={draftStatus === "active" ? "default" : "secondary"}>
            {draftStatus === "active" ? "Live Draft" : draftStatus}
          </Badge>
          {!isParticipant && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Spectating
            </Badge>
          )}
          <Button variant="outline" onClick={() => router.push("/leagues")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Matches
          </Button>
        </div>
      </div>

      {draftState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team 1 */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Team 1 Captain (Lower ELO - First Pick)
                {draftState.current_captain === draftState.team1_captain && (
                  <Badge variant="default" className="ml-2">
                    Current Turn
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draftState.team1_captain && (
                <div className="space-y-2">
                  <div className="font-medium">
                    {getPlayerByUserId(draftState.team1_captain)?.username}
                    <span className="text-sm text-muted-foreground ml-2">
                      (ELO: {getPlayerByUserId(draftState.team1_captain)?.elo_rating})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Team: {draftState.team1_players.map((id) => getPlayerByUserId(id)?.username).join(", ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team 2 */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Team 2 Captain (Higher ELO)
                {draftState.current_captain === draftState.team2_captain && (
                  <Badge variant="default" className="ml-2">
                    Current Turn
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draftState.team2_captain && (
                <div className="space-y-2">
                  <div className="font-medium">
                    {getPlayerByUserId(draftState.team2_captain)?.username}
                    <span className="text-sm text-muted-foreground ml-2">
                      (ELO: {getPlayerByUserId(draftState.team2_captain)?.elo_rating})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Team: {draftState.team2_players.map((id) => getPlayerByUserId(id)?.username).join(", ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {draftState && draftState.available_players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Players
              <Badge variant="outline">
                Pick {draftState.current_pick} of {draftState.draft_order.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftState.available_players.map((playerId) => {
                const player = getPlayerByUserId(playerId)
                return (
                  <Card key={playerId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{player?.username}</div>
                        <div className="text-sm text-muted-foreground">ELO: {player?.elo_rating}</div>
                      </div>
                      {isCurrentUserTurn && (
                        <Button size="sm" onClick={() => handlePlayerPick(playerId)}>
                          Pick
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>

            {isCurrentUserTurn && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={handlePass}>
                  Pass Turn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {draftState && draftState.status !== "completed" && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              {isCurrentUserTurn ? (
                <p className="font-medium text-yellow-800">It's your turn to pick! Choose a player or pass.</p>
              ) : (
                <p className="text-yellow-700">
                  Waiting for {getPlayerByUserId(draftState.current_captain!)?.username} to make their pick...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {draftState?.status === "completed" && showBettingLobby && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="h-5 w-5" />
              Betting Lobby - Place Your Bets!
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                30 seconds remaining
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-green-700 font-medium">Draft completed! Place your bets before the match begins.</p>
              <p className="text-sm text-green-600">Betting closes when you're redirected to the score screen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bettingMarkets.map((market) => (
                <Card key={market.id} className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {market.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {market.options.map((option: any) => (
                      <div key={option.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{option.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.probability}% chance • {option.odds}x payout
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => placeBet(market.id, option.id, 5)}
                            className="text-xs px-2 py-1"
                          >
                            Bet $5
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => placeBet(market.id, option.id, 10)}
                            className="text-xs px-2 py-1"
                          >
                            Bet $10
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={() => router.push(`/draft/score/${params.id}`)}
                className="bg-green-600 hover:bg-green-700"
              >
                Skip Betting & Continue to Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draftState?.status === "completed" && !showBettingLobby && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Draft Completed!</h3>
              <p className="text-green-700">Teams have been formed. Redirecting to score submission...</p>
              <Button onClick={() => router.push(`/draft/score/${params.id}`)} className="mt-4">
                Go to Score Screen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isParticipant && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" />
              <p className="font-medium">You're watching this draft as a spectator</p>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Enjoy watching the snake draft unfold! The two highest ELO players are captains, with the lower ELO
              captain getting first pick.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
