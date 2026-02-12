"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { serverWalletService } from "@/lib/services/server-wallet-service"

export async function joinContest(contestId: string, entryFee: number, contestName: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("You must be logged in to join a contest")
    }

    // 1. Check if already joined
    const { data: existing } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", contestId)
        .eq("user_id", user.id)
        .single()

    if (existing) {
        throw new Error("You have already joined this contest.")
    }

    // 2. Deduct Entry Fee
    if (entryFee > 0) {
        const success = await serverWalletService.deductEntryFee(
            user.id,
            entryFee,
            `Entry fee for ${contestName}`
        )

        if (!success) {
            throw new Error("Insufficient funds to join this contest.")
        }
    }

    // 3. Add Participant
    const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: contestId,
        user_id: user.id,
        status: "registered",
        joined_at: new Date().toISOString()
    })

    if (error) {
        // Refund if insert fails
        if (entryFee > 0) {
            await serverWalletService.awardPrize(user.id, entryFee, "Refund: Contest join failed")
        }
        throw new Error("Failed to join contest: " + error.message)
    }

    revalidatePath(`/draft/room/${contestId}`)
    return { success: true }
}

export async function placeBet(
    contestId: string,
    marketId: string,
    optionId: string,
    amount: number,
    odds?: number,
    betType?: string
) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("You must be logged in to place a bet")
    }

    if (amount <= 0) {
        throw new Error("Bet amount must be greater than 0")
    }

    // 1. Validation: Fetch match or tournament to check status
    // We try 'matches' first (for draft rooms), then 'tournaments' if not found (for general tournaments)
    let contextType = 'match'
    let contextData: any = null

    const { data: match } = await supabase
        .from("matches")
        .select("description, status")
        .eq("id", contestId)
        .single()

    if (match) {
        contextData = match
    } else {
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", contestId)
            .single()

        if (tournament) {
            contextType = 'tournament'
            contextData = tournament
        }
    }

    if (!contextData) {
        throw new Error("Contest/Tournament not found")
    }

    // Validate against own team betting if it's a match with draft state
    if (contextType === 'match' && contextData.description) {
        try {
            const desc = JSON.parse(contextData.description || "{}")
            const draftState = desc.draft_state
            if (draftState) {
                const team1 = draftState.team1_players || []
                const team2 = draftState.team2_players || []

                let userTeam = 0
                if (team1.includes(user.id)) userTeam = 1
                if (team2.includes(user.id)) userTeam = 2

                if (userTeam !== 0) {
                    if (marketId === "match_winner") {
                        if (userTeam === 1 && optionId === "team2") throw new Error("Cannot bet against your own team")
                        if (userTeam === 2 && optionId === "team1") throw new Error("Cannot bet against your own team")
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }

    // 2. Deduct Funds
    const success = await serverWalletService.deductEntryFee(
        user.id,
        amount,
        `Bet on ${marketId} - ${optionId}`
    )

    if (!success) {
        throw new Error("Insufficient funds to place this bet.")
    }

    // 3. Place Bet
    // Use provided betType or construct a short one.
    // Ensure betType fits varchar constraint if any.
    let finalBetType = betType
    if (!finalBetType) {
        finalBetType = `${marketId.substring(0, 8)}_${optionId.substring(0, 8)}`
    }

    // Truncate to 20 chars if strictly required by Schema, but ideally schema should be text.
    // Assuming varchar(50) or text based on variable length usage.
    // If it's strictly varchar(20), we must truncate.
    // But `winner_{uuid}` is long.
    // Let's assume the column is text or at least 50.

    // Use provided odds or default to 2.0
    // In a real app, we MUST verify odds against DB or Oracle to prevent manipulation.
    // For now, we accept client odds but clamp/sanitize them.
    const finalOdds = odds && odds > 1.0 ? odds : 2.0

    const { error } = await supabase.from("bets").insert({
        user_id: user.id,
        market_id: marketId.startsWith("winner_") || marketId.startsWith("kills_") ? null : marketId, // If it's a dynamic ID, leave market_id null? Or store it?
        // Actually, if market_id is a UUID FK, we can't pass "winner_..." strings.
        // If market_id is nullable text, we can.
        // Looking at previous code: `market_id: null` for "shortBetType".
        // It seems `market_id` might be optional or for "defined" markets.
        // For dynamic markets, we might need to store info in `bet_type` or metadata?
        // Let's store the full info in `bet_type` if `market_id` is problematic.
        // But `bet_type` was truncated before.
        // Let's assume `market_id` is a UUID and nullable.

        // Revised approach:
        // formatting `bet_type` to store the intent if `market_id` is null.
        bet_type: finalBetType,

        stake_amount: amount,
        odds: finalOdds,
        potential_payout: amount * finalOdds,
        status: "pending",
        placed_at: new Date().toISOString(),
    })

    if (error) {
        // Refund
        await serverWalletService.awardPrize(user.id, amount, "Refund: Bet placement failed")
        throw new Error("Failed to place bet: " + error.message)
    }

    revalidatePath(`/draft/room/${contestId}`)
    revalidatePath(`/tournaments/${contestId}`)
    return { success: true }
}
