import { createClient } from "@/lib/supabase/server"

// Shared matchmaking logic
export async function processQueue(
    game: string,
    queueType: "maxed" | "unmaxed",
    gameFormat: string,
    playerCount: number,
    entryFee: number = 0
): Promise<string | null> {
    const supabase = await createClient()

    console.log("[QueueProcessor] Checking queue:", { game, queueType, gameFormat, playerCount, entryFee })

    // 1. Fetch waiting users
    const { data: queuedUsers, error } = await supabase
        .from("lobby_queue")
        .select(`
        *,
        users(username, elo_rating)
      `)
        .eq("game", game)
        .eq("queue_type", queueType)
        .eq("game_format", gameFormat)
        .eq("player_count", playerCount)
        .eq("entry_fee", entryFee)
        .eq("status", "waiting")
        .order("joined_at", { ascending: true }) // FIFO

    if (error || !queuedUsers) {
        console.error("[QueueProcessor] Error fetching queue:", error)
        return null
    }

    const requiredPlayers = playerCount * 2
    const currentPlayers = queuedUsers.length

    // 2. Check conditions
    // For maxed queues, need exact player count
    // For unmaxed queues, can start with minimum players (half)
    const canStart =
        queueType === "maxed"
            ? currentPlayers >= requiredPlayers
            : currentPlayers >= Math.max(4, Math.floor(requiredPlayers / 2))

    if (!canStart) {
        return null
    }

    // 3. Special logic for "unmaxed" queues: Wait 10 seconds after minimum threshold
    if (queueType === "unmaxed") {
        const oldestEntry = queuedUsers[0]
        const waitTime = Date.now() - new Date(oldestEntry.joined_at).getTime()
        const minimumWait = 10000 // 10 seconds

        if (waitTime < minimumWait) {
            console.log("[QueueProcessor] Unmaxed queue waiting for 10 second threshold")
            return null
        }
    }

    // 4. Select players
    const playersForMatch = queuedUsers.slice(0, requiredPlayers)
    const playerIds = playersForMatch.map((p) => p.user_id)

    // 5. Create Tournament/Match
    const prizePool = entryFee * playersForMatch.length

    const tournamentName = `${entryFee > 0 ? `$${entryFee} ` : ""}${queueType === "maxed" ? "Ranked" : "Quick Play"} ${gameFormat.replace("_", " ")}`

    // Use a transaction-like approach (though Supabase doesn't support multi-table tx via client easily, we do our best)
    // Ideally this would be a Postgres function, but for now we do it in code.

    // Create Tournament
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
            created_by: playersForMatch[0].user_id, // Assign first player as 'creator' meta-data
        })
        .select()
        .single()

    if (tournamentError) {
        console.error("[QueueProcessor] Error creating tournament:", tournamentError)
        return null
    }

    // Add Participants
    const participantInserts = playersForMatch.map((player) => ({
        tournament_id: tournament.id,
        user_id: player.user_id,
        joined_at: new Date().toISOString(),
        status: "registered",
    }))

    const { error: participantError } = await supabase.from("tournament_participants").insert(participantInserts)

    if (participantError) {
        console.error("[QueueProcessor] Error adding participants:", participantError)
        // Critical failure: Tournament created but players not added.
        // In a real system, we'd need to rollback or alert admin.
        // For now, we try to delete the tournament to cleanup.
        await supabase.from("tournaments").delete().eq("id", tournament.id)
        return null
    }

    // Update Queue Status
    const { error: updateError } = await supabase
        .from("lobby_queue")
        .update({ status: "matched" })
        .in("user_id", playerIds)
        .eq("status", "waiting")

    if (updateError) {
        console.error("[QueueProcessor] Error updating queue status:", updateError)
        // This is bad but not catastrophic, users might appear to still be in queue?
    }

    console.log("[QueueProcessor] Created match:", tournament.id)
    return tournament.id
}
