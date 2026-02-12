import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface QueueEntry {
  id: string
  user_id: string
  queue_type: "maxed" | "unmaxed"
  game_format: "snake_draft" | "auction_draft" | "linear_draft"
  player_count: number // 4, 6, 8, 12
  elo_rating: number
  entry_fee: number
  joined_at: string
  status: "waiting" | "matched" | "cancelled"
}

export interface LobbyQueue {
  id: string
  name: string
  game: string
  queue_type: "maxed" | "unmaxed"
  game_format: string
  player_count: number
  entry_fee: number
  current_players: number
  required_players: number
  max_players: number
  prize_pool: number
  game_mode: string
  status: string
  estimated_wait_time: number
  queued_users: Array<{
    id: string
    user_id: string
    username: string
    avatar_url: string
    elo_rating: number
    wait_time: number
  }>
}

export const lobbyQueueService = {
  async getQueueStatus(game: string, queueType: "maxed" | "unmaxed", gameFormat: string, playerCount: number, entryFee: number = 0): Promise<LobbyQueue> {
    const { data: queuedUsers, error } = await supabase
      .from("lobby_queue")
      .select(
        `
        *,
        users(username, elo_rating)
      `,
      )
      .eq("game", game)
      .eq("queue_type", queueType)
      .eq("game_format", gameFormat)
      .eq("player_count", playerCount)
      .eq("entry_fee", entryFee)
      .eq("status", "waiting")
      .order("joined_at", { ascending: true })

    if (error) throw error

    const requiredPlayers = playerCount * 2 // Total players needed (e.g., 4v4 = 8 players)
    const currentPlayers = queuedUsers?.length || 0
    const playersNeeded = Math.max(0, requiredPlayers - currentPlayers)
    const estimatedWaitTime = playersNeeded * 30 // Estimate 30 seconds per missing player

    return {
      id: `${game}-${queueType}-${gameFormat}-${playerCount}-${entryFee}`,
      name: `${game} ${queueType} Queue`,
      game: game,
      game_mode: gameFormat,
      status: "active",
      queue_type: queueType,
      game_format: gameFormat as "snake_draft" | "auction_draft" | "linear_draft",
      player_count: playerCount,
      entry_fee: entryFee,
      current_players: currentPlayers,
      max_players: requiredPlayers,
      required_players: requiredPlayers, // Added to match interface
      prize_pool: entryFee * requiredPlayers, // Estimate
      estimated_wait_time: estimatedWaitTime,
      queued_users:
        queuedUsers?.map((entry: any) => {
          const waitTime = Math.floor((Date.now() - new Date(entry.joined_at).getTime()) / 1000)
          return {
            id: entry.user_id,
            user_id: entry.user_id,
            username: entry.users?.username || "Unknown",
            avatar_url: "", // Placeholder
            elo_rating: entry.users?.elo_rating || 1000,
            wait_time: waitTime,
          }
        }) || [],
    }
  },

  async getAllQueues(): Promise<LobbyQueue[]> {
    const games = ["Omega Strikers", "Deadlock"]
    // Define standard queues with entry fees
    const queueConfigs = [
      // Free queues
      { type: "maxed" as const, format: "snake_draft", count: 4, fee: 0 },
      { type: "maxed" as const, format: "auction_draft", count: 4, fee: 0 },
      // $10 Entry
      { type: "maxed" as const, format: "snake_draft", count: 4, fee: 10 },
      { type: "maxed" as const, format: "auction_draft", count: 4, fee: 10 },
      // $25 Entry
      { type: "maxed" as const, format: "snake_draft", count: 4, fee: 25 },
    ]

    const allQueues: LobbyQueue[] = []

    for (const game of games) {
      const gameQueues = await Promise.all(
        queueConfigs.map((config) => this.getQueueStatus(game, config.type, config.format, config.count, config.fee)),
      )
      allQueues.push(...gameQueues)
    }

    return allQueues
  },
}
