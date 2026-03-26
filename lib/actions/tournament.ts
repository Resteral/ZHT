"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitTournamentScore(tournamentId: string, team1Score: number, team2Score: number, csvCode?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('report_tournament_score', {
        p_tournament_id: tournamentId,
        p_team1_score: team1Score,
        p_team2_score: team2Score,
        p_csv_code: csvCode || null
    })

    if (error) {
        console.error("Error submitting tournament score:", error)
        return { error: error.message }
    }

    revalidatePath(`/draft/score/${tournamentId}`)
    return {
        success: true,
        consensus: data.consensus,
        elo_change_team1: data.elo_change_team1,
        elo_change_team2: data.elo_change_team2
    }
}
