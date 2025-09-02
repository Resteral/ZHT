import { createClient } from "@/lib/supabase/client"

export class TournamentCompletionService {
  private supabase = createClient()

  async completeTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("[v0] Starting tournament completion for:", tournamentId)

      // Call the database function to record tournament completion
      const { data, error } = await this.supabase.rpc("record_tournament_completion", {
        tournament_id_param: tournamentId,
      })

      if (error) {
        console.error("[v0] Error completing tournament:", error)
        return { success: false, error: error.message }
      }

      console.log("[v0] Tournament completion successful")
      return { success: true }
    } catch (error) {
      console.error("[v0] Tournament completion service error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getUserTournamentTrophies(userId: string) {
    try {
      const { data, error } = await this.supabase.rpc("get_user_tournament_trophies", {
        user_id_param: userId,
      })

      if (error) {
        console.error("[v0] Error fetching tournament trophies:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("[v0] Tournament trophies service error:", error)
      return []
    }
  }

  async getUserTournamentStats(userId: string) {
    try {
      const { data, error } = await this.supabase.rpc("get_user_tournament_stats", {
        user_id_param: userId,
      })

      if (error) {
        console.error("[v0] Error fetching tournament stats:", error)
        return null
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error("[v0] Tournament stats service error:", error)
      return null
    }
  }

  async awardTournamentAchievement(
    userId: string,
    tournamentId: string,
    tournamentName: string,
    finalPosition: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc("award_tournament_achievements", {
        user_id_param: userId,
        tournament_id_param: tournamentId,
        tournament_name_param: tournamentName,
        final_position_param: finalPosition,
      })

      if (error) {
        console.error("[v0] Error awarding tournament achievement:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error("[v0] Tournament achievement service error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const tournamentCompletionService = new TournamentCompletionService()
