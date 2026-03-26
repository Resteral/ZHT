import { createClient } from "@/lib/supabase/client"

export interface BracketMatch {
  id: string
  tournament_id: string
  round_number: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  team1_captain: string | null
  team2_captain: string | null
  team1_score: number
  team2_score: number
  winner_team_id: string | null
  status: "waiting" | "ready" | "live" | "completed"
  bracket_position: string
  scheduled_time?: string
  started_at?: string
  completed_at?: string
  spectator_count: number
}

export interface TournamentTeam {
  id: string
  tournament_id: string
  team_name: string
  captain_id: string
  captain_username: string
  captain_elo: number
  members: {
    user_id: string
    username: string
    elo_rating: number
    position: number
  }[]
  total_team_elo: number
  created_at: string
}

export interface LiveMatchUpdate {
  match_id: string
  team1_score: number
  team2_score: number
  status: "live" | "completed"
  winner_team_id?: string
  captain_performance?: {
    captain_id: string
    goals: number
    assists: number
    saves: number
    mvp: boolean
  }[]
}

class LiveBracketIntegrationService {
  private supabase = createClient()

  /**
   * Generate tournament bracket from drafted teams
   */
  async generateTournamentBracket(tournamentId: string): Promise<{
    success: boolean
    bracket: BracketMatch[]
    message: string
  }> {
    try {
      console.log("[v0] Generating tournament bracket for:", tournamentId)

      // Get all teams for the tournament
      const teams = await this.getTournamentTeams(tournamentId)

      if (teams.length < 2) {
        return {
          success: false,
          bracket: [],
          message: "Need at least 2 teams to generate bracket",
        }
      }

      // Create single elimination bracket
      const bracket = await this.createSingleEliminationBracket(tournamentId, teams)

      // Save bracket to database
      const { error: bracketError } = await this.supabase.from("tournament_matches").insert(
        bracket.map((match) => ({
          id: match.id,
          tournament_id: match.tournament_id,
          match_number: match.match_number,
          team1_captain_id: match.team1_captain, // Use correct column name
          team2_captain_id: match.team2_captain, // Use correct column name
          team1_score: match.team1_score,
          team2_score: match.team2_score,
          winner_captain_id: match.winner_team_id, // Use correct column name
          status: match.status,
          created_at: new Date().toISOString(),
        })),
      )

      if (bracketError) {
        console.error("[v0] Error saving bracket:", bracketError)
        throw bracketError
      }

      console.log("[v0] Successfully generated bracket with", bracket.length, "matches")

      return {
        success: true,
        bracket,
        message: `Generated bracket with ${bracket.length} matches`,
      }
    } catch (error) {
      console.error("[v0] Error generating tournament bracket:", error)
      return {
        success: false,
        bracket: [],
        message: `Failed to generate bracket: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Get all teams formed from the draft
   */
  async getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
    try {
      const { data: teamsData, error } = await this.supabase
        .from("tournament_teams")
        .select(`
          *,
          captain:users!team_captain(username, elo_rating),
          tournament_team_members(
            user_id,
            position,
            users(username, elo_rating)
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching tournament teams:", error)
        throw error
      }

      return (teamsData || []).map((team: any) => ({
        id: team.id,
        tournament_id: team.tournament_id,
        team_name: team.team_name,
        captain_id: team.team_captain, // Use team_captain column
        captain_username: team.captain?.username || "Unknown",
        captain_elo: team.captain?.elo_rating || 1200,
        members: (team.tournament_team_members || []).map((member: any) => ({
          user_id: member.user_id,
          username: member.users?.username || "Unknown",
          elo_rating: member.users?.elo_rating || 1200,
          position: member.position,
        })),
        total_team_elo: team.total_team_elo || 0,
        created_at: team.created_at,
      }))
    } catch (error) {
      console.error("[v0] Error getting tournament teams:", error)
      return []
    }
  }

  /**
   * Create single elimination bracket structure
   */
  private async createSingleEliminationBracket(tournamentId: string, teams: TournamentTeam[]): Promise<BracketMatch[]> {
    const bracket: BracketMatch[] = []
    const teamCount = teams.length

    // Calculate number of rounds needed
    const totalRounds = Math.ceil(Math.log2(teamCount))

    // Seed teams by total ELO rating
    const seededTeams = [...teams].sort((a, b) => b.total_team_elo - a.total_team_elo)

    let matchId = 1
    let currentRound = 1
    let currentMatches = []

    // First round - pair up all teams
    for (let i = 0; i < seededTeams.length; i += 2) {
      const team1 = seededTeams[i]
      const team2 = seededTeams[i + 1] || null

      const match: BracketMatch = {
        id: `${tournamentId}-match-${matchId}`,
        tournament_id: tournamentId,
        round_number: currentRound,
        match_number: matchId,
        team1_id: team1.id,
        team2_id: team2?.id || null,
        team1_captain: team1.captain_id,
        team2_captain: team2?.captain_id || null,
        team1_score: 0,
        team2_score: 0,
        winner_team_id: team2 ? null : team1.id, // Bye if no opponent
        status: team2 ? "ready" : "completed",
        bracket_position: `R${currentRound}M${matchId}`,
        scheduled_time: new Date(Date.now() + matchId * 60 * 60 * 1000).toISOString(), // Stagger matches by 1 hour
        spectator_count: 0,
      }

      bracket.push(match)
      currentMatches.push(match)
      matchId++
    }

    // Generate subsequent rounds
    while (currentMatches.length > 1) {
      currentRound++
      const nextRoundMatches = []

      for (let i = 0; i < currentMatches.length; i += 2) {
        const match: BracketMatch = {
          id: `${tournamentId}-match-${matchId}`,
          tournament_id: tournamentId,
          round_number: currentRound,
          match_number: matchId,
          team1_id: null, // Will be filled by winners
          team2_id: null,
          team1_captain: null,
          team2_captain: null,
          team1_score: 0,
          team2_score: 0,
          winner_team_id: null,
          status: "waiting",
          bracket_position: `R${currentRound}M${matchId}`,
          scheduled_time: new Date(Date.now() + currentRound * 24 * 60 * 60 * 1000).toISOString(), // Next day for each round
          spectator_count: 0,
        }

        bracket.push(match)
        nextRoundMatches.push(match)
        matchId++
      }

      currentMatches = nextRoundMatches
    }

    return bracket
  }

  /**
   * Start a live match
   */
  async startLiveMatch(matchId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      console.log("[v0] Starting live match:", matchId)

      const { error } = await this.supabase
        .from("tournament_matches")
        .update({
          status: "live",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId)

      if (error) {
        console.error("[v0] Error starting match:", error)
        throw error
      }

      // Notify spectators
      await this.notifyMatchStart(matchId)

      return {
        success: true,
        message: "Match started successfully",
      }
    } catch (error) {
      console.error("[v0] Error starting live match:", error)
      return {
        success: false,
        message: `Failed to start match: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Update live match score and status
   */
  async updateLiveMatch(update: LiveMatchUpdate): Promise<{
    success: boolean
    message: string
  }> {
    try {
      console.log("[v0] Updating live match:", update.match_id)

      const updateData: any = {
        team1_score: update.team1_score,
        team2_score: update.team2_score,
        status: update.status,
        updated_at: new Date().toISOString(),
      }

      if (update.status === "completed") {
        updateData.completed_at = new Date().toISOString()
        updateData.winner_team_id = update.winner_team_id
      }

      const { error } = await this.supabase.from("tournament_matches").update(updateData).eq("id", update.match_id)

      if (error) {
        console.error("[v0] Error updating match:", error)
        throw error
      }

      // Update captain performance if provided
      if (update.captain_performance) {
        await this.updateCaptainPerformance(update.match_id, update.captain_performance)
      }

      // Progress bracket if match completed
      if (update.status === "completed" && update.winner_team_id) {
        await this.progressBracket(update.match_id, update.winner_team_id)
      }

      return {
        success: true,
        message: "Match updated successfully",
      }
    } catch (error) {
      console.error("[v0] Error updating live match:", error)
      return {
        success: false,
        message: `Failed to update match: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Get live bracket status
   */
  async getLiveBracket(tournamentId: string): Promise<BracketMatch[]> {
    try {
      const { data: matches, error } = await this.supabase
        .from("tournament_matches")
        .select(`
          *,
          team1:tournament_teams!team1_id(team_name, captain_id),
          team2:tournament_teams!team2_id(team_name, captain_id)
        `)
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching live bracket:", error)
        throw error
      }

      return (matches || []).map((match: any) => ({
        id: match.id,
        tournament_id: match.tournament_id,
        round_number: match.round_number,
        match_number: match.match_number,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        team1_captain: match.team1?.captain_id,
        team2_captain: match.team2?.captain_id,
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        winner_team_id: match.winner_team_id,
        status: match.status,
        bracket_position: match.bracket_position,
        scheduled_time: match.scheduled_time,
        started_at: match.started_at,
        completed_at: match.completed_at,
        spectator_count: match.spectator_count || 0,
      }))
    } catch (error) {
      console.error("[v0] Error getting live bracket:", error)
      return []
    }
  }

  /**
   * Join as spectator
   */
  async joinAsSpectator(
    matchId: string,
    userId: string,
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Increment spectator count
      const { error: updateError } = await this.supabase
        .from("tournament_matches")
        .update({
          spectator_count: this.supabase.sql`spectator_count + 1`,
        })
        .eq("id", matchId)

      if (updateError) {
        console.error("[v0] Error joining as spectator:", updateError)
        throw updateError
      }

      // Track spectator in separate table
      const { error: spectatorError } = await this.supabase.from("match_spectators").insert({
        match_id: matchId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      })

      if (spectatorError && !spectatorError.message.includes("duplicate")) {
        console.error("[v0] Error tracking spectator:", spectatorError)
      }

      return {
        success: true,
        message: "Joined as spectator successfully",
      }
    } catch (error) {
      console.error("[v0] Error joining as spectator:", error)
      return {
        success: false,
        message: `Failed to join as spectator: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Progress bracket after match completion
   */
  private async progressBracket(completedMatchId: string, winnerTeamId: string): Promise<void> {
    try {
      // Find the next match that this winner should advance to
      const { data: completedMatch } = await this.supabase
        .from("tournament_matches")
        .select("tournament_id, round_number, match_number")
        .eq("id", completedMatchId)
        .single()

      if (!completedMatch) return

      // Find next round match
      const nextMatchNumber = Math.ceil(completedMatch.match_number / 2)
      const { data: nextMatch } = await this.supabase
        .from("tournament_matches")
        .select("id, team1_id, team2_id")
        .eq("tournament_id", completedMatch.tournament_id)
        .eq("round_number", completedMatch.round_number + 1)
        .eq("match_number", nextMatchNumber)
        .single()

      if (!nextMatch) return

      // Determine which slot to fill
      const isFirstSlot = completedMatch.match_number % 2 === 1
      const updateField = isFirstSlot ? "team1_id" : "team2_id"

      // Update next match with winner
      await this.supabase
        .from("tournament_matches")
        .update({
          [updateField]: winnerTeamId,
          status: nextMatch.team1_id && nextMatch.team2_id ? "ready" : "waiting",
        })
        .eq("id", nextMatch.id)

      console.log("[v0] Advanced winner to next round")
    } catch (error) {
      console.error("[v0] Error progressing bracket:", error)
    }
  }

  /**
   * Update captain performance data
   */
  private async updateCaptainPerformance(matchId: string, performances: any[]): Promise<void> {
    try {
      for (const performance of performances) {
        const { error } = await this.supabase.from("captain_match_performance").insert({
          match_id: matchId,
          captain_id: performance.captain_id,
          goals: performance.goals,
          assists: performance.assists,
          saves: performance.saves,
          mvp: performance.mvp,
          created_at: new Date().toISOString(),
        })

        if (error && !error.message.includes("duplicate")) {
          console.error("[v0] Error updating captain performance:", error)
        }
      }
    } catch (error) {
      console.error("[v0] Error in captain performance update:", error)
    }
  }

  /**
   * Notify spectators of match start
   */
  private async notifyMatchStart(matchId: string): Promise<void> {
    try {
      // This would integrate with a notification system
      console.log("[v0] Match started notification sent for:", matchId)
    } catch (error) {
      console.error("[v0] Error sending match start notification:", error)
    }
  }

  /**
   * Get tournament bracket statistics
   */
  async getBracketStats(tournamentId: string): Promise<{
    totalMatches: number
    completedMatches: number
    liveMatches: number
    upcomingMatches: number
    totalSpectators: number
  }> {
    try {
      const { data: matches } = await this.supabase
        .from("tournament_matches")
        .select("status, spectator_count")
        .eq("tournament_id", tournamentId)

      if (!matches) {
        return {
          totalMatches: 0,
          completedMatches: 0,
          liveMatches: 0,
          upcomingMatches: 0,
          totalSpectators: 0,
        }
      }

      const stats = matches.reduce(
        (acc, match) => {
          acc.totalMatches++
          acc.totalSpectators += match.spectator_count || 0

          switch (match.status) {
            case "completed":
              acc.completedMatches++
              break
            case "live":
              acc.liveMatches++
              break
            default:
              acc.upcomingMatches++
          }

          return acc
        },
        {
          totalMatches: 0,
          completedMatches: 0,
          liveMatches: 0,
          upcomingMatches: 0,
          totalSpectators: 0,
        },
      )

      return stats
    } catch (error) {
      console.error("[v0] Error getting bracket stats:", error)
      return {
        totalMatches: 0,
        completedMatches: 0,
        liveMatches: 0,
        upcomingMatches: 0,
        totalSpectators: 0,
      }
    }
  }
}

export const liveBracketIntegrationService = new LiveBracketIntegrationService()
