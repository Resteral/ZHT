import { createClient } from "@/lib/supabase/client"

export interface CaptainSelectionResult {
  captains: {
    id: string
    username: string
    elo_rating: number
    captain_type: "high_elo" | "low_elo" | null
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
  private _supabaseClient = createClient()

  get supabase() {
    return this._supabaseClient
  }

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

      const numTeams = tournament.player_pool_settings?.num_teams || 3
      console.log("[v0] Tournament requires", numTeams, "captains")

      const { data: poolPlayers, error: poolError } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")
        .is("captain_type", null)
        .order("created_at", { ascending: true })

      if (poolError) {
        console.error("[v0] Error fetching player pool:", poolError)

        console.log("[v0] Player pool not found, attempting to populate from participants...")
        await this.populatePlayerPoolFromParticipants(tournamentId)

        const { data: retryPoolPlayers, error: retryError } = await this.supabase
          .from("tournament_player_pool")
          .select(`
            user_id,
            status,
            users(username, elo_rating)
          `)
          .eq("tournament_id", tournamentId)
          .eq("status", "available")
          .is("captain_type", null)
          .order("created_at", { ascending: true })

        if (retryError || !retryPoolPlayers) {
          throw new Error("Failed to populate or access player pool")
        }

        return await this.processCaptainSelection(tournamentId, retryPoolPlayers, numTeams)
      }

      if (!poolPlayers || poolPlayers.length < numTeams) {
        return {
          captains: [],
          success: false,
          message: `Need at least ${numTeams} players in the pool to select ${numTeams} captains`,
        }
      }

      return await this.processCaptainSelection(tournamentId, poolPlayers, numTeams)
    } catch (error) {
      console.error("[v0] Error in automatic captain selection:", error)
      return {
        captains: [],
        success: false,
        message: `Failed to select captains: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  private async processCaptainSelection(
    tournamentId: string,
    poolPlayers: any[],
    numTeams: number,
  ): Promise<CaptainSelectionResult> {
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

    // Select captains based on number of teams needed
    for (let i = 0; i < numTeams; i++) {
      let player
      let captainType: "high_elo" | "low_elo" | null = null

      if (i === 0) {
        // First captain: highest ELO
        player = processedPlayers[0]
        captainType = "high_elo"
      } else if (i === 1 && numTeams >= 2) {
        // Second captain: lowest ELO
        player = processedPlayers[processedPlayers.length - 1]
        captainType = "low_elo"
      } else {
        // Additional captains: middle ELO players, no captain_type due to DB constraint
        const middleIndex = Math.floor(processedPlayers.length / (numTeams - 1)) * (i - 1)
        const adjustedIndex = Math.min(middleIndex, processedPlayers.length - 1)
        player = processedPlayers[adjustedIndex]
        captainType = null // Set to null to avoid constraint violation
      }

      selectedCaptains.push({
        id: player.user_id,
        username: player.username,
        elo_rating: player.elo_rating,
        captain_type: captainType,
      })

      captainUpdates.push({
        tournament_id: tournamentId,
        user_id: player.user_id,
        captain_type: captainType,
        updated_at: new Date().toISOString(),
      })
    }

    // Update database with captain selections
    for (const update of captainUpdates) {
      const updateData: any = {
        status: "drafted", // Changed from "captain" to "drafted"
        updated_at: update.updated_at,
      }

      if (update.captain_type !== null) {
        updateData.captain_type = update.captain_type
      }

      const { error: updateError } = await this.supabase
        .from("tournament_player_pool")
        .update(updateData)
        .eq("tournament_id", update.tournament_id)
        .eq("user_id", update.user_id)

      if (updateError) {
        console.error("[v0] Error updating captain status:", updateError)
        throw updateError
      }
    }

    console.log("[v0] Successfully selected captains:", selectedCaptains)

    await this.logCaptainSelection(tournamentId, selectedCaptains, "automatic")

    return {
      captains: selectedCaptains,
      success: true,
      message: `Successfully selected ${selectedCaptains.length} captains`,
    }
  }

  /**
   * Manually select specific players as captains
   */
  async selectCaptainsManually(tournamentId: string, captainIds: string[]): Promise<CaptainSelectionResult> {
    try {
      console.log("[v0] Starting manual captain selection for tournament:", tournamentId)
      console.log("[v0] Captain IDs to select:", captainIds)

      const { data: tournament, error: tournamentError } = await this.supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) {
        console.error("[v0] Error fetching tournament settings:", tournamentError)
        throw tournamentError
      }

      const maxCaptains = tournament.player_pool_settings?.num_teams || tournament.max_teams || 2

      if (captainIds.length > maxCaptains) {
        return {
          captains: [],
          success: false,
          message: `Can only select maximum ${maxCaptains} captains for ${maxCaptains} teams`,
        }
      }

      const { data: selectedPlayers, error: playersError } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .in("user_id", captainIds)

      if (playersError) {
        console.error("[v0] Error fetching selected players:", playersError)
        throw playersError
      }

      console.log("[v0] Found players in pool:", selectedPlayers)

      if (!selectedPlayers || selectedPlayers.length !== captainIds.length) {
        return {
          captains: [],
          success: false,
          message: `Could not find all selected players in tournament pool. Found ${selectedPlayers?.length || 0} of ${captainIds.length} players.`,
        }
      }

      const alreadyCaptains = selectedPlayers.filter((p) => p.captain_type !== null)
      if (alreadyCaptains.length > 0) {
        return {
          captains: [],
          success: false,
          message: `Some selected players are already captains: ${alreadyCaptains.map((p) => p.users?.username).join(", ")}`,
        }
      }

      const unavailablePlayers = selectedPlayers.filter((p) => p.status !== "available")
      if (unavailablePlayers.length > 0) {
        return {
          captains: [],
          success: false,
          message: `Some selected players are not available: ${unavailablePlayers.map((p) => p.users?.username).join(", ")}`,
        }
      }

      const sortedPlayers = selectedPlayers
        .map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)

      console.log("[v0] Sorted players for captain assignment:", sortedPlayers)

      const captainUpdates = sortedPlayers.map((player, index) => ({
        user_id: player.user_id,
        captain_type: index === 0 ? "high_elo" : "low_elo",
        username: player.username,
        elo_rating: player.elo_rating,
      }))

      console.log("[v0] Captain updates to apply:", captainUpdates)

      for (const update of captainUpdates) {
        const { error: updateError } = await this.supabase
          .from("tournament_player_pool")
          .update({
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

      const maxCaptains = tournament.player_pool_settings?.num_teams || tournament.max_teams || 2
      console.log("[v0] Tournament will select", maxCaptains, "captains for", maxCaptains, "teams")

      const { data: poolPlayers, error: poolError } = await this.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")
        .is("captain_type", null)
        .order("created_at", { ascending: true })

      if (poolError) {
        console.error("[v0] Error fetching player pool:", poolError)
        throw poolError
      }

      if (!poolPlayers || poolPlayers.length < maxCaptains) {
        return {
          captains: [],
          success: false,
          message: `Need at least ${maxCaptains} players in the pool to select ${maxCaptains} captains`,
        }
      }

      const processedPlayers = poolPlayers.map((entry: any) => ({
        user_id: entry.user_id,
        username: entry.users?.username || "Unknown",
        elo_rating: entry.users?.elo_rating || 1200,
        status: entry.status,
      }))

      const shuffledPlayers = [...processedPlayers].sort(() => Math.random() - 0.5)
      const selectedCaptainPlayers = shuffledPlayers.slice(0, maxCaptains)

      const sortedCaptains = selectedCaptainPlayers.sort((a, b) => b.elo_rating - a.elo_rating)

      const captainUpdates = []
      const selectedCaptains = []

      for (let i = 0; i < maxCaptains && i < sortedCaptains.length; i++) {
        const captain = sortedCaptains[i]
        const captainType = i === 0 ? "high_elo" : "low_elo"

        captainUpdates.push({
          tournament_id: tournamentId,
          user_id: captain.user_id,
          captain_type: captainType,
          updated_at: new Date().toISOString(),
        })

        selectedCaptains.push({
          id: captain.user_id,
          username: captain.username,
          elo_rating: captain.elo_rating,
          captain_type: captainType as "high_elo" | "low_elo",
        })
      }

      for (const update of captainUpdates) {
        const updateData: any = {
          status: "drafted", // Changed from "captain" to "drafted"
          updated_at: update.updated_at,
        }

        if (update.captain_type) {
          updateData.captain_type = update.captain_type
        }

        const { error: updateError } = await this.supabase
          .from("tournament_player_pool")
          .update(updateData)
          .eq("tournament_id", update.tournament_id)
          .eq("user_id", update.user_id)

        if (updateError) {
          console.error("[v0] Error updating captain status:", updateError)
          throw updateError
        }
      }

      console.log("[v0] Successfully selected random captains:", selectedCaptains)

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
        .not("captain_type", "is", null) // Find players with captain_type set
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

  async resetCaptains(tournamentId: string): Promise<boolean> {
    try {
      console.log("[v0] Resetting captains for tournament:", tournamentId)

      const { error } = await this.supabase
        .from("tournament_player_pool")
        .update({
          captain_type: null,
          status: "available", // Reset status back to available
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)
        .not("captain_type", "is", null)

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

      const numTeams = tournament.player_pool_settings?.num_teams || tournament.max_teams || 2

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
      const canSelect = playerCount >= numTeams

      return {
        canSelect,
        playerCount,
        message: canSelect
          ? `Ready to select ${numTeams} captains from ${playerCount} players`
          : `Need at least ${numTeams} players (currently ${playerCount}) to select ${numTeams} captains`,
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

      const { error } = await this.supabase.from("tournament_activity_log").insert(logEntry)

      if (error && !error.message.includes("does not exist")) {
        console.error("[v0] Error logging captain selection:", error)
      }
    } catch (error) {
      console.error("[v0] Error in captain selection logging:", error)
    }
  }

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

  private async populatePlayerPoolFromParticipants(tournamentId: string) {
    try {
      console.log("[v0] Populating player pool from tournament participants...")

      const { data: participants } = await this.supabase
        .from("tournament_participants")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "registered")

      if (participants && participants.length > 0) {
        const poolEntries = participants.map((participant: any) => ({
          tournament_id: tournamentId,
          user_id: participant.user_id,
          status: "available",
          created_at: new Date().toISOString(),
        }))

        const { error: insertError } = await this.supabase.from("tournament_player_pool").insert(poolEntries)

        if (insertError) {
          console.error("[v0] Error populating player pool:", insertError)
        } else {
          console.log("[v0] Successfully populated player pool with", poolEntries.length, "players")
        }
      }
    } catch (error) {
      console.error("[v0] Error populating player pool:", error)
    }
  }
}

export const captainSelectionService = new CaptainSelectionService()
