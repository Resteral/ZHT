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

    const regularTournaments = tournaments.filter((tournament) => tournament.tournament_type !== "league")

    const leagueTournaments = tournaments.filter((tournament) => tournament.tournament_type === "league")

    // Combine and normalize data from both sources
    const allTournaments = [
      ...regularTournaments.map((tournament) => ({
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

  async getLeagueTournaments() {
    console.log("[v0] Fetching league tournaments for ZHL League section...")

    const { data: leagueTournaments, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count)
      `)
      .eq("tournament_type", "league")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching league tournaments:", error)
      return []
    }

    const processedLeagueTournaments = (leagueTournaments || []).map((tournament) => ({
      ...tournament,
      participant_count: tournament.participant_count[0]?.count || 0,
      source: "tournaments",
      duration_days: tournament.player_pool_settings?.duration_type === "long" ? 30 : 7,
    }))

    console.log("[v0] League tournaments result:", {
      count: processedLeagueTournaments.length,
      tournaments: processedLeagueTournaments.map((t) => ({
        id: t.id,
        name: t.name,
        tournament_type: t.tournament_type,
      })),
    })

    return processedLeagueTournaments
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count),
        creator:users!created_by(id, username, display_name)
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
    console.log("[v0] Creating regular tournament:", tournamentData)

    const supabase = createClient()

    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id
    }

    const tournamentToCreate = {
      name: tournamentData.name,
      description: tournamentData.description,
      game: tournamentData.game || "hockey",
      tournament_type: "draft",
      max_participants: tournamentData.max_participants,
      entry_fee: tournamentData.entry_fee || 0,
      prize_pool: tournamentData.prize_pool || 0,
      status: "registration", // Use "registration" status instead of "active" to prevent instant starting
      start_date: tournamentData.start_date,
      end_date: tournamentData.end_date,
      team_based: true,
      created_by: userId, // Ensure created_by is always set
      player_pool_settings: {
        max_teams:
          tournamentData.player_pool_settings?.num_teams || tournamentData.player_pool_settings?.max_teams || 4,
        draft_mode: tournamentData.player_pool_settings?.draft_mode || "snake_draft",
        players_per_team: tournamentData.player_pool_settings?.players_per_team || 4,
        auto_start: false, // Disable auto start to prevent instant tournament starting
        create_lobbies_on_finish: tournamentData.player_pool_settings?.create_lobbies_on_finish || true,
        bracket_type: tournamentData.player_pool_settings?.bracket_type || "single_elimination",
        auction_budget: tournamentData.player_pool_settings?.auction_budget || 500,
        ...tournamentData.player_pool_settings,
      },
    }

    console.log("[v0] Tournament data to create:", tournamentToCreate)

    const { data, error } = await supabase.from("tournaments").insert(tournamentToCreate).select().single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      if (error.code === "23503") {
        throw new Error(`Failed to create tournament: ${error.message}`)
      } else if (error.code === "23514") {
        throw new Error(`Invalid tournament status. Please try again.`)
      }
      throw new Error(`Failed to create tournament: ${error.message}`)
    }

    console.log("[v0] Regular tournament created successfully:", data)

    if (userId && data.id) {
      try {
        console.log("[v0] Adding tournament creator as participant:", userId)

        const { data: participantData, error: participantError } = await supabase
          .from("tournament_participants")
          .insert({
            tournament_id: data.id,
            user_id: userId,
            joined_at: new Date().toISOString(),
            status: "registered",
            is_creator: true, // Flag to identify the tournament creator
          })
          .select()
          .single()

        if (participantError) {
          console.error("[v0] Error adding creator as participant:", participantError)
          // Don't throw error here - tournament was created successfully
          console.log("[v0] Tournament created but creator not added as participant")
        } else {
          console.log("[v0] Tournament creator successfully added as participant:", participantData)
        }
      } catch (participantError) {
        console.error("[v0] Exception adding creator as participant:", participantError)
        // Continue - tournament creation was successful
      }
    }

    return data
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

      const numTeams = tournament.player_pool_settings?.max_teams || tournament.player_pool_settings?.num_teams || 4
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
