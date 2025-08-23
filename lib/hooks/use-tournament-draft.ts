"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  tournamentDraftService,
  type DraftState,
  type DraftSettings,
  type Team,
  type Player,
  type DraftPick,
} from "@/lib/services/tournament-draft-service"

const supabase = createClient()

export interface TournamentDraftHookReturn {
  // State
  draftState: DraftState | null
  draftSettings: DraftSettings | null
  teams: Team[]
  availablePlayers: Player[]
  draftHistory: DraftPick[]
  loading: boolean
  error: string | null

  // Actions
  startDraft: () => Promise<void>
  draftPlayer: (playerId: string, teamId: string) => Promise<void>
  placeBid: (playerId: string, teamId: string, bidAmount: number) => Promise<void>
  startPlayerAuction: (playerId: string) => Promise<void>
  pauseDraft: () => Promise<void>

  // Real-time status
  isConnected: boolean
  lastUpdate: string | null
}

export function useTournamentDraft(tournamentId: string, userId?: string): TournamentDraftHookReturn {
  // State management
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [draftSettings, setDraftSettings] = useState<DraftSettings | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [draftHistory, setDraftHistory] = useState<DraftPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    if (!tournamentId) return

    let channel: RealtimeChannel
    let mounted = true

    const initializeDraft = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load initial draft data
        const { draftState: initialState, settings } = await tournamentDraftService.initializeDraft(tournamentId)
        const initialTeams = await tournamentDraftService.getTeamsWithRosters(tournamentId)
        const initialPlayers = await tournamentDraftService.getAvailablePlayers(tournamentId)
        const initialHistory = await tournamentDraftService.getDraftHistory(tournamentId)

        if (mounted) {
          setDraftState(initialState)
          setDraftSettings(settings)
          setTeams(initialTeams)
          setAvailablePlayers(initialPlayers)
          setDraftHistory(initialHistory)
          setLoading(false)
        }

        // Setup real-time subscriptions
        channel = supabase
          .channel(`tournament-draft-${tournamentId}`)
          .on("broadcast", { event: "draft_started" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "draft_update" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "player_drafted" }, (payload) => {
            if (!mounted) return
            const { pick } = payload.data

            // Update draft state
            setDraftState(payload.draft_state)

            // Update draft history
            setDraftHistory((prev) => [...prev, pick])

            // Update available players
            setAvailablePlayers((prev) => prev.filter((p) => p.id !== pick.player_id))

            // Update team rosters
            setTeams((prev) =>
              prev.map((team) => {
                if (team.id === pick.team_id) {
                  const draftedPlayer = availablePlayers.find((p) => p.id === pick.player_id)
                  if (draftedPlayer) {
                    return {
                      ...team,
                      players: [
                        ...team.players,
                        {
                          ...draftedPlayer,
                          status: "drafted" as const,
                          draft_cost: pick.cost,
                          team_id: team.id,
                        },
                      ],
                      budget_remaining: team.budget_remaining - pick.cost,
                    }
                  }
                }
                return team
              }),
            )

            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "bid_placed" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "auction_started" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "auction_completed" }, (payload) => {
            if (!mounted) return
            const { pick } = payload.data

            setDraftState(payload.draft_state)
            setDraftHistory((prev) => [...prev, pick])
            setAvailablePlayers((prev) => prev.filter((p) => p.id !== pick.player_id))

            // Update team rosters for auction completion
            setTeams((prev) =>
              prev.map((team) => {
                if (team.id === pick.team_id) {
                  const draftedPlayer = availablePlayers.find((p) => p.id === pick.player_id)
                  if (draftedPlayer) {
                    return {
                      ...team,
                      players: [
                        ...team.players,
                        {
                          ...draftedPlayer,
                          status: "drafted" as const,
                          draft_cost: pick.cost,
                          team_id: team.id,
                        },
                      ],
                      budget_remaining: team.budget_remaining - pick.cost,
                    }
                  }
                }
                return team
              }),
            )

            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "turn_skipped" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "draft_paused" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            setLastUpdate(new Date().toISOString())
          })
          .on("broadcast", { event: "timer_update" }, (payload) => {
            if (!mounted) return
            setDraftState(payload.draft_state)
            // Don't update lastUpdate for timer updates to avoid spam
          })
          .subscribe((status) => {
            if (mounted) {
              setIsConnected(status === "SUBSCRIBED")
            }
          })
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize draft")
          setLoading(false)
        }
      }
    }

    initializeDraft()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tournamentId])

  const startDraft = useCallback(async () => {
    if (!userId || !tournamentId) {
      setError("Authentication required")
      return
    }

    try {
      setError(null)
      const newState = await tournamentDraftService.startDraft(tournamentId, userId)
      setDraftState(newState)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start draft")
    }
  }, [tournamentId, userId])

  const draftPlayer = useCallback(
    async (playerId: string, teamId: string) => {
      if (!userId || !tournamentId) {
        setError("Authentication required")
        return
      }

      try {
        setError(null)

        // Optimistic update
        const player = availablePlayers.find((p) => p.id === playerId)
        if (player) {
          setAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId))
          setTeams((prev) =>
            prev.map((team) => {
              if (team.id === teamId) {
                return {
                  ...team,
                  players: [
                    ...team.players,
                    {
                      ...player,
                      status: "drafted" as const,
                      draft_cost: 0,
                      team_id: teamId,
                    },
                  ],
                }
              }
              return team
            }),
          )
        }

        const newState = await tournamentDraftService.draftPlayer(tournamentId, playerId, teamId, userId)
        setDraftState(newState)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to draft player")

        // Revert optimistic update on error
        const teams = await tournamentDraftService.getTeamsWithRosters(tournamentId)
        const players = await tournamentDraftService.getAvailablePlayers(tournamentId)
        setTeams(teams)
        setAvailablePlayers(players)
      }
    },
    [tournamentId, userId, availablePlayers],
  )

  const placeBid = useCallback(
    async (playerId: string, teamId: string, bidAmount: number) => {
      if (!userId || !tournamentId) {
        setError("Authentication required")
        return
      }

      try {
        setError(null)
        const newState = await tournamentDraftService.placeBid(tournamentId, playerId, teamId, bidAmount, userId)
        setDraftState(newState)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to place bid")
      }
    },
    [tournamentId, userId],
  )

  const startPlayerAuction = useCallback(
    async (playerId: string) => {
      if (!tournamentId) {
        setError("Tournament ID required")
        return
      }

      try {
        setError(null)
        const newState = await tournamentDraftService.startPlayerAuction(tournamentId, playerId)
        setDraftState(newState)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start auction")
      }
    },
    [tournamentId],
  )

  const pauseDraft = useCallback(async () => {
    if (!userId || !tournamentId) {
      setError("Authentication required")
      return
    }

    try {
      setError(null)
      const newState = await tournamentDraftService.pauseDraft(tournamentId, userId)
      setDraftState(newState)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause draft")
    }
  }, [tournamentId, userId])

  return {
    // State
    draftState,
    draftSettings,
    teams,
    availablePlayers,
    draftHistory,
    loading,
    error,

    // Actions
    startDraft,
    draftPlayer,
    placeBid,
    startPlayerAuction,
    pauseDraft,

    // Real-time status
    isConnected,
    lastUpdate,
  }
}

export function useTournamentDraftChat(tournamentId: string, userId?: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournamentId) return

    let channel: RealtimeChannel
    let mounted = true

    const initializeChat = async () => {
      try {
        // Load initial chat messages
        const { data: initialMessages } = await supabase
          .from("tournament_chat")
          .select(`
            id,
            message,
            created_at,
            user_id,
            users(username)
          `)
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: true })
          .limit(50)

        if (mounted) {
          setMessages(initialMessages || [])
          setLoading(false)
        }

        // Setup real-time chat subscription
        channel = supabase
          .channel(`tournament-chat-${tournamentId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "tournament_chat",
              filter: `tournament_id=eq.${tournamentId}`,
            },
            (payload) => {
              if (!mounted) return
              setMessages((prev) => [...prev, payload.new])
            },
          )
          .subscribe()
      } catch (error) {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeChat()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tournamentId])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!userId || !tournamentId || !message.trim()) return

      try {
        await supabase.from("tournament_chat").insert({
          tournament_id: tournamentId,
          user_id: userId,
          message: message.trim(),
          created_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error sending chat message:", error)
      }
    },
    [tournamentId, userId],
  )

  return {
    messages,
    loading,
    sendMessage,
  }
}
