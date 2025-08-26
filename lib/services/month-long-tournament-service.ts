import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface TournamentPhase {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: "upcoming" | "active" | "completed"
  phase_type: "registration" | "auction" | "group_stage" | "playoffs" | "finals"
  settings: Record<string, any>
}

export interface MonthLongTournament {
  id: string
  name: string
  description: string
  tournament_type: "snake_draft" | "linear_draft" | "auction_draft" | "draft"
  duration_days: number
  max_participants: number
  current_participants: number
  entry_fee: number
  prize_pool: number
  status: string
  phases: TournamentPhase[]
  settings: Record<string, any>
  created_at: string
  start_date: string
  end_date: string
}

export const monthLongTournamentService = {
  async createMonthLongTournament(
    tournamentData: {
      name: string
      description: string
      tournament_type: "snake_draft" | "linear_draft" | "auction_draft" | "draft"
      duration_days: number
      max_participants: number
      entry_fee: number
      start_date: string
      end_date?: string
      game?: string
      player_pool_settings?: any
    },
    userId: string,
  ) {
    console.log("[v0] Creating month-long tournament:", tournamentData)
    console.log("[v0] Using user ID:", userId)

    let actualUserId = userId

    // Check if user exists in database, create if needed
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .single()

    if (userCheckError && userCheckError.code === "PGRST116") {
      // User doesn't exist, try to find system user or create one
      console.log("[v0] User not found, looking for system user")

      const { data: systemUser } = await supabase.from("users").select("id, username").eq("username", "System").single()

      if (systemUser) {
        actualUserId = systemUser.id
        console.log("[v0] Using system user for anonymous tournament:", systemUser.username)
      } else {
        // Create system user for anonymous tournaments
        console.log("[v0] Creating system user for anonymous tournaments")
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: "00000000-0000-0000-0000-000000000000",
            username: "System",
            email: null,
            elo_rating: 1200,
            total_games: 0,
            wins: 0,
            losses: 0,
          })
          .select()
          .single()

        if (createError) {
          console.error("[v0] Failed to create system user:", createError)
          throw new Error(`Failed to create system user: ${createError.message}`)
        }
        actualUserId = newUser.id
        console.log("[v0] System user created successfully:", newUser.username)
      }
    } else if (userCheckError) {
      console.error("[v0] Database error checking user:", userCheckError)
      throw new Error(`Database error: ${userCheckError.message}`)
    } else {
      console.log("[v0] User verified in database:", existingUser.username)
      actualUserId = existingUser.id
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        name: tournamentData.name,
        description: tournamentData.description,
        tournament_type: "draft",
        game: tournamentData.game || "hockey",
        max_participants: tournamentData.max_participants,
        entry_fee: tournamentData.entry_fee,
        prize_pool: tournamentData.entry_fee * tournamentData.max_participants * 0.8,
        start_date: tournamentData.start_date,
        end_date:
          tournamentData.end_date ||
          new Date(
            new Date(tournamentData.start_date).getTime() + tournamentData.duration_days * 24 * 60 * 60 * 1000,
          ).toISOString(),
        created_by: actualUserId,
        status: "draft",
        team_based: false,
        player_pool_settings: tournamentData.player_pool_settings || {
          draft_type: "draft",
          duration_days: tournamentData.duration_days,
          phases_enabled: true,
        },
      })
      .select()
      .single()

    if (tournamentError) {
      console.error("[v0] Tournament creation error:", tournamentError)
      throw new Error(`Failed to create tournament: ${tournamentError.message}`)
    }

    console.log("[v0] Tournament created successfully:", tournament.name)

    const phases = await this.createTournamentPhases(
      tournament.id,
      tournamentData.start_date,
      tournamentData.duration_days,
    )

    return { ...tournament, phases }
  },

  async createTournamentPhases(tournamentId: string, startDate: string, durationDays: number) {
    if (!startDate || startDate === "Invalid Date" || isNaN(Date.parse(startDate))) {
      console.error("[v0] Invalid start date provided:", startDate)
      throw new Error("Invalid start date provided for tournament phases")
    }

    const start = new Date(startDate)

    if (isNaN(start.getTime())) {
      console.error("[v0] Failed to create valid Date object from:", startDate)
      throw new Error("Failed to create valid date from provided start date")
    }

    console.log("[v0] Creating tournament phases with start date:", start.toISOString())

    const phases: Omit<TournamentPhase, "id">[] = []

    if (durationDays >= 30) {
      // Month-long tournament phases
      phases.push(
        {
          name: "Registration Phase",
          description: "Player registration and team formation",
          start_date: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          phase_type: "registration",
          settings: { max_participants: 64 },
        },
        {
          name: "Draft Phase",
          description: "Snake/Linear draft or auction draft",
          start_date: new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: start.toISOString(),
          status: "upcoming",
          phase_type: "auction",
          settings: { draft_duration_hours: 2 },
        },
        {
          name: "Week 1: Group Stage",
          description: "Initial group matches and seeding",
          start_date: start.toISOString(),
          end_date: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          phase_type: "group_stage",
          settings: { matches_per_week: 3 },
        },
        {
          name: "Week 2-3: Round Robin",
          description: "Extended round robin matches",
          start_date: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(start.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          phase_type: "group_stage",
          settings: { matches_per_week: 2 },
        },
        {
          name: "Week 4: Championship",
          description: "Playoff bracket and finals",
          start_date: new Date(start.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          phase_type: "finals",
          settings: { bracket_size: 8 },
        },
      )
    } else if (durationDays >= 14) {
      // Bi-weekly tournament phases
      phases.push(
        {
          name: "Registration & Draft",
          description: "Registration and draft phase",
          start_date: new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: start.toISOString(),
          status: "active",
          phase_type: "registration",
          settings: {},
        },
        {
          name: "Week 1: Qualifiers",
          description: "Qualification matches",
          start_date: start.toISOString(),
          end_date: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          phase_type: "group_stage",
          settings: {},
        },
        {
          name: "Week 2: Finals",
          description: "Championship matches",
          start_date: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          phase_type: "finals",
          settings: {},
        },
      )
    }

    for (const [index, phase] of phases.entries()) {
      await supabase.from("tournament_settings").insert({
        tournament_id: tournamentId,
        setting_key: `phase_${index + 1}`,
        setting_value: JSON.stringify(phase),
      })
    }

    return phases
  },

  async getTournamentPhases(tournamentId: string): Promise<TournamentPhase[]> {
    const { data: settings, error } = await supabase
      .from("tournament_settings")
      .select("setting_key, setting_value")
      .eq("tournament_id", tournamentId)
      .like("setting_key", "phase_%")
      .order("setting_key")

    if (error) throw error

    return settings.map((setting, index) => ({
      id: `${tournamentId}_phase_${index + 1}`,
      ...JSON.parse(setting.setting_value),
    }))
  },

  async progressTournamentPhase(tournamentId: string, currentPhaseId: string) {
    console.log("[v0] Progressing tournament phase:", { tournamentId, currentPhaseId })

    const phases = await this.getTournamentPhases(tournamentId)
    const currentPhaseIndex = phases.findIndex((p) => p.id === currentPhaseId)

    if (currentPhaseIndex === -1) return

    phases[currentPhaseIndex].status = "completed"

    if (currentPhaseIndex + 1 < phases.length) {
      phases[currentPhaseIndex + 1].status = "active"
    }

    let tournamentStatus = "in_progress"
    if (currentPhaseIndex + 1 >= phases.length) {
      tournamentStatus = "completed"
    }

    // Update tournament status
    await supabase.from("tournaments").update({ status: tournamentStatus }).eq("id", tournamentId)

    // Update phase settings
    for (const [index, phase] of phases.entries()) {
      await supabase
        .from("tournament_settings")
        .update({
          setting_value: JSON.stringify({
            name: phase.name,
            description: phase.description,
            start_date: phase.start_date,
            end_date: phase.end_date,
            status: phase.status,
            phase_type: phase.phase_type,
            settings: phase.settings,
          }),
        })
        .eq("tournament_id", tournamentId)
        .eq("setting_key", `phase_${index + 1}`)
    }

    return phases
  },

  async scheduleMatches(tournamentId: string, phaseId: string, participants: string[]) {
    console.log("[v0] Scheduling matches for phase:", { tournamentId, phaseId })

    const { data: schedule, error } = await supabase
      .from("draft_schedules")
      .insert({
        tournament_id: tournamentId,
        draft_type: "snake_draft",
        status: "scheduled",
        scheduled_date: new Date().toISOString(),
        duration_minutes: 120,
        settings: {
          phase_id: phaseId,
          participants: participants,
          matches_per_week: 2,
        },
      })
      .select()
      .single()

    if (error) throw error
    return schedule
  },

  async getMonthLongTournaments(status?: string): Promise<MonthLongTournament[]> {
    console.log("[v0] Starting getMonthLongTournaments with status:", status)

    let query = supabase.from("tournaments").select(`
        *,
        participant_count:tournament_participants(count)
      `)

    if (status) {
      console.log("[v0] Filtering tournaments by status:", status)
      query = query.eq("status", status)
    }

    console.log("[v0] Executing tournament query...")
    const { data: tournaments, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching tournaments:", error)
      console.error("[v0] Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    console.log("[v0] Raw tournament data from database:", tournaments)
    console.log("[v0] Tournament count from database:", tournaments?.length || 0)

    if (!tournaments || tournaments.length === 0) {
      console.log("[v0] No tournaments found in database, returning empty array")
      return []
    }

    console.log("[v0] Processing tournaments with phases...")
    const enhancedTournaments = await Promise.all(
      tournaments.map(async (tournament, index) => {
        console.log(`[v0] Processing tournament ${index + 1}/${tournaments.length}:`, tournament.name)

        try {
          const phases = await this.getTournamentPhases(tournament.id)
          console.log(`[v0] Found ${phases.length} phases for tournament:`, tournament.name)

          const enhanced = {
            ...tournament,
            current_participants: tournament.participant_count[0]?.count || 0,
            phases,
            duration_days: Math.ceil(
              (new Date(tournament.end_date).getTime() - new Date(tournament.start_date).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          }

          console.log(`[v0] Enhanced tournament:`, {
            id: enhanced.id,
            name: enhanced.name,
            status: enhanced.status,
            participants: enhanced.current_participants,
            duration: enhanced.duration_days,
          })

          return enhanced
        } catch (phaseError) {
          console.error(`[v0] Error processing phases for tournament ${tournament.name}:`, phaseError)
          // Return tournament without phases if phase processing fails
          return {
            ...tournament,
            current_participants: tournament.participant_count[0]?.count || 0,
            phases: [],
            duration_days: Math.ceil(
              (new Date(tournament.end_date).getTime() - new Date(tournament.start_date).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          }
        }
      }),
    )

    console.log("[v0] Enhanced tournaments with phases:", enhancedTournaments)
    console.log("[v0] Final tournament count:", enhancedTournaments.length)
    return enhancedTournaments
  },

  async joinMonthLongTournament(tournamentId: string, userId: string) {
    console.log("[v0] User joining month-long tournament:", { tournamentId, userId })

    const { data: participant, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: userId,
        status: "registered",
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const { data: tournament } = await supabase.from("tournaments").select("entry_fee").eq("id", tournamentId).single()

    if (tournament?.entry_fee) {
      await supabase
        .from("users")
        .update({
          balance: supabase.raw("balance - ?", [tournament.entry_fee]),
        })
        .eq("id", userId)
    }

    return participant
  },

  async checkPhaseProgression() {
    console.log("[v0] Checking for phase progression...")

    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id, status")
      .in("status", ["draft", "pending", "in_progress"])

    if (!tournaments) return

    for (const tournament of tournaments) {
      const phases = await this.getTournamentPhases(tournament.id)
      const activePhase = phases.find((p) => p.status === "active")

      if (activePhase && new Date(activePhase.end_date) <= new Date()) {
        console.log("[v0] Auto-progressing tournament phase:", tournament.id)
        await this.progressTournamentPhase(tournament.id, activePhase.id)
      }
    }
  },
}
