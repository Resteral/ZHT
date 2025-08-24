import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const tournamentService = {
  async getTournaments() {
    console.log("[v0] Starting tournament fetch...")

    const [tournamentsData, leaguesData] = await Promise.all([
      supabase
        .from("tournaments")
        .select(`
          *,
          participant_count:tournament_participants(count)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("leagues")
        .select(`
          *,
          participant_count:league_memberships(count)
        `)
        .eq("league_mode", "tournament")
        .order("created_at", { ascending: false }),
    ])

    console.log("[v0] Tournaments query result:", {
      data: tournamentsData.data,
      error: tournamentsData.error,
      count: tournamentsData.data?.length || 0,
    })

    console.log("[v0] Leagues query result:", {
      data: leaguesData.data,
      error: leaguesData.error,
      count: leaguesData.data?.length || 0,
    })

    const tournaments = tournamentsData.data || []
    const leagues = leaguesData.data || []

    // Combine and normalize data from both sources
    const allTournaments = [
      ...tournaments.map((tournament) => ({
        ...tournament,
        participant_count: tournament.participant_count[0]?.count || 0,
        source: "tournaments",
      })),
      ...leagues.map((league) => ({
        ...league,
        participant_count: league.participant_count[0]?.count || 0,
        source: "leagues",
      })),
    ]

    console.log("[v0] Final tournaments result:", {
      totalCount: allTournaments.length,
      tournaments: allTournaments.map((t) => ({ id: t.id, name: t.name, source: t.source })),
    })

    return allTournaments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
    console.log("[v0] Creating tournament with unlimited capacity:", tournamentData)

    console.log("[v0] Creating anonymous tournament with no user affiliation")

    const supabase = createClient()

    const tournamentToCreate = {
      name: tournamentData.name,
      description: tournamentData.description,
      game: tournamentData.game || "hockey",
      tournament_type: tournamentData.tournament_type || "snake_draft",
      max_participants: 999999, // Unlimited participants
      max_teams: 999999, // Unlimited teams
      entry_fee: 0, // Always free
      prize_pool: tournamentData.prize_pool || 0,
      status: "registration", // Always open for registration
      start_date: new Date().toISOString(), // Start immediately
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // End in 1 year
      team_based: tournamentData.team_based || false,
      player_pool_settings: {
        draft_mode: tournamentData.draft_mode || "snake_draft",
        pick_time_limit: tournamentData.pick_time_limit || 60,
        auto_start: true, // Always auto-start
        num_teams: 999999, // Unlimited teams
        players_per_team: tournamentData.players_per_team || 4,
        create_lobbies_on_finish: true,
        instant_access: true, // New flag for instant access
        no_restrictions: true, // New flag to bypass all checks
        ...tournamentData.settings,
      },
    }

    if (tournamentData.tournament_type === "month_long_draft") {
      const { monthLongTournamentService } = await import("./month-long-tournament-service")
      return await monthLongTournamentService.createMonthLongTournament(
        {
          name: tournamentData.name,
          description: tournamentData.description,
          tournament_type:
            tournamentData.settings?.draft_type === "snake"
              ? "snake_draft"
              : tournamentData.settings?.draft_type === "linear"
                ? "linear_draft"
                : "auction_draft",
          duration_days: tournamentData.duration_days || 30,
          max_participants: 999999, // Unlimited
          entry_fee: 0, // Always free
          start_date: new Date().toISOString(), // Start immediately
        },
        null,
      )
    }

    const { data, error } = await supabase.from("tournaments").insert(tournamentToCreate).select().single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      if (error.code === "23503") {
        throw new Error(`Database constraint error: ${error.message}`)
      } else if (error.code === "22P02") {
        throw new Error("Invalid data format - please check your input and try again")
      }
      throw error
    }

    console.log("[v0] Unlimited tournament created successfully:", data)

    const { data: verifyData, error: verifyError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", data.id)
      .single()

    if (verifyError || !verifyData) {
      console.error("[v0] Tournament verification failed:", verifyError)
      throw new Error("Tournament was not saved properly to database")
    }

    console.log("[v0] Tournament verified and ready for unlimited instant signup:", verifyData.name)
    return data
  },

  async joinTournament(tournamentId: string, teamName?: string, userId?: string) {
    console.log("[v0] Joining tournament with no restrictions:", tournamentId)

    let actualUserId = userId
    if (!userId) {
      const { data: systemUser } = await supabase.from("users").select("id").eq("username", "System").single()
      if (systemUser) {
        actualUserId = systemUser.id
      } else {
        console.log("[v0] No system user found, allowing anonymous tournament participation")
        actualUserId = null
      }
    }

    if (actualUserId) {
      const { data: userData } = await supabase.from("users").select("id, account_id").eq("id", actualUserId).single()
      if (userData) {
        actualUserId = userData.id
      }
    }

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)

    const seed = (participants?.length || 0) + 1

    if (actualUserId) {
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

      if (error && !error.message.includes("duplicate")) {
        throw error
      }

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

      return data || { success: true, message: "Already joined" }
    } else {
      return {
        tournament_id: tournamentId,
        team_name: teamName || `Team ${seed}`,
        seed: seed,
        status: "registered",
        anonymous: true,
      }
    }
  },

  async createLobbiesFromTournament(tournamentId: string) {
    console.log("[v0] Creating lobbies from finished tournament:", tournamentId)

    try {
      // Get tournament details
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tournamentError || !tournament) {
        throw new Error("Tournament not found")
      }

      // Get tournament participants
      const { data: participants, error: participantsError } = await supabase
        .from("tournament_participants")
        .select(`
          *,
          user:users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)

      if (participantsError) {
        throw new Error("Failed to get tournament participants")
      }

      const numTeams = tournament.player_pool_settings?.num_teams || 4
      const playersPerTeam = tournament.player_pool_settings?.players_per_team || 4
      const lobbiesCreated = []

      // Create lobbies for each team matchup
      for (let i = 0; i < numTeams; i += 2) {
        const lobbyName = `${tournament.name} - Match ${Math.floor(i / 2) + 1}`

        const { data: lobby, error: lobbyError } = await supabase
          .from("matches")
          .insert({
            name: lobbyName,
            match_type: "4v4_draft",
            status: "waiting",
            max_participants: playersPerTeam * 2,
            description: `Tournament match from ${tournament.name}`,
            game_state: "lobby",
            tournament_id: tournamentId,
          })
          .select()
          .single()

        if (lobbyError) {
          console.error("Error creating lobby:", lobbyError)
          continue
        }

        lobbiesCreated.push(lobby)
        console.log("[v0] Created lobby:", lobby.id, "for tournament:", tournamentId)
      }

      // Update tournament status to completed
      await supabase
        .from("tournaments")
        .update({
          status: "completed",
          lobbies_created: lobbiesCreated.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      console.log("[v0] Successfully created", lobbiesCreated.length, "lobbies from tournament")
      return lobbiesCreated
    } catch (error) {
      console.error("[v0] Error creating lobbies from tournament:", error)
      throw error
    }
  },

  async finishTournament(tournamentId: string) {
    console.log("[v0] Finishing tournament and creating lobbies:", tournamentId)

    try {
      const lobbies = await this.createLobbiesFromTournament(tournamentId)

      return {
        success: true,
        message: `Tournament finished! Created ${lobbies.length} lobbies for matches.`,
        lobbies: lobbies,
      }
    } catch (error) {
      console.error("[v0] Error finishing tournament:", error)
      return {
        success: false,
        message: `Failed to finish tournament: ${error instanceof Error ? error.message : "Unknown error"}`,
        lobbies: [],
      }
    }
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
