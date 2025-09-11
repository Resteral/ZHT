import { createClient } from "@/lib/supabase/client"

export interface CaptainSelectionResult {
  captains: {
    id: string
    username: string
    elo_rating: number
    captain_type: "high_elo" | "low_elo" | "mid_elo" | "random"
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
   * Selects exactly as many captains as there are teams in the tournament
   */
  async selectCaptainsAutomatically(tournamentId: string): Promise<CaptainSelectionResult> {
    try {
      console.log("[v0] Starting automatic captain selection for tournament:", tournamentId)

      const { data: tournament, error: tournamentError } = await this.supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) {
        console.error("[v0] Error fetching tournament settings:", tournamentError)
        throw tournamentError
      }

      const maxTeams =
        tournament.max_teams ||
        tournament.player_pool_settings?.max_teams ||
        tournament.player_pool_settings?.num_teams ||
        8
      console.log("[v0] Tournament requires", maxTeams, "captains (one per team)")

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

      if (!poolPlayers || poolPlayers.length < maxTeams) {
        return {
          captains: [],
          success: false,
          message: `Need at least ${maxTeams} players in the pool to select ${maxTeams} captains (one per team)`,
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

      const selectedCaptains = []
      const captainUpdates = []

      // Distribute captains evenly across ELO ranges
      for (let i = 0; i < maxTeams; i++) {
        const playerIndex = Math.floor((i * processedPlayers.length) / maxTeams)
        const captain = processedPlayers[playerIndex]

        selectedCaptains.push({
          id: captain.user_id,
          username: captain.username,
          elo_rating: captain.elo_rating,
          captain_type: i === 0 ? "high_elo" : i === maxTeams - 1 ? "low_elo" : "mid_elo",
        })

        captainUpdates.push({
          tournament_id: tournamentId,
          user_id: captain.user_id,
          status: "captain",
          captain_type: i === 0 ? "high_elo" : i === maxTeams - 1 ? "low_elo" : "mid_elo",
          updated_at: new Date().toISOString(),
        })
      }

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

      console.log("[v0] Successfully selected captains:", selectedCaptains)

      // Log captain selection activity
      await this.logCaptainSelection(tournamentId, selectedCaptains, "automatic")

      return {
        captains: selectedCaptains,
        success: true,
        message: `Successfully selected ${selectedCaptains.length} captains (one per team)`,
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

      const { data: tournament, error: tournamentError } = await this.supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) {
        console.error("[v0] Error fetching tournament settings:", tournamentError)
        throw tournamentError
      }

      const maxTeams =
        tournament.max_teams ||
        tournament.player_pool_settings?.max_teams ||
        tournament.player_pool_settings?.num_teams ||
        8

      if (captainIds.length !== maxTeams) {
        return {
          captains: [],
          success: false,
          message: `Must select exactly ${maxTeams} captains (one per team)`,
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

      if (!selectedPlayers || selectedPlayers.length !== maxTeams) {
        return {
          captains: [],
          success: false,
          message: "Could not find all selected players in tournament pool",
        }
      }

      // Sort by ELO to determine captain types
      const sortedPlayers = selectedPlayers
        .map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)

      const captainUpdates = sortedPlayers.map((player, index) => ({
        user_id: player.user_id,
        captain_type: index === 0 ? "high_elo" : index === maxTeams - 1 ? "low_elo" : "mid_elo",
        username: player.username,
        elo_rating: player.elo_rating,
      }))

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
        captain_type: update.captain_type as "high_elo" | "low_elo" | "mid_elo",
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
   * Randomly select captains from the player pool
   */
  async selectCaptainsRandomly(tournamentId: string): Promise<CaptainSelectionResult> {
    try {
      console.log("[v0] Starting random captain selection for tournament:", tournamentId)

      const { data: tournament, error: tournamentError } = await this.supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) {
        console.error("[v0] Error fetching tournament settings:", tournamentError)
        throw tournamentError
      }

      const maxTeams =
        tournament.max_teams ||
        tournament.player_pool_settings?.max_teams ||
        tournament.player_pool_settings?.num_teams ||
        8
      console.log("[v0] Tournament requires", maxTeams, "captains (one per team)")

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

      if (!poolPlayers || poolPlayers.length < maxTeams) {
        return {
          captains: [],
          success: false,
          message: `Need at least ${maxTeams} players in the pool to select ${maxTeams} captains`,
        }
      }

      // Process players
      const processedPlayers = poolPlayers.map((entry: any) => ({
        user_id: entry.user_id,
        username: entry.users?.username || "Unknown",
        elo_rating: entry.users?.elo_rating || 1200,
        status: entry.status,
      }))

      const shuffledPlayers = [...processedPlayers].sort(() => Math.random() - 0.5)
      const selectedCaptainPlayers = shuffledPlayers.slice(0, maxTeams)

      // Sort selected captains by ELO for type assignment
      const sortedCaptains = selectedCaptainPlayers.sort((a, b) => b.elo_rating - a.elo_rating)

      // Update database to mark selected players as captains
      const captainUpdates = []
      const selectedCaptains = []

      for (let i = 0; i < maxTeams; i++) {
        const captain = sortedCaptains[i]
        const captainType = i === 0 ? "high_elo" : i === maxTeams - 1 ? "low_elo" : "mid_elo"

        captainUpdates.push({
          tournament_id: tournamentId,
          user_id: captain.user_id,
          status: "captain",
          captain_type: captainType,
          updated_at: new Date().toISOString(),
        })

        selectedCaptains.push({
          id: captain.user_id,
          username: captain.username,
          elo_rating: captain.elo_rating,
          captain_type: captainType as "high_elo" | "low_elo" | "mid_elo",
        })
      }

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

      console.log("[v0] Successfully selected random captains:", selectedCaptains)

      // Log captain selection activity
      await this.logCaptainSelection(tournamentId, selectedCaptains, "random")

      return {
        captains: selectedCaptains,
        success: true,
        message: `Successfully selected ${selectedCaptains.length} captains randomly`,
      }
    } catch (error) {
      console.error("[v0] Error in random captain selection:", error)
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
      const { data: tournament, error: tournamentError } = await this.supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) {
        console.error("[v0] Error fetching tournament settings:", tournamentError)
        throw tournamentError
      }

      const maxTeams =
        tournament.max_teams ||
        tournament.player_pool_settings?.max_teams ||
        tournament.player_pool_settings?.num_teams ||
        8

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
      const canSelect = playerCount >= maxTeams

      return {
        canSelect,
        playerCount,
        message: canSelect
          ? `Ready to select ${maxTeams} captains from ${playerCount} players`
          : `Need at least ${maxTeams} players (currently ${playerCount}) to select ${maxTeams} captains`,
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
  private async logCaptainSelection(
    tournamentId: string,
    captains: any[],
    selectionType: "automatic" | "manual" | "random",
  ) {
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
