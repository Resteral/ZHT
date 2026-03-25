"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

const supabase = createClient()

export function useRealtimeSubscription<T>(table: string, filter?: string, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  useEffect(() => {
    let channel: RealtimeChannel
    let isMounted = true

    const setupSubscription = async () => {
      try {
        const now = Date.now()
        if (now - lastFetch < 10000) {
          return
        }
        setLastFetch(now)

        // Initial data fetch
        let query = supabase.from(table).select("*")
        if (filter) {
          const [column, operator, value] = filter.split(",")
          query = query.filter(column, operator, value)
        }

        const { data: initialData, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        if (isMounted) {
          setData(initialData || [])
          setLoading(false)
        }

        channel = supabase
          .channel(`${table}_changes_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: table,
            },
            (payload) => {
              if (!isMounted) return

              // Debounce rapid updates
              setTimeout(() => {
                if (payload.eventType === "INSERT") {
                  setData((current) => {
                    const exists = current.some((item: any) => item.id === payload.new.id)
                    return exists ? current : [...current, payload.new as T]
                  })
                } else if (payload.eventType === "UPDATE") {
                  setData((current) => current.map((item: any) => (item.id === payload.new.id ? payload.new : item)))
                } else if (payload.eventType === "DELETE") {
                  setData((current) => current.filter((item: any) => item.id !== payload.old.id))
                }
              }, 500)
            },
          )
          .subscribe()
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error")
          setLoading(false)
        }
      }
    }

    setupSubscription()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter]) // Removed lastFetch from dependencies to prevent loops

  return { data, loading, error }
}

export function useRealtimeGame(gameId: string) {
  const [gameState, setGameState] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGameState(payload.new)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_events",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setEvents((current) => [payload.new, ...current])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  return { gameState, events }
}

export function useRealtimeBetting() {
  const [markets, setMarkets] = useState<any[]>([])
  const [odds, setOdds] = useState<Record<string, any>>({})

  useEffect(() => {
    const channel = supabase
      .channel("betting_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "betting_markets",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setMarkets((current) => current.map((market) => (market.id === payload.new.id ? payload.new : market)))
            setOdds((current) => ({
              ...current,
              [payload.new.id]: {
                home_odds: payload.new.odds_home,
                away_odds: payload.new.odds_away,
                spread_line: payload.new.spread_line,
                total_line: payload.new.total_line,
              },
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { markets, odds }
}

export function useRealtimeDraft(draftId: string) {
  const [draftState, setDraftState] = useState<any>(null)
  const [picks, setPicks] = useState<any[]>([])
  const [currentPick, setCurrentPick] = useState<number>(1)

  useEffect(() => {
    if (!draftId) return

    const channel = supabase
      .channel(`draft_${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "captain_drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          setDraftState(payload.new)
          setCurrentPick(payload.new.current_pick || 1)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "draft_picks",
          filter: `draft_id=eq.${draftId}`,
        },
        (payload) => {
          setPicks((current) => [...current, payload.new])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [draftId])

  return { draftState, picks, currentPick }
}

export function useRealtimeStream(streamId: string) {
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!streamId) return

    const channel = supabase
      .channel(`stream_${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_chat",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setChatMessages((current) => [...current, payload.new])
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stream_viewers",
          filter: `stream_id=eq.${streamId}`,
        },
        async () => {
          // Recalculate viewer count
          const { count } = await supabase
            .from("stream_viewers")
            .select("*", { count: "exact", head: true })
            .eq("stream_id", streamId)
            .is("left_at", null)

          setViewerCount(count || 0)
        },
      )
      .subscribe()

    // Load initial chat messages
    const loadInitialData = async () => {
      try {
        const { data: messages } = await supabase
          .from("stream_chat")
          .select("*")
          .eq("stream_id", streamId)
          .order("created_at", { ascending: true })
          .limit(50)

        if (messages) setChatMessages(messages)

        const { count } = await supabase
          .from("stream_viewers")
          .select("*", { count: "exact", head: true })
          .eq("stream_id", streamId)
          .is("left_at", null)

        setViewerCount(count || 0)
      } catch (error) {
        console.error("Error loading stream data:", error)
      }
    }

    loadInitialData()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [streamId])

  return { chatMessages, viewerCount }
}

export function useRealtimeTournamentDraft(tournamentId: string) {
  const [draftState, setDraftState] = useState<any>(null)
  const [picks, setPicks] = useState<any[]>([])
  const [currentPick, setCurrentPick] = useState<number>(1)
  const [auctionState, setAuctionState] = useState<any>(null)

  useEffect(() => {
    if (!tournamentId) return

    const channel = supabase
      .channel(`tournament_draft_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_settings",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload) => {
          if (payload.new?.setting_key === "draft_state") {
            const state = JSON.parse(payload.new.setting_value)
            setDraftState(state)
            setCurrentPick(state.current_pick || 1)
            setAuctionState(state.auction_state || null)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_team_members",
          filter: `team_id=in.(${tournamentId})`, // This would need proper team filtering
        },
        (payload) => {
          // Handle new draft picks
          setPicks((current) => [...current, payload.new])
        },
      )
      .on("broadcast", { event: "draft_update" }, (payload) => {
        setDraftState(payload.draft_state)
        setCurrentPick(payload.draft_state?.current_pick || 1)
        setAuctionState(payload.draft_state?.auction_state || null)
      })
      .on("broadcast", { event: "player_drafted" }, (payload) => {
        setPicks((current) => [...current, payload.data.pick])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId])

  return { draftState, picks, currentPick, auctionState }
}
