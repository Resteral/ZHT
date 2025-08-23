import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const tournamentService = {
  async getTournaments() {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((tournament) => ({
      ...tournament,
      participant_count: tournament.participant_count[0]?.count || 0,
    }))
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return {
      ...data,
      participant_count: data.participant_count[0]?.count || 0,
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
      .from("tournaments")
      .insert({
        name: tournamentData.name,
        description: tournamentData.description,
        game: tournamentData.game || "hockey",
        tournament_type: tournamentData.tournament_type || "snake_draft",
        max_participants: tournamentData.max_participants || 16,
        max_teams: Math.ceil((tournamentData.max_participants || 16) / (tournamentData.players_per_team || 4)),
        entry_fee: tournamentData.entry_fee || 0,
        prize_pool: tournamentData.prize_pool || 0,
        created_by: userId,
        status: "registration",
        start_date: tournamentData.start_date || new Date().toISOString(),
        end_date: tournamentData.end_date,
        team_based: tournamentData.team_based || false,
        player_pool_settings: tournamentData.player_pool_settings || {},
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      throw error
    }

    console.log("[v0] Tournament created successfully:", data)

    const { data: verifyData, error: verifyError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", data.id)
      .single()

    if (verifyError || !verifyData) {
      console.error("[v0] Tournament verification failed:", verifyError)
      throw new Error("Tournament was not saved properly to database")
    }

    console.log("[v0] Tournament verified in database:", verifyData.name)
    return data
  },

  async joinTournament(tournamentId: string, teamName?: string, userId?: string) {
    if (!userId) {
      throw new Error("Not authenticated - please log in")
    }

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)

    const seed = (participants?.length || 0) + 1

    const { data, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: userId,
        team_name: teamName || `Team ${seed}`,
        seed: seed,
        status: "registered",
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
        .eq("id", userId)

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
      .from("tournament_participants")
      .select(`
        *,
        user:users(username, elo_rating, display_name)
      `)
      .eq("tournament_id", tournamentId)
      .order("seed")

    if (error) throw error
    return data
  },

  async getBracket(tournamentId: string) {
    const { data, error } = await supabase
      .from("tournament_brackets")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true })

    if (error) {
      console.error("Error fetching bracket:", error)
      return []
    }

    return data || []
  },

  async generateBracket(tournamentId: string) {
    await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)
  },

  async updateMatchScore(matchId: string, scores: { score1: number; score2: number }) {
    const { error } = await supabase
      .from("tournament_brackets")
      .update({
        score1: scores.score1,
        score2: scores.score2,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (error) {
      console.error("[v0] Error updating match score:", error)
      throw error
    }

    console.log("[v0] Match score updated:", { matchId, scores })
  },
}
