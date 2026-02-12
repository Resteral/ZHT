"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { serverWalletService } from "@/lib/services/server-wallet-service"
import { processQueue } from "@/lib/queue-processor"

export async function joinLobbyQueue(
    game: string,
    queueType: "maxed" | "unmaxed",
    gameFormat: "snake_draft" | "auction_draft" | "linear_draft",
    playerCount: number,
    entryFee: number = 0
) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("You must be logged in to join a queue")
    }

    // 1. Check if already in queue
    const { data: existing } = await supabase
        .from("lobby_queue")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "waiting")
        .single()

    if (existing) {
        throw new Error("You are already in a queue. Please leave your current queue first.")
    }

    // 2. Deduct Entry Fee
    if (entryFee > 0) {
        const success = await serverWalletService.deductEntryFee(
            user.id,
            entryFee,
            `Entry fee for ${gameFormat.replace("_", " ")} lobby`
        )

        if (!success) {
            throw new Error("Insufficient funds to join this lobby.")
        }
    }

    // 3. Get ELO (Server-side fetch to prevent client spoofing)
    let eloRating = 1000
    const { data: gameRating } = await supabase
        .from("user_game_ratings")
        .select("elo_rating")
        .eq("user_id", user.id)
        .eq("game", game)
        .single()

    if (gameRating) {
        eloRating = gameRating.elo_rating
    } else {
        // Fallback ELO logic
        const { data: userData } = await supabase.from("users").select("elo_rating").eq("id", user.id).single()
        eloRating = userData?.elo_rating || 1000

        // Initialize if needed
        const { error: initError } = await supabase.from("user_game_ratings").insert({
            user_id: user.id,
            game: game,
            elo_rating: eloRating
        })
        if (initError) console.warn("Failed to init ratings", initError)
    }

    // 4. Insert into Queue
    const { error: insertError } = await supabase.from("lobby_queue").insert({
        user_id: user.id,
        game,
        queue_type: queueType,
        game_format: gameFormat,
        player_count: playerCount,
        entry_fee: entryFee,
        elo_rating: eloRating,
        status: "waiting",
        joined_at: new Date().toISOString(),
    })

    if (insertError) {
        // Refund if insert fails
        if (entryFee > 0) {
            await serverWalletService.awardPrize(user.id, entryFee, "Refund: Lobby join failed")
        }
        throw new Error("Failed to join queue: " + insertError.message)
    }

    // 5. Trigger Matchmaking (Immediate check)
    // We don't await this if we want to return fast, but for reliability we might
    try {
        await processQueue(game, queueType, gameFormat, playerCount, entryFee)
    } catch (err) {
        console.error("Error processing queue immediately:", err)
    }

    revalidatePath("/queue")
    revalidatePath("/lobbies")
    return { success: true }
}

export async function leaveLobbyQueue() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Not authenticated")
    }

    // 1. Get current queue to know fee
    const { data: entry } = await supabase
        .from("lobby_queue")
        .select("entry_fee, id")
        .eq("user_id", user.id)
        .eq("status", "waiting")
        .single()

    if (!entry) {
        return { success: false, message: "No active queue found" }
    }

    // 2. Cancel Queue Entry
    const { error } = await supabase
        .from("lobby_queue")
        .update({ status: "cancelled" })
        .eq("id", entry.id)
        .eq("user_id", user.id) // Redundant but safe
        .eq("status", "waiting")

    if (error) {
        throw new Error("Failed to leave queue")
    }

    // 3. Refund Fee
    if (entry.entry_fee > 0) {
        await serverWalletService.awardPrize(user.id, entry.entry_fee, "Refund: Left lobby queue")
    }

    revalidatePath("/queue")
    revalidatePath("/lobbies")
    return { success: true }
}

export async function ensurePersistentLobbies() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

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
                prize_pool: 0,
                status: "drafting",
                start_date: new Date().toISOString(),
                player_pool_settings: {
                    draft_mode: config.format,
                    auto_start: true
                },
                created_by: user.id
            })
            if (error) console.error("Error creating persistent lobby:", error)
        }
    }
}
