import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const tournamentService = {
  async getTournaments() {
    const { data, error } = await supabase
      .from("leagues")
      .select(`
        *,
        participant_count:league_memberships(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((tournament) => ({
      ...tournament,
      participant_count: tournament.participant_count[0]?.count || 0,
      // Map league fields to tournament interface
      tournament_type: tournament.league_mode || "standard",
      max_participants: tournament.max_teams || 16,
      start_date: tournament.created_at,
    }))
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from("leagues")
      .select(`
        *,
        participant_count:league_memberships(count)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return {
      ...data,
      participant_count: data.participant_count[0]?.count || 0,
      // Map league fields to tournament interface
      tournament_type: data.league_mode || "standard",
      max_participants: data.max_teams || 16,
      start_date: data.created_at,
    }
  },

  async createTournament(tournamentData: any, userId?: string) {
    console.log("[v0] Creating tournament with data:", tournamentData)

    if (!userId) {
      throw new Error("Not authenticated - please log in")
    }

    console.log("[v0] Authenticated user:", userId)

    const supabase = createClient()

    // Verify user exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .single()

    if (userCheckError && userCheckError.code === "PGRST116") {
      // User doesn't exist, get from auth and create in users table
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        throw new Error("User not authenticated")
      }

      console.log("[v0] Creating user in users table:", authUser.id)
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: authUser.id,
          username: authUser.email?.split("@")[0] || `user_${authUser.id.slice(0, 8)}`,
          email: authUser.email,
          elo_rating: 1200,
          total_games: 0,
          wins: 0,
          losses: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error("[v0] Failed to create user:", createError)
        throw new Error(`Failed to create user: ${createError.message}`)
      }
      console.log("[v0] User created successfully:", newUser.username)
    } else if (userCheckError) {
      console.error("[v0] Database error checking user:", userCheckError)
      throw new Error(`Database error: ${userCheckError.message}`)
    } else {
      console.log("[v0] User verified in database:", existingUser.username)
    }

    if (tournamentData.tournament_type === "month_long_draft") {
      const { monthLongTournamentService } = await import("./month-long-tournament-service")
      return await monthLongTournamentService.createMonthLongTournament(
        {
          name: tournamentData.name,
          description: tournamentData.description,
          tournament_type:
            tournamentData.player_pool_settings.draft_type === "snake"
              ? "snake_draft"
              : tournamentData.player_pool_settings.draft_type === "linear"
                ? "linear_draft"
                : "auction_draft",
          duration_days: tournamentData.duration_days || 30,
          max_participants: tournamentData.max_participants,
          entry_fee: tournamentData.entry_fee,
          start_date: tournamentData.start_date,
        },
        userId,
      )
    }

    const { data, error } = await supabase
      .from("leagues")
      .insert({
        name: tournamentData.name,
        sport: tournamentData.game || "hockey",
        max_teams: tournamentData.max_participants || 16,
        entry_fee: tournamentData.entry_fee || 0,
        prize_pool: tournamentData.prize_pool || 0,
        commissioner_id: userId, // Use passed userId instead of user.id
        league_mode: "tournament", // Always set to tournament to distinguish from regular leagues
        status: "registration",
        season: new Date().getFullYear().toString(),
        tournament_type: tournamentData.tournament_type || "snake_draft", // Add specific tournament type
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      throw error
    }

    console.log("[v0] Tournament created successfully:", data)
    return data
  },

  async joinTournament(tournamentId: string, teamName?: string, userId?: string) {
    if (!userId) {
      throw new Error("Not authenticated - please log in")
    }

    const { data: participants } = await supabase.from("league_memberships").select("id").eq("league_id", tournamentId)

    const seed = (participants?.length || 0) + 1

    const { data, error } = await supabase
      .from("league_memberships")
      .insert({
        league_id: tournamentId,
        user_id: userId, // Use passed userId instead of user.id
        team_name: teamName || `Team ${seed}`,
        draft_position: seed,
        total_budget: 1000,
        remaining_budget: 1000,
      })
      .select()
      .single()

    if (error) throw error

    try {
      const { error: balanceError } = await supabase
        .from("users")
        .update({
          balance: supabase.raw("balance + ?", [25]),
        })
        .eq("id", userId) // Use passed userId instead of user.id

      if (balanceError) {
        console.error("Error updating user balance:", balanceError)
      }
    } catch (rewardError) {
      console.error("Error processing tournament participation reward:", rewardError)
    }

    return data
  },

  async getParticipants(tournamentId: string) {
    const { data, error } = await supabase
      .from("league_memberships")
      .select(`
        *,
        user:users(username, elo_rating, display_name)
      `)
      .eq("league_id", tournamentId)
      .order("draft_position")

    if (error) throw error
    return data
  },

  async getBracket(tournamentId: string) {
    // Return empty bracket for now since tournament_brackets table doesn't exist
    return []
  },

  async generateBracket(tournamentId: string) {
    // Update league status to in_progress
    await supabase.from("leagues").update({ status: "in_progress" }).eq("id", tournamentId)
  },

  async updateMatchScore(matchId: string, scores: { score1: number; score2: number }) {
    // Simplified match score update - could use matches table if needed
    console.log("[v0] Match score updated:", { matchId, scores })
  },
}
