"use server"

import { createClient } from "@/lib/supabase/server"
import { serverWalletService } from "@/lib/services/server-wallet-service"
import { revalidatePath } from "next/cache"

export async function joinTournament(tournamentId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("You must be logged in to join the tournament")
    }

    // 1. Fetch Tournament Details
    const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

    if (tournamentError || !tournament) {
        throw new Error("Tournament not found")
    }

    // 2. Validate Status
    if (
        tournament.status !== "registration" &&
        tournament.status !== "registration_open" &&
        tournament.status !== "active"
    ) {
        throw new Error("Registration is closed")
    }

    // 3. Check Capacity
    const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)

    if (count !== null && tournament.max_participants && count >= tournament.max_participants) {
        throw new Error("Tournament is full")
    }

    // 4. Check if already joined
    const { data: existing } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single()

    if (existing) {
        throw new Error("You have already joined this tournament")
    }

    // 5. Financials (Entry Fee / Reward)
    const entryFee = tournament.entry_fee || 0
    const rewardAmount = 25 // Legacy reward from client code

    if (entryFee > 0) {
        const deducted = await serverWalletService.deductEntryFee(user.id, entryFee, `Entry fee: ${tournament.name}`)
        if (!deducted) {
            throw new Error("Insufficient funds")
        }
    }

    // 6. Join Tournament (Insert Participant)
    // Get participant count for seed
    const currentCount = count || 0
    const participantData = {
        tournament_id: tournamentId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        status: "registered",
        seed: currentCount + 1,
        team_name: `Team ${currentCount + 1}`,
    }

    const { error: joinError } = await supabase
        .from("tournament_participants")
        .insert(participantData)

    if (joinError) {
        // Refund if failed
        if (entryFee > 0) {
            await serverWalletService.awardPrize(user.id, entryFee, "Refund: Join failed")
        }
        throw new Error("Failed to join tournament: " + joinError.message)
    }

    // 7. Add to Player Pool
    const playerPoolData = {
        tournament_id: tournamentId,
        user_id: user.id,
        draft_position: currentCount + 1,
        status: "available",
        captain_type: currentCount < 2 ? "high_elo" : "low_elo", // Simplistic logic from client
        created_at: new Date().toISOString(),
    }

    // Note: Client logic had this. We replicate it.
    const { error: poolError } = await supabase
        .from("tournament_player_pool")
        .insert(playerPoolData)

    if (poolError) {
        console.error("Failed to add to player pool:", poolError)
        // We might not want to hard fail here if participant entry succeeded, or we should rollback.
        // For now, let's allow it but log.
    }

    // 8. Process Reward (if applicable and no entry fee? or always?)
    // Client code: "if (userId && isAuthenticated && finalUser) ... update balance + rewardAmount"
    // It seemed to apply to everyone.
    // We'll apply it securely.
    if (rewardAmount > 0) {
        await serverWalletService.awardPrize(user.id, rewardAmount, `Reward: Joined ${tournament.name}`)
    }

    revalidatePath(`/tournaments/${tournamentId}`)
    return { success: true }
}
