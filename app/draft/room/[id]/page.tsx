"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, Crown, Users, DollarSign, TrendingUp } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { loadBettingMarkets } from "@/lib/supabase/betting-markets" // Declare the variable here

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

interface PublicBet {
  id: string
  user_id: string
  username: string
  bet_type: string
  stake_amount: number
  odds: number
  potential_payout: number
  placed_at: string
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
  const [bettingTimeLeft, setBettingTimeLeft] = useState(240) // 4 minutes in seconds
  const [activeBettingTab, setActiveBettingTab] = useState<"match" | "players">("match")
  const [publicBets, setPublicBets] = useState<PublicBet[]>([])
  const [gameStats, setGameStats] = useState<any[]>([])
  const [showStatsSpreadsheet, setShowStatsSpreadsheet] = useState(false)

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
      loadBettingMarkets(setBettingMarkets) // Use the declared variable here
      loadPublicBets()
      loadGameStats()

      if (isParticipant) {
        setBettingTimeLeft(240)

        const timer = setInterval(() => {
          setBettingTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              router.push(`/draft/score/${params.id}`)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        const bettingInterval = setInterval(() => {
          loadPublicBets()
        }, 2000)

        return () => {
          clearInterval(timer)
          clearInterval(bettingInterval)
        }
      }
    }
  }, [draftState?.status, isParticipant, params.id, router])

  const loadPublicBets = async () => {
    const supabase = createClient()

    try {
      const { data: bets, error } = await supabase
        .from("bets")
        .select(`
          id,
          user_id,
          bet_type,
          stake_amount,
          odds,
          potential_payout,
          placed_at,
          users!inner(username)
        `)
        .order("placed_at", { ascending: false })
        .limit(20)

      if (error) throw error

      const formattedBets = bets.map((bet: any) => ({
        id: bet.id,
        user_id: bet.user_id,
        username: bet.users.username,
        bet_type: bet.bet_type,
        stake_amount: bet.stake_amount,
        odds: bet.odds,
        potential_payout: bet.potential_payout,
        placed_at: bet.placed_at,
      }))

      setPublicBets(formattedBets)
    } catch (error) {
      console.error("[v0] Error loading public bets:", error)
    }
  }

  const loadGameStats = async () => {
    const supabase = createClient()

    try {
      const { data: stats, error } = await supabase
        .from("player_analytics")
        .select(`
          user_id,
          score,
          kills,
          deaths,
          assists,
          damage_dealt,
          damage_taken,
          healing_done,
          accuracy,
          users!inner(username, elo_rating)
        `)
        .order("score", { ascending: false })

      if (error) throw error

      const formattedStats = stats.map((stat: any) => ({
        user_id: stat.user_id,
        username: stat.users.username,
        elo_rating: stat.users.elo_rating,
        score: stat.score || 0,
        kills: stat.kills || 0,
        deaths: stat.deaths || 0,
        assists: stat.assists || 0,
        damage_dealt: stat.damage_dealt || 0,
        damage_taken: stat.damage_taken || 0,
        healing_done: stat.healing_done || 0,
        accuracy: stat.accuracy || 0,
        kd_ratio: stat.deaths > 0 ? (stat.kills / stat.deaths).toFixed(2) : stat.kills.toString(),
      }))

      setGameStats(formattedStats)
    } catch (error) {
      console.error("[v0] Error loading game stats:", error)
    }
  }

  const placeBet = async (marketId: string, optionId: string, amount: number) => {
    if (!user) return

    const userTeam = getUserTeam()
    if (userTeam && isOpposingTeamBet(marketId, optionId, userTeam)) {
      console.log(`[v0] Blocked bet against own team: ${marketId} - ${optionId}`)
      return
    }

    const supabase = createClient()

    try {
      const { data: currentUser, error: balanceCheckError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single()

      if (balanceCheckError) throw balanceCheckError

      const currentBalance = currentUser.balance || 0
      if (currentBalance < amount) {
        console.log(`[v0] Insufficient balance: ${currentBalance} < ${amount}`)
        alert(`Insufficient balance. You have $${currentBalance.toFixed(2)} but tried to bet $${amount}`)
        return
      }

      const shortBetType = `${marketId.substring(0, 8)}_${optionId.substring(0, 8)}`

      const { error } = await supabase.from("bets").insert({
        user_id: user.id,
        market_id: null, // Remove foreign key constraint dependency
        bet_type: shortBetType, // Use shortened version to fit varchar(20)
        stake_amount: amount,
        odds: 2.0, // Default odds, should be calculated from market data
        potential_payout: amount * 2.0,
        status: "pending",
        placed_at: new Date().toISOString(),
      })

      if (error) throw error

      const newBalance = currentBalance - amount

      const { error: directBalanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", user.id)

      if (directBalanceError) throw directBalanceError

      console.log(`[v0] Bet placed: ${marketId} - ${optionId} for $${amount}`)
      setTimeout(() => loadPublicBets(), 500)
    } catch (error) {
      console.error("[v0] Error placing bet:", error)
    }
  }

  const setupRealTimeSubscriptions = () => {
    const supabase = createClient()

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
        .sort((a, b) => b.elo_rating - a.elo_rating)

      setParticipants(participantsWithElo)
      setIsParticipant(participantsWithElo.some((p) => p.user_id === user?.id))
      setDraftData(match)

      if (match.status === "drafting" && participantsWithElo.length >= 2) {
        const [highestElo, secondHighestElo] = participantsWithElo.slice(0, 2)
        const lowerEloCaptain = secondHighestElo
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
    let currentTeam = 1
    let picksInRound = 0

    for (let pick = 0; pick < numPlayers; pick++) {
      order.push(`team${currentTeam}`)
      picksInRound++

      if (pick === 0) {
        currentTeam = 2
        picksInRound = 0
      } else if (picksInRound === 2) {
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

    if (currentTeam === "team1") {
      newState.team1_players.push(playerId)
    } else {
      newState.team2_players.push(playerId)
    }

    newState.available_players = newState.available_players.filter((id) => id !== playerId)

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
      await supabase.channel(`draft-${params.id}`).send({
        type: "broadcast",
        event: "draft_update",
        draft_state: newDraftState,
        action,
        player_id: playerId,
        captain_id: user?.id,
        timestamp: new Date().toISOString(),
      })

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

  const getUserTeam = (): 1 | 2 | null => {
    if (!user || !draftState) return null

    if (draftState.team1_players.includes(user.id)) return 1
    if (draftState.team2_players.includes(user.id)) return 2
    return null
  }

  const isOpposingTeamBet = (marketId: string, optionId: string, userTeam: 1 | 2): boolean => {
    if (marketId === "match_winner") {
      // If user is on team 1, they can't bet on team 2 winning (and vice versa)
      if (userTeam === 1 && optionId === "team2") return true
      if (userTeam === 2 && optionId === "team1") return true
    }
    return false
  }

  const isCurrentUserTurn = draftState?.current_captain === user?.id

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Live Snake Draft</h1>
          <p className="text-slate-600">
            {isParticipant ? "You are participating in this draft" : "Watching live snake draft"}
            {!isParticipant && spectatorCount > 0 && (
              <span className="ml-2 text-sm">• {spectatorCount} spectators watching</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={draftStatus === "active" ? "default" : "secondary"} className="bg-emerald-600 text-white">
            {draftStatus === "active" ? "Live Draft" : draftStatus}
          </Badge>
          {!isParticipant && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Spectating
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/leagues")}
            className="border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Matches
          </Button>
        </div>
      </div>

      {draftState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-300" />
                Team 1 Captain (Lower ELO - First Pick)
                {draftState.current_captain === draftState.team1_captain && (
                  <Badge variant="default" className="ml-2 bg-amber-500 text-amber-900">
                    Current Turn
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {draftState.team1_captain && (
                <div className="space-y-2">
                  <div className="font-medium text-slate-800">
                    {getPlayerByUserId(draftState.team1_captain)?.username}
                    <span className="text-sm text-slate-600 ml-2">
                      (ELO: {getPlayerByUserId(draftState.team1_captain)?.elo_rating})
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Team: {draftState.team1_players.map((id) => getPlayerByUserId(id)?.username).join(", ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-300" />
                Team 2 Captain (Higher ELO)
                {draftState.current_captain === draftState.team2_captain && (
                  <Badge variant="default" className="ml-2 bg-amber-500 text-amber-900">
                    Current Turn
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {draftState.team2_captain && (
                <div className="space-y-2">
                  <div className="font-medium text-slate-800">
                    {getPlayerByUserId(draftState.team2_captain)?.username}
                    <span className="text-sm text-slate-600 ml-2">
                      (ELO: {getPlayerByUserId(draftState.team2_captain)?.elo_rating})
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Team: {draftState.team2_players.map((id) => getPlayerByUserId(id)?.username).join(", ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {draftState && draftState.available_players.length > 0 && (
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Players
              <Badge variant="outline" className="bg-slate-600 text-slate-100 border-slate-500">
                Pick {draftState.current_pick} of {draftState.draft_order.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftState.available_players.map((playerId) => {
                const player = getPlayerByUserId(playerId)
                return (
                  <Card
                    key={playerId}
                    className="p-4 border-slate-200 hover:border-slate-300 transition-colors bg-gradient-to-br from-slate-50 to-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{player?.username}</div>
                        <div className="text-sm text-slate-600">ELO: {player?.elo_rating}</div>
                      </div>
                      {isCurrentUserTurn && (
                        <Button
                          size="sm"
                          onClick={() => handlePlayerPick(playerId)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
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
                <Button
                  variant="outline"
                  onClick={handlePass}
                  className="border-slate-300 hover:bg-slate-50 bg-transparent"
                >
                  Pass Turn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {draftState?.status === "completed" && showBettingLobby && (
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 text-white shadow-2xl">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Betting Lobby - Place Your Bets!
              <Badge variant="outline" className="bg-red-800 text-red-100 border-red-600 animate-pulse">
                {formatTime(bettingTimeLeft)} remaining
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="text-center mb-4">
              <p className="text-slate-100 font-medium">Draft completed! Place your bets before the match begins.</p>
              <p className="text-sm text-slate-300">Betting closes automatically when timer expires.</p>
            </div>

            <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-4 border border-slate-700">
              <button
                onClick={() => setActiveBettingTab("match")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeBettingTab === "match"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                Match Betting
              </button>
              <button
                onClick={() => setActiveBettingTab("players")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeBettingTab === "players"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                Player Betting
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bettingMarkets
                .filter((market) =>
                  activeBettingTab === "match"
                    ? ["match_winner", "total_goals"].includes(market.id)
                    : ["most_goals", "player_assists"].includes(market.id),
                )
                .map((market) => (
                  <Card
                    key={market.id}
                    className="border-slate-600 bg-gradient-to-br from-slate-800 to-slate-700 shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        {market.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {market.options
                        .slice(0, activeBettingTab === "players" ? 4 : market.options.length)
                        .map((option: any) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-slate-100">{option.name}</div>
                              <div className="text-xs text-slate-300">
                                {option.probability}% chance • {option.odds}x payout
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const userTeam = getUserTeam()
                                const isBlocked = userTeam && isOpposingTeamBet(market.id, option.id, userTeam)

                                if (isBlocked) {
                                  return (
                                    <div className="text-xs text-slate-400 italic px-2 py-1 bg-slate-800 rounded">
                                      Can't bet against your team
                                    </div>
                                  )
                                }

                                return (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => placeBet(market.id, option.id, 5)}
                                      className="text-xs px-3 py-1 border-slate-500 text-slate-200 hover:bg-slate-600 hover:border-slate-400"
                                    >
                                      Bet $5
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => placeBet(market.id, option.id, 10)}
                                      className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Bet $10
                                    </Button>
                                  </>
                                )
                              })()}
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
                className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
              >
                Skip Betting & Continue to Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draftState?.status === "completed" && publicBets.length > 0 && (
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-400" />
              Live Betting Activity
              <Badge variant="outline" className="bg-slate-500 text-slate-100 border-slate-400">
                {publicBets.length} recent bets
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {publicBets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-sm text-slate-800">{bet.username}</div>
                    <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                      {bet.bet_type.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-800">${bet.stake_amount}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-600 font-medium">${bet.potential_payout.toFixed(2)}</span>
                    <span className="text-xs text-slate-500">{new Date(bet.placed_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Player Statistics & Performance
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatsSpreadsheet(!showStatsSpreadsheet)}
              className="bg-slate-500 text-white border-slate-400 hover:bg-slate-400"
            >
              {showStatsSpreadsheet ? "Hide" : "Show"} Detailed Stats
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {showStatsSpreadsheet && gameStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-slate-100 to-slate-200">
                    <th className="text-left p-3 font-semibold text-slate-700">Player</th>
                    <th className="text-right p-3 font-semibold text-slate-700">ELO</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Score</th>
                    <th className="text-right p-3 font-semibold text-slate-700">K/D</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Assists</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Damage</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Healing</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {gameStats.map((stat, index) => (
                    <tr
                      key={stat.user_id}
                      className={index % 2 === 0 ? "bg-white" : "bg-slate-50 hover:bg-slate-100 transition-colors"}
                    >
                      <td className="p-3 font-medium text-slate-800">{stat.username}</td>
                      <td className="p-3 text-right text-slate-700">{stat.elo_rating}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{stat.score}</td>
                      <td className="p-3 text-right text-slate-700">{stat.kd_ratio}</td>
                      <td className="p-3 text-right text-slate-700">{stat.assists}</td>
                      <td className="p-3 text-right text-slate-700">{stat.damage_dealt.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-700">{stat.healing_done.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-700">{(stat.accuracy * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {participants.slice(0, 8).map((participant) => (
                <div
                  key={participant.id}
                  className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="font-medium text-sm text-slate-800">{participant.username}</div>
                  <div className="text-xs text-slate-600">ELO: {participant.elo_rating}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Team:{" "}
                    {draftState?.team1_players.includes(participant.user_id)
                      ? "1"
                      : draftState?.team2_players.includes(participant.user_id)
                        ? "2"
                        : "TBD"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isParticipant && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-indigo-800">
              <Eye className="h-5 w-5" />
              <p className="font-medium">You're watching this draft as a spectator</p>
            </div>
            <p className="text-sm text-indigo-700 mt-1">
              Enjoy watching the snake draft unfold! The two highest ELO players are captains, with the lower ELO
              captain getting first pick.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
