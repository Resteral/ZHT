"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isModeAllowedForGame } from "@/lib/game-config"

export async function createMatch(formData: FormData) {
    const supabase = await createClient()

    const entryFee = parseFloat(formData.get("entryFee")?.toString() || "0")
    const teamSize = parseInt(formData.get("teamSize")?.toString() || "1")
    const game = formData.get("game")?.toString() || "zealot_hockey"

    if (entryFee <= 0) {
        return { error: "Entry fee must be positive" }
    }

    // Validate team size for the selected game
    const modeId = `${teamSize}v${teamSize}`
    if (!isModeAllowedForGame(game, modeId)) {
        return { error: `${modeId} is not allowed for this game` }
    }

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return { error: "Not authenticated" }
    }

    // Check balance (optimistic check)
    const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()

    if (!profile || profile.balance < entryFee) {
        return { error: "Insufficient funds" }
    }

    // Atomic Deduct (Lock funds)
    const adminSupabase = await createAdminClient()
    const { error: txError } = await adminSupabase.rpc("increment_balance", {
        user_id: user.id,
        amount: -entryFee,
    })

    if (txError) return { error: "Transaction failed: Insufficient funds" }

    // Log Transaction (Use admin client or regular client if RLS allows)
    const { error: logError } = await adminSupabase.from("transactions").insert({
        user_id: user.id,
        amount: -entryFee,
        type: "entry_fee_payment",
        provider: "platform",
        status: "completed",
        external_id: "match_creation_fee",
    })

    if (logError) {
        console.error("Failed to log transaction", logError)
    }

    // Create Match
    const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
            creator_id: user.id,
            entry_fee: entryFee,
            team_size: teamSize,
            game: game,
            status: "open",
        })
        .select()
        .single()

    if (matchError) {
        // Refund on failure
        const adminSupabase = await createAdminClient()
        await adminSupabase.rpc("increment_balance", { user_id: user.id, amount: entryFee })
        // Log Refund
        await adminSupabase.from("transactions").insert({
            user_id: user.id,
            amount: entryFee,
            type: "refund",
            provider: "platform",
            status: "completed",
            external_id: "match_creation_failed_refund",
        })
        return { error: "Failed to create match" }
    }

    // Add Creator as Participant
    await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
        team_id: 1, // Creator is always Team 1
        status: "joined",
    })

    revalidatePath("/")
    redirect(`/match/${match.id}`)
}

export async function joinMatch(matchId: string, teamId: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // Fetch match
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single()
    if (!match || match.status !== "open") return { error: "Match unavailable" }

    // Check balance
    const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
    if (!profile || profile.balance < match.entry_fee) return { error: "Insufficient funds" }

    // Atomic Deduct
    const adminSupabase = await createAdminClient()
    const { error: txError } = await adminSupabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -match.entry_fee
    })
    if (txError) return { error: "Transaction failed: Insufficient funds" }

    // Log Transaction
    await adminSupabase.from("transactions").insert({
        user_id: user.id,
        amount: -match.entry_fee,
        type: 'entry_fee_payment',
        provider: 'platform',
        status: 'completed',
        external_id: `match_join_fee_${matchId}`
    })

    // Join
    const { error: joinError } = await supabase.from("match_participants").insert({
        match_id: matchId,
        user_id: user.id,
        team_id: teamId,
        status: "joined"
    })

    if (joinError) {
        // Refund
        const adminSupabase = await createAdminClient()
        await adminSupabase.rpc('increment_balance', { user_id: user.id, amount: match.entry_fee })
        await adminSupabase.from("transactions").insert({
            user_id: user.id,
            amount: match.entry_fee,
            type: 'refund',
            provider: 'platform',
            status: 'completed',
            external_id: `match_join_failed_${matchId}`
        })
        return { error: "Failed to join" }
    }

    revalidatePath(`/match/${matchId}`)
    return { success: true }
}

export async function reportResult(matchId: string, winnerTeamId: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // 1. Verify match exists and user is a participant
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single()
    if (!match) return { error: "Match not found" }

    if (match.status !== "open" && match.status !== "in_progress") {
        return { error: "Match already completed or disputed" }
    }

    // Check if user is participant
    const { data: participant } = await supabase.from("match_participants")
        .select("*")
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .single()

    if (!participant) return { error: "You are not a participant" }

    const { error: updateError } = await supabase.from("matches").update({
        status: "completed",
        winner_team_id: winnerTeamId,
        updated_at: new Date().toISOString()
    }).eq("id", matchId)

    if (updateError) return { error: "Failed to update match result" }

    // 3. Payout Logic
    // Get all participants of winning team
    const { data: winners } = await supabase.from("match_participants")
        .select("user_id")
        .eq("match_id", matchId)
        .eq("team_id", winnerTeamId)

    if (winners && winners.length > 0) {
        let totalPot = 0;
        const { data: tournament } = await supabase.from("tournaments").select("prize_pool").eq("id", matchId).single()

        if (tournament && tournament.prize_pool) {
            totalPot = tournament.prize_pool;
        } else {
            const { count: totalParticipants } = await supabase.from("match_participants")
                .select("*", { count: 'exact', head: true })
                .eq("match_id", matchId)

            const grossPot = match.entry_fee * (totalParticipants || 0)

            // Fetch global rake setting
            const { data: rakeSetting } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'rake_percentage')
                .single();

            const rakePercentage = rakeSetting?.value ? parseFloat(rakeSetting.value) : 0.10;
            totalPot = grossPot - (grossPot * rakePercentage);
        }

        const payoutPerWinner = totalPot / winners.length

        // Distribute
        const adminSupabase = await createAdminClient()
        for (const winner of winners) {
            await adminSupabase.rpc('increment_balance', {
                user_id: winner.user_id,
                amount: payoutPerWinner
            })

            await adminSupabase.from("transactions").insert({
                user_id: winner.user_id,
                amount: payoutPerWinner,
                type: 'tournament_payout',
                provider: 'platform',
                status: 'completed',
                external_id: `match_payout_${matchId}`
            })
        }
    }

    revalidatePath(`/match/${matchId}`)
    return { success: true }
}
