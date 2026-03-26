"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface TournamentData {
  tournament: any
  participants: any[]
  loading: boolean
  error: string | null
}

export function useTournamentData(tournamentId: string) {
  const [data, setData] = useState<TournamentData>({
    tournament: null,
    participants: [],
    loading: true,
    error: null,
  })

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!tournamentId) return

    try {
      console.log("[v0] Loading tournament data:", tournamentId)

      // Single query to get tournament and participants together
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(`
          *,
          tournament_participants (
            user_id,
            status,
            joined_at,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      const participants =
        tournamentData.tournament_participants
          ?.filter((p: any) => p.status === "registered")
          ?.map((p: any) => ({
            id: p.user_id,
            username: p.users?.username,
            elo_rating: p.users?.elo_rating || 1200,
            joined_at: p.joined_at,
          }))
          ?.sort((a: any, b: any) => b.elo_rating - a.elo_rating) || []

      console.log("[v0] Loaded tournament with", participants.length, "participants")

      setData({
        tournament: tournamentData,
        participants,
        loading: false,
        error: null,
      })
    } catch (error: any) {
      console.error("[v0] Error loading tournament data:", error)
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load tournament",
      }))
    }
  }, [tournamentId, supabase])

  useEffect(() => {
    fetchData()

    // Single real-time subscription for both tournament and participants
    const subscription = supabase
      .channel(`tournament-data-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Tournament participants updated")
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Tournament updated")
          fetchData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchData])

  return {
    ...data,
    refetch: fetchData,
  }
}
