"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface AuctionSession {
  id: string
  tournament_id: string
  status: "waiting" | "active" | "paused" | "completed"
  current_player_id?: string
  current_bidder_id?: string
  current_bid_amount: number
  bid_timer_seconds: number
  auction_round: number
  total_rounds: number
  bid_deadline?: string
}

interface AuctionBid {
  id: string
  auction_session_id: string
  tournament_id: string
  team_id: string
  player_id: string
  bid_amount: number
  is_winning_bid: boolean
  bid_time: string
  auction_round: number
}

interface TeamBudget {
  id: string
  tournament_id: string
  team_id: string
  current_budget: number
  spent_amount: number
  players_acquired: number
  max_players: number
}

export function useAuctionRealtime(tournamentId: string) {
  const [auctionSession, setAuctionSession] = useState<AuctionSession | null>(null)
  const [recentBids, setRecentBids] = useState<AuctionBid[]>([])
  const [teamBudgets, setTeamBudgets] = useState<TeamBudget[]>([])
  const [connected, setConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const auctionChannel = supabase
      .channel(`auction-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_auction_sessions",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Auction session update:", payload)
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setAuctionSession(payload.new as AuctionSession)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_auction_bids",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] New bid received:", payload)
          const newBid = payload.new as AuctionBid
          setRecentBids((prev) => [newBid, ...prev.slice(0, 9)]) // Keep last 10 bids
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_team_budgets",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Team budget update:", payload)
          if (payload.eventType === "UPDATE") {
            const updatedBudget = payload.new as TeamBudget
            setTeamBudgets((prev) =>
              prev.map((budget) => (budget.team_id === updatedBudget.team_id ? updatedBudget : budget)),
            )
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Auction channel status:", status)
        setConnected(status === "SUBSCRIBED")
      })

    setChannel(auctionChannel)

    return () => {
      console.log("[v0] Cleaning up auction real-time subscription")
      auctionChannel.unsubscribe()
    }
  }, [tournamentId])

  const broadcastBidUpdate = async (bidData: {
    playerId: string
    bidAmount: number
    teamId: string
    timeRemaining: number
  }) => {
    if (channel) {
      await channel.send({
        type: "broadcast",
        event: "bid_update",
        payload: bidData,
      })
    }
  }

  const broadcastTimerUpdate = async (timeRemaining: number) => {
    if (channel) {
      await channel.send({
        type: "broadcast",
        event: "timer_update",
        payload: { timeRemaining },
      })
    }
  }

  return {
    auctionSession,
    recentBids,
    teamBudgets,
    connected,
    broadcastBidUpdate,
    broadcastTimerUpdate,
    setAuctionSession,
    setTeamBudgets,
  }
}
