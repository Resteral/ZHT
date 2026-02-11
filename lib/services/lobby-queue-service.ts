import { createClient } from "@/lib/supabase/client"
import { walletService } from "@/lib/services/wallet-service"

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
  async joinQueue(
    userId: string,
    game: string,
    queueType: "maxed" | "unmaxed",
    gameFormat: "snake_draft" | "auction_draft" | "linear_draft",
    playerCount: number,
    entryFee: number = 0
  ): Promise<QueueEntry> {
    console.log("[v0] User joining queue:", { userId, game, queueType, gameFormat, playerCount, entryFee })

    // Check if user is already in a queue
    const { data: existing } = await supabase
      .from("lobby_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .single()

    if (existing) {
      throw new Error("You are already in a queue. Please leave your current queue first.")
    }

    // Deduct entry fee if applicable
    if (entryFee > 0) {
      const success = await walletService.deductEntryFee(userId, entryFee, `Entry fee for ${gameFormat} lobby`)
      if (!success) {
        throw new Error("Insufficient funds to join this lobby.")
      }
    }

    // Get user's Game-Specific ELO rating
    let eloRating = 1000
    const { data: gameRating } = await supabase
      .from("user_game_ratings")
      .select("elo_rating")
      .eq("user_id", userId)
      .eq("game", game)
      .single()

    if (gameRating) {
      eloRating = gameRating.elo_rating
    } else {
      // Fallback or initialize: Check global ELO or default to 1000
      const { data: userData } = await supabase.from("users").select("elo_rating").eq("id", userId).single()
      eloRating = userData?.elo_rating || 1000

      // Initialize user_game_ratings for this game
      const { error: initError } = await supabase.from("user_game_ratings").insert({
        user_id: userId,
        game: game,
        elo_rating: eloRating
      })

      if (initError) {
        console.warn("Could not insert initial game rating", initError)
      }
    }

    const { data: queueEntry, error } = await supabase
      .from("lobby_queue")
      .insert({
        user_id: userId,
        game: game,
        queue_type: queueType,
        game_format: gameFormat,
        player_count: playerCount,
        entry_fee: entryFee,
        elo_rating: eloRating,
        joined_at: new Date().toISOString(),
        status: "waiting",
      })
      .select()
      .single()

    if (error) {
      // Refund if insert fails
      if (entryFee > 0) {
        await walletService.awardPrize(userId, entryFee, "Refund: Lobby join failed")
      }
      throw error
    }

    // Check if we can create a match immediately
    await this.checkAndCreateMatch(game, queueType, gameFormat, playerCount, entryFee)

    return queueEntry
  },

  async leaveQueue(userId: string): Promise<void> {
    console.log("[v0] User leaving queue:", userId)

    // Get current queue entry to know amount to refund
    const { data: entry } = await supabase
      .from("lobby_queue")
      .select("entry_fee")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .single()

    const { error } = await supabase
      .from("lobby_queue")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "waiting")

    if (error) throw error

    // Refund entry fee
    if (entry && entry.entry_fee > 0) {
      await walletService.awardPrize(userId, entry.entry_fee, "Refund: Left lobby queue")
    }
  },

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

  async checkAndCreateMatch(
    game: string,
    queueType: "maxed" | "unmaxed",
    gameFormat: string,
    playerCount: number,
    entryFee: number = 0
  ): Promise<string | null> {
    console.log("[v0] Checking if we can create match:", { game, queueType, gameFormat, playerCount, entryFee })

    const { data: queuedUsers } = await supabase
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

    const requiredPlayers = playerCount * 2
    const currentPlayers = queuedUsers?.length || 0

    // For maxed queues, need exact player count
    // For unmaxed queues, can start with minimum players
    const canStart =
      queueType === "maxed"
        ? currentPlayers >= requiredPlayers
        : currentPlayers >= Math.max(4, Math.floor(requiredPlayers / 2))

    if (!canStart || !queuedUsers) {
      return null
    }

    // For unmaxed queues, wait 10 seconds after minimum threshold before creating match
    if (queueType === "unmaxed") {
      const oldestEntry = queuedUsers[0]
      const waitTime = Date.now() - new Date(oldestEntry.joined_at).getTime()
      const minimumWait = 10000 // 10 seconds

      if (waitTime < minimumWait) {
        console.log("[v0] Unmaxed queue waiting for 10 second threshold")
        return null
      }
    }

    // Take the required number of players
    const playersForMatch = queuedUsers.slice(0, requiredPlayers)

    // Calculate prize pool
    // e.g. $10 entry * 8 players = $80 total. Platform fee might apply, but for now 100% to prize pool.
    const prizePool = entryFee * playersForMatch.length

    // Create tournament
    const tournamentName = `${entryFee > 0 ? `$${entryFee} ` : ""}${queueType === "maxed" ? "Ranked" : "Quick Play"} ${gameFormat.replace("_", " ")}`

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        name: tournamentName,
        description: `Auto-created from ${queueType} queue`,
        game: game,
        tournament_type: "draft",
        max_participants: requiredPlayers,
        entry_fee: entryFee,
        prize_pool: prizePool,
        status: "drafting",
        start_date: new Date().toISOString(),
        player_pool_settings: {
          num_teams: playerCount,
          max_teams: playerCount,
          draft_mode: gameFormat,
          players_per_team: 2,
          auction_budget: 1000,
          auto_start: true,
        },
        created_by: playersForMatch[0].user_id,
      })
      .select()
      .single()

    if (tournamentError) {
      console.error("[v0] Error creating tournament from queue:", tournamentError)
      return null
    }

    // Add all players as participants
    const participantInserts = playersForMatch.map((player: any) => ({
      tournament_id: tournament.id,
      user_id: player.user_id,
      joined_at: new Date().toISOString(),
      status: "registered",
    }))

    const { error: participantError } = await supabase.from("tournament_participants").insert(participantInserts)

    if (participantError) {
      console.error("[v0] Error adding participants:", participantError)
      return null
    }

    // Update queue entries to matched status
    const playerIds = playersForMatch.map((p: any) => p.user_id)
    await supabase.from("lobby_queue").update({ status: "matched" }).in("user_id", playerIds).eq("status", "waiting")
    console.log("[v0] Created tournament from queue:", tournament.id)
    return tournament.id
  },

  async ensurePersistentLobbies(userId: string): Promise<void> {
    const persistentConfigs = [
      { game: "Omega Strikers", name: "Public Draft Lobby", fee: 0, participants: 8, format: "snake_draft" },
      { game: "Deadlock", name: "Deadlock Public Lobby", fee: 0, participants: 12, format: "snake_draft" }
    ]

    for (const config of persistentConfigs) {
      // Check if a lobby exists
      const { data: existing } = await supabase
        .from("tournaments")
        .select("id")
        .eq("game", config.game)
        .eq("status", "drafting")
        .eq("name", config.name)
        .limit(1)

      if (!existing || existing.length === 0) {
        console.log(`[v0] Creating persistent lobby for ${config.game}`)
        const { error } = await supabase.from("tournaments").insert({
          name: config.name,
          description: "Always open public lobby",
          game: config.game,
          tournament_type: "draft",
          max_participants: config.participants,
          entry_fee: config.fee,
          status: "drafting",
          start_date: new Date().toISOString(),
          player_pool_settings: {
            draft_mode: config.format,
            auto_start: true
          },
          created_by: userId // The user who triggered this becomes the creator/owner effectively
        })
        if (error) console.error("Error creating persistent lobby:", error)
      }
    }
  },

  async startQueueMonitoring(): Promise<void> {
    console.log("[v0] Starting queue monitoring service")

    // Check every 5 seconds for matches to create
    setInterval(async () => {
      try {
        const queues = await this.getAllQueues()

        for (const queue of queues) {
          if (queue.current_players >= queue.required_players) {
            await this.checkAndCreateMatch(queue.game, queue.queue_type as any, queue.game_format, queue.player_count, queue.entry_fee)
          }
        }
      } catch (error) {
        console.error("[v0] Error in queue monitoring:", error)
      }
    }, 5000)
  },
}
