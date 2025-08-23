import { createClient } from "@/lib/supabase/client"

export interface CaptainSelectionResult {
  captains: {
    id: string
    username: string
    elo_rating: number
    captain_type: "high_elo" | "low_elo"
  }[]
  success: boolean
  message: string
}

export interface PlayerPoolEntry {
  user_id: string
  username: string
  elo_rating: number
  status: string
}

class CaptainSelectionService {
  private supabase = createClient()

  /**
   * Automatically select captains based on ELO ratings
   * Selects highest and lowest ELO players as captains
   */
  async selectCaptainsAutomatically(tournamentId: string): Promise<CaptainSelectionResult> {
    try {
      console.log("[v0] Starting automatic captain selection for tournament:", tournamentId)

      // Get all available players in the tournament pool
      const { data: poolPlayers, error: poolError } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")
        .order("created_at", { ascending: true })

      if (poolError) {
        console.error("[v0] Error fetching player pool:", poolError)
        throw poolError
      }

      if (!poolPlayers || poolPlayers.length < 2) {
        return {
          captains: [],
          success: false,
          message: "Need at least 2 players in the pool to select captains",
        }
      }

      // Process and sort players by ELO rating
      const processedPlayers = poolPlayers
        .map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
          status: entry.status,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)

      console.log("[v0] Processed players for captain selection:", processedPlayers.length)

      // Select highest and lowest ELO players as captains
      const highEloCaptain = processedPlayers[0]
      const lowEloCaptain = processedPlayers[processedPlayers.length - 1]

      // Update database to mark selected players as captains
      const captainUpdates = [
        {
          tournament_id: tournamentId,
          user_id: highEloCaptain.user_id,
          status: "captain",
          captain_type: "high_elo",
          updated_at: new Date().toISOString(),
        },
        {
          tournament_id: tournamentId,
          user_id: lowEloCaptain.user_id,
          status: "captain",
          captain_type: "low_elo",
          updated_at: new Date().toISOString(),
        },
      ]

      // Update the tournament_player_pool table
      for (const update of captainUpdates) {
        const { error: updateError } = await this.supabase
          .from("tournament_player_pool")
          .update({
            status: update.status,
            captain_type: update.captain_type,
            updated_at: update.updated_at,
          })
          .eq("tournament_id", update.tournament_id)
          .eq("user_id", update.user_id)

        if (updateError) {
          console.error("[v0] Error updating captain status:", updateError)
          throw updateError
        }
      }

      const selectedCaptains = [
        {
          id: highEloCaptain.user_id,
          username: highEloCaptain.username,
          elo_rating: highEloCaptain.elo_rating,
          captain_type: "high_elo" as const,
        },
        {
          id: lowEloCaptain.user_id,
          username: lowEloCaptain.username,
          elo_rating: lowEloCaptain.elo_rating,
          captain_type: "low_elo" as const,
        },
      ]

      console.log("[v0] Successfully selected captains:", selectedCaptains)

      // Log captain selection activity
      await this.logCaptainSelection(tournamentId, selectedCaptains, "automatic")

      return {
        captains: selectedCaptains,
        success: true,
        message: `Successfully selected ${selectedCaptains.length} captains`,
      }
    } catch (error) {
      console.error("[v0] Error in automatic captain selection:", error)
      return {
        captains: [],
        success: false,
        message: `Failed to select captains: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Manually select specific players as captains
   */
  async selectCaptainsManually(tournamentId: string, captainIds: string[]): Promise<CaptainSelectionResult> {
    try {
      console.log("[v0] Starting manual captain selection for tournament:", tournamentId)

      if (captainIds.length !== 2) {
        return {
          captains: [],
          success: false,
          message: "Must select exactly 2 captains",
        }
      }

      // Get player details for selected captains
      const { data: selectedPlayers, error: playersError } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .in("user_id", captainIds)

      if (playersError) {
        console.error("[v0] Error fetching selected players:", playersError)
        throw playersError
      }

      if (!selectedPlayers || selectedPlayers.length !== 2) {
        return {
          captains: [],
          success: false,
          message: "Could not find all selected players in tournament pool",
        }
      }

      // Sort by ELO to determine high/low captain types
      const sortedPlayers = selectedPlayers
        .map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)

      // Update database with captain assignments
      const captainUpdates = [
        {
          user_id: sortedPlayers[0].user_id,
          captain_type: "high_elo",
          username: sortedPlayers[0].username,
          elo_rating: sortedPlayers[0].elo_rating,
        },
        {
          user_id: sortedPlayers[1].user_id,
          captain_type: "low_elo",
          username: sortedPlayers[1].username,
          elo_rating: sortedPlayers[1].elo_rating,
        },
      ]

      for (const update of captainUpdates) {
        const { error: updateError } = await this.supabase
          .from("tournament_player_pool")
          .update({
            status: "captain",
            captain_type: update.captain_type,
            updated_at: new Date().toISOString(),
          })
          .eq("tournament_id", tournamentId)
          .eq("user_id", update.user_id)

        if (updateError) {
          console.error("[v0] Error updating manual captain status:", updateError)
          throw updateError
        }
      }

      const selectedCaptains = captainUpdates.map((update) => ({
        id: update.user_id,
        username: update.username,
        elo_rating: update.elo_rating,
        captain_type: update.captain_type as "high_elo" | "low_elo",
      }))

      console.log("[v0] Successfully selected manual captains:", selectedCaptains)

      // Log captain selection activity
      await this.logCaptainSelection(tournamentId, selectedCaptains, "manual")

      return {
        captains: selectedCaptains,
        success: true,
        message: `Successfully selected ${selectedCaptains.length} captains manually`,
      }
    } catch (error) {
      console.error("[v0] Error in manual captain selection:", error)
      return {
        captains: [],
        success: false,
        message: `Failed to select captains: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Get current captains for a tournament
   */
  async getCurrentCaptains(tournamentId: string) {
    try {
      const { data: captains, error } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          captain_type,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "captain")
        .order("captain_type", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching current captains:", error)
        throw error
      }

      return (
        captains?.map((entry: any) => ({
          id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
          captain_type: entry.captain_type,
        })) || []
      )
    } catch (error) {
      console.error("[v0] Error getting current captains:", error)
      return []
    }
  }

  /**
   * Reset captain selections for a tournament
   */
  async resetCaptains(tournamentId: string): Promise<boolean> {
    try {
      console.log("[v0] Resetting captains for tournament:", tournamentId)

      const { error } = await this.supabase
        .from("tournament_player_pool")
        .update({
          status: "available",
          captain_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)
        .eq("status", "captain")

      if (error) {
        console.error("[v0] Error resetting captains:", error)
        throw error
      }

      console.log("[v0] Successfully reset captains")
      return true
    } catch (error) {
      console.error("[v0] Error in reset captains:", error)
      return false
    }
  }

  /**
   * Check if tournament has minimum players for captain selection
   */
  async canSelectCaptains(tournamentId: string): Promise<{
    canSelect: boolean
    playerCount: number
    message: string
  }> {
    try {
      const { data: players, error } = await this.supabase
        .from("tournament_player_pool")
        .select("user_id")
        .eq("tournament_id", tournamentId)
        .eq("status", "available")

      if (error) {
        console.error("[v0] Error checking player count:", error)
        throw error
      }

      const playerCount = players?.length || 0
      const canSelect = playerCount >= 2

      return {
        canSelect,
        playerCount,
        message: canSelect
          ? `Ready to select captains from ${playerCount} players`
          : `Need at least 2 players (currently ${playerCount})`,
      }
    } catch (error) {
      console.error("[v0] Error checking captain selection eligibility:", error)
      return {
        canSelect: false,
        playerCount: 0,
        message: "Error checking player pool",
      }
    }
  }

  /**
   * Log captain selection activity for audit trail
   */
  private async logCaptainSelection(tournamentId: string, captains: any[], selectionType: "automatic" | "manual") {
    try {
      const logEntry = {
        tournament_id: tournamentId,
        action: "captain_selection",
        selection_type: selectionType,
        captains_selected: captains.map((c) => ({
          user_id: c.id,
          username: c.username,
          elo_rating: c.elo_rating,
          captain_type: c.captain_type,
        })),
        timestamp: new Date().toISOString(),
      }

      // Insert into tournament activity log (if table exists)
      const { error } = await this.supabase.from("tournament_activity_log").insert(logEntry)

      if (error && !error.message.includes("does not exist")) {
        console.error("[v0] Error logging captain selection:", error)
      }
    } catch (error) {
      console.error("[v0] Error in captain selection logging:", error)
    }
  }

  /**
   * Get captain selection history for a tournament
   */
  async getCaptainSelectionHistory(tournamentId: string) {
    try {
      const { data: history, error } = await this.supabase
        .from("tournament_activity_log")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("action", "captain_selection")
        .order("timestamp", { ascending: false })

      if (error && !error.message.includes("does not exist")) {
        console.error("[v0] Error fetching captain selection history:", error)
        return []
      }

      return history || []
    } catch (error) {
      console.error("[v0] Error getting captain selection history:", error)
      return []
    }
  }
}

export const captainSelectionService = new CaptainSelectionService()
