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

    // First, try to find user by the auth UUID directly
    let { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, username, account_id")
      .eq("id", userId)
      .single()

    // If not found by UUID, try by username (since logs show "Resteral" exists)
    if (userCheckError && userCheckError.code === "PGRST116") {
      const { data: userByUsername, error: usernameError } = await supabase
        .from("users")
        .select("id, username, account_id")
        .eq("username", "Resteral")
        .single()

      if (!usernameError && userByUsername) {
        existingUser = userByUsername
        userCheckError = null
        console.log("[v0] Found user by username, using database UUID:", userByUsername.id)
      }
    }

    // If still not found, create the user with the auth UUID
    if (userCheckError && userCheckError.code === "PGRST116") {
      console.log("[v0] User not found, creating new user with UUID:", userId)

      const userToCreate = {
        id: userId, // Use the auth UUID as the database UUID
        username: "Resteral",
        email: "resteral@temp.com",
        elo_rating: 1200,
        total_games: 0,
        wins: 0,
        losses: 0,
        balance: 100,
        mmr: 1200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: newUser, error: createError } = await supabase.from("users").insert(userToCreate).select().single()

      if (createError) {
        console.error("[v0] Failed to create user:", createError)
        if (createError.code === "23505") {
          // User already exists, try to fetch by username again
          const { data: retryUser } = await supabase
            .from("users")
            .select("id, username, account_id")
            .eq("username", "Resteral")
            .single()

          if (retryUser) {
            console.log("[v0] User found on retry:", retryUser.username)
            existingUser = retryUser
          } else {
            throw new Error(`User creation failed: ${createError.message}`)
          }
        } else {
          throw new Error(`Failed to create user: ${createError.message}`)
        }
      } else {
        console.log("[v0] User created successfully:", newUser.username)
        existingUser = newUser
      }
    } else if (userCheckError) {
      console.error("[v0] Database error checking user:", userCheckError)
      throw new Error(`Database error: ${userCheckError.message}`)
    }

    if (!existingUser) {
      throw new Error("User verification failed - could not find or create user")
    }

    console.log("[v0] User verified in database:", existingUser.username)
    const actualUserId = existingUser.id // Use the actual database UUID

    const { data: finalUserCheck } = await supabase.from("users").select("id").eq("id", actualUserId).single()

    if (!finalUserCheck) {
      throw new Error("User verification failed - database UUID not found")
    }

    console.log("[v0] Final user verification passed, creating tournament...")

    const tournamentToCreate = {
      name: tournamentData.name,
      description: tournamentData.description,
      game: tournamentData.game || "hockey",
      tournament_type: tournamentData.tournament_type || "snake_draft",
      max_participants: tournamentData.max_participants || 16,
      max_teams: Math.ceil((tournamentData.max_participants || 16) / (tournamentData.players_per_team || 4)),
      entry_fee: tournamentData.entry_fee || 0,
      prize_pool: tournamentData.prize_pool || 0,
      created_by: actualUserId, // Use database UUID for foreign key constraint
      status: "registration", // Immediate registration
      start_date: tournamentData.start_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_date: tournamentData.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      team_based: tournamentData.team_based || false,
      // Store all additional settings in the jsonb field
      player_pool_settings: {
        draft_mode: tournamentData.draft_mode || "snake_draft",
        pick_time_limit: tournamentData.pick_time_limit || 60,
        auto_start: tournamentData.auto_start || true,
        allow_trades: tournamentData.allow_trades || false,
        auction_budget: tournamentData.auction_budget || 1000,
        bid_time_limit: tournamentData.bid_time_limit || 30,
        enable_player_pool: tournamentData.enable_player_pool || true,
        num_teams: tournamentData.num_teams || 4,
        players_per_team: tournamentData.players_per_team || 4,
        max_pool_size: tournamentData.max_pool_size || tournamentData.max_participants || 30,
        registration_open: true, // Enable immediate registration
        registration_opens: new Date().toISOString(), // Open now
        registration_closes: tournamentData.start_date || new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
        ...tournamentData.player_pool_settings,
      },
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
        actualUserId, // Use the actual auth user ID
      )
    }

    const { data, error } = await supabase.from("tournaments").insert(tournamentToCreate).select().single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      if (error.code === "23503" && error.message.includes("tournaments_created_by_fkey")) {
        throw new Error("User authentication error - please try logging out and back in")
      }
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

    console.log("[v0] Tournament verified and ready for immediate signup:", verifyData.name)
    return data
  },

  async joinTournamentPool(tournamentId: string, userId?: string) {
    if (!userId) {
      throw new Error("Not authenticated - please log in")
    }

    console.log("[v0] Joining tournament pool:", tournamentId)

    let actualUserId = userId
    const { data: userData } = await supabase
      .from("users")
      .select("id, elo_rating, balance, account_id")
      .or(`account_id.eq.${userId},username.eq.${userId},id.eq.${userId}`)
      .single()

    if (userData) {
      actualUserId = userData.id // Use database UUID for operations
    }

    if (!userData || userData.elo_rating < 1000) {
      throw new Error("You need at least 1000 ELO to join tournaments. Play more matches to increase your rating!")
    }

    // Check if already in pool
    const { data: existingEntry } = await supabase
      .from("tournament_player_pool")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", actualUserId)
      .single()

    if (existingEntry) {
      throw new Error("You're already in this tournament's player pool!")
    }

    // Check tournament capacity
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("player_pool_settings, max_participants")
      .eq("id", tournamentId)
      .single()

    const maxPoolSize = tournament?.player_pool_settings?.max_pool_size || tournament?.max_participants || 30

    const { data: currentPool } = await supabase
      .from("tournament_player_pool")
      .select("id")
      .eq("tournament_id", tournamentId)

    if (currentPool && currentPool.length >= maxPoolSize) {
      throw new Error("Tournament player pool is full!")
    }

    // Join the pool (like ELO league)
    const { error: poolError } = await supabase.from("tournament_player_pool").insert({
      tournament_id: tournamentId,
      user_id: actualUserId,
      status: "available",
      created_at: new Date().toISOString(),
    })

    if (poolError && !poolError.message.includes("duplicate")) {
      throw poolError
    }

    // Give instant reward (like ELO league)
    const { error: balanceError } = await supabase.rpc("update_user_balance", {
      user_id: actualUserId,
      amount: 25,
    })

    if (balanceError) {
      console.error("Error updating wallet balance:", balanceError)
    }

    // Record transaction
    await supabase.from("wallet_transactions").insert({
      user_id: actualUserId,
      amount: 25,
      transaction_type: "tournament_participation",
      description: `Tournament signup reward`,
      reference_id: tournamentId,
    })

    console.log("[v0] Successfully joined tournament pool with instant reward")
    return { success: true, reward: 25 }
  },

  async joinTournament(tournamentId: string, teamName?: string, userId?: string) {
    if (!userId) {
      throw new Error("Not authenticated - please log in")
    }

    let actualUserId = userId
    const { data: userData } = await supabase
      .from("users")
      .select("id, account_id")
      .or(`account_id.eq.${userId},username.eq.${userId},id.eq.${userId}`)
      .single()

    if (userData) {
      actualUserId = userData.id // Use database UUID for operations
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
        user_id: actualUserId,
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
        .eq("id", actualUserId)

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
