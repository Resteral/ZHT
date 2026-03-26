import { createClient } from "@/lib/supabase/client"

export interface MatchResult {
  team1_score: number
  team2_score: number
  winning_team: number | null
  csv_code: string
  total_submissions: number
}

export const loadMatchResult = async (matchId: string): Promise<MatchResult | null> => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("match_results").select("*").eq("match_id", matchId).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return data
  } catch (error) {
    console.error("[v0] Error loading match result:", error)
    return null
  }
}
