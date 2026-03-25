import { createClient } from "@/lib/supabase/client"

export class TournamentCompletionService {
  private supabase = createClient()

  async checkAndCompleteFinishedTournaments(): Promise<void> {
    try {
      console.log("[v0] Checking for finished tournaments and leagues")

      // Check tournaments (short format with brackets)
      const { data: tournaments, error: tournamentsError } = await this.supabase
        .from("tournaments")
        .select(`
          id,
          name,
          tournament_type,
          status,
          tournament_brackets(*)
        `)
        .eq("status", "active")
        .in("tournament_type", ["tournament", "short"])

      if (tournamentsError) throw tournamentsError

      for (const tournament of tournaments || []) {
        const isComplete = await this.checkTournamentBracketComplete(tournament.id)
        if (isComplete) {
          await this.completeTournament(tournament.id)
          console.log("[v0] Auto-completed tournament:", tournament.name)
        }
      }

      // Check leagues (long format with manual scheduling)
      const { data: leagues, error: leaguesError } = await this.supabase
        .from("tournaments")
        .select(`
          id,
          name,
          tournament_type,
          status,
          player_pool_settings
        `)
        .eq("status", "active")
        .in("tournament_type", ["league", "long"])

      if (leaguesError) throw leaguesError

      for (const league of leagues || []) {
        const isComplete = await this.checkLeagueComplete(league.id)
        if (isComplete) {
          await this.completeTournament(league.id)
          console.log("[v0] Auto-completed league:", league.name)
        }
      }
    } catch (error) {
      console.error("[v0] Error checking tournament completion:", error)
    }
  }

  private async checkTournamentBracketComplete(tournamentId: string): Promise<boolean> {
    try {
      const { data: brackets, error } = await this.supabase
        .from("tournament_brackets")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("is_final", true)
        .not("winner_id", "is", null)

      if (error) throw error
      return (brackets?.length || 0) > 0
    } catch (error) {
      console.error("[v0] Error checking bracket completion:", error)
      return false
    }
  }

  private async checkLeagueComplete(leagueId: string): Promise<boolean> {
    try {
      // Check if all scheduled games are completed
      const { data: games, error } = await this.supabase.from("league_games").select("status").eq("league_id", leagueId)

      if (error) throw error

      const totalGames = games?.length || 0
      const completedGames = games?.filter((game) => game.status === "completed").length || 0

      // League is complete if all games are finished
      return totalGames > 0 && completedGames === totalGames
    } catch (error) {
      console.error("[v0] Error checking league completion:", error)
      return false
    }
  }

  async completeTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("[v0] Starting tournament completion for:", tournamentId)

      // Update tournament status to completed
      const { error: statusError } = await this.supabase
        .from("tournaments")
        .update({
          status: "completed",
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (statusError) throw statusError

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
