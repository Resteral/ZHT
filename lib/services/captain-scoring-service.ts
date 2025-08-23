import { createClient } from "@/lib/supabase/client"

export interface CaptainScore {
  captain_id: string
  captain_username: string
  tournament_id: string
  total_points: number
  match_points: number
  performance_points: number
  draft_bonus_points: number
  team_performance_points: number
  matches_played: number
  wins: number
  losses: number
  goals: number
  assists: number
  saves: number
  mvp_count: number
  perfect_draft_bonus: boolean
  current_rank: number
}

export interface MatchPerformance {
  match_id: string
  captain_id: string
  goals: number
  assists: number
  saves: number
  mvp: boolean
  team_won: boolean
  opponent_captain_id: string
}

export interface DraftPerformance {
  captain_id: string
  tournament_id: string
  picks_made: number
  successful_picks: number // Players who performed well
  draft_efficiency: number // Percentage of successful picks
  draft_bonus_earned: number
}

class CaptainScoringService {
  private supabase = createClient()

  // Scoring constants
  private readonly SCORING_RULES = {
    WIN_POINTS: 100,
    LOSS_POINTS: 25,
    GOAL_POINTS: 25,
    ASSIST_POINTS: 20,
    SAVE_POINTS: 5,
    MVP_BONUS: 50,
    PERFECT_DRAFT_BONUS: 25,
    TEAM_PERFORMANCE_MULTIPLIER: 1.2,
  }

  /**
   * Record captain performance for a match
   */
  async recordMatchPerformance(performance: MatchPerformance): Promise<{
    success: boolean
    points_earned: number
    message: string
  }> {
    try {
      console.log("[v0] Recording captain performance for match:", performance.match_id)

      // Calculate performance points
      const performancePoints = this.calculatePerformancePoints(performance)
      const matchPoints = performance.team_won ? this.SCORING_RULES.WIN_POINTS : this.SCORING_RULES.LOSS_POINTS
      const totalPoints = performancePoints + matchPoints

      // Insert or update captain match performance
      const { error: performanceError } = await this.supabase.from("captain_match_performance").upsert({
        match_id: performance.match_id,
        captain_id: performance.captain_id,
        goals: performance.goals,
        assists: performance.assists,
        saves: performance.saves,
        mvp: performance.mvp,
        team_won: performance.team_won,
        performance_score: performancePoints,
        match_points: matchPoints,
        total_points: totalPoints,
        created_at: new Date().toISOString(),
      })

      if (performanceError) {
        console.error("[v0] Error recording performance:", performanceError)
        throw performanceError
      }

      // Update captain's total tournament score
      await this.updateCaptainTotalScore(performance.captain_id)

      console.log("[v0] Captain performance recorded, points earned:", totalPoints)

      return {
        success: true,
        points_earned: totalPoints,
        message: `Performance recorded: ${totalPoints} points earned`,
      }
    } catch (error) {
      console.error("[v0] Error recording match performance:", error)
      return {
        success: false,
        points_earned: 0,
        message: `Failed to record performance: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Calculate performance points from stats
   */
  private calculatePerformancePoints(performance: MatchPerformance): number {
    let points = 0

    // Individual performance points
    points += performance.goals * this.SCORING_RULES.GOAL_POINTS
    points += performance.assists * this.SCORING_RULES.ASSIST_POINTS
    points += Math.abs(performance.saves) * this.SCORING_RULES.SAVE_POINTS

    // MVP bonus
    if (performance.mvp) {
      points += this.SCORING_RULES.MVP_BONUS
    }

    return points
  }

  /**
   * Update captain's total tournament score
   */
  async updateCaptainTotalScore(captainId: string): Promise<void> {
    try {
      // Get all match performances for this captain
      const { data: performances, error } = await this.supabase
        .from("captain_match_performance")
        .select("*")
        .eq("captain_id", captainId)

      if (error) {
        console.error("[v0] Error fetching captain performances:", error)
        throw error
      }

      if (!performances || performances.length === 0) return

      // Calculate totals
      const totals = performances.reduce(
        (acc, perf) => ({
          total_points: acc.total_points + (perf.total_points || 0),
          match_points: acc.match_points + (perf.match_points || 0),
          performance_points: acc.performance_points + (perf.performance_score || 0),
          matches_played: acc.matches_played + 1,
          wins: acc.wins + (perf.team_won ? 1 : 0),
          losses: acc.losses + (perf.team_won ? 0 : 1),
          goals: acc.goals + (perf.goals || 0),
          assists: acc.assists + (perf.assists || 0),
          saves: acc.saves + (perf.saves || 0),
          mvp_count: acc.mvp_count + (perf.mvp ? 1 : 0),
        }),
        {
          total_points: 0,
          match_points: 0,
          performance_points: 0,
          matches_played: 0,
          wins: 0,
          losses: 0,
          goals: 0,
          assists: 0,
          saves: 0,
          mvp_count: 0,
        },
      )

      // Check for draft bonus
      const draftBonus = await this.calculateDraftBonus(captainId)

      // Update or insert captain tournament score
      const { error: updateError } = await this.supabase.from("captain_tournament_scores").upsert({
        captain_id: captainId,
        tournament_id: performances[0].tournament_id, // Assuming all performances are from same tournament
        total_points: totals.total_points + draftBonus,
        match_points: totals.match_points,
        performance_points: totals.performance_points,
        draft_bonus_points: draftBonus,
        matches_played: totals.matches_played,
        wins: totals.wins,
        losses: totals.losses,
        goals: totals.goals,
        assists: totals.assists,
        saves: totals.saves,
        mvp_count: totals.mvp_count,
        updated_at: new Date().toISOString(),
      })

      if (updateError) {
        console.error("[v0] Error updating captain total score:", updateError)
        throw updateError
      }

      console.log("[v0] Updated captain total score:", totals.total_points + draftBonus)
    } catch (error) {
      console.error("[v0] Error updating captain total score:", error)
    }
  }

  /**
   * Calculate draft bonus points
   */
  async calculateDraftBonus(captainId: string): Promise<number> {
    try {
      // Get captain's drafted players and their performance
      const { data: draftData, error } = await this.supabase
        .from("tournament_team_members")
        .select(`
          user_id,
          position,
          users(username, elo_rating),
          team:tournament_teams!inner(captain_id, tournament_id)
        `)
        .eq("team.captain_id", captainId)

      if (error || !draftData) {
        console.error("[v0] Error fetching draft data:", error)
        return 0
      }

      // Calculate draft efficiency (simplified - could be more complex)
      const totalPicks = draftData.length
      if (totalPicks === 0) return 0

      // For now, assume all picks are "successful" if team is performing well
      // In a real system, you'd analyze individual player performance
      const successfulPicks = Math.floor(totalPicks * 0.8) // 80% success rate assumption

      const draftEfficiency = successfulPicks / totalPicks

      // Award perfect draft bonus if efficiency is high
      let bonus = 0
      if (draftEfficiency >= 0.9) {
        bonus = this.SCORING_RULES.PERFECT_DRAFT_BONUS
      }

      return bonus
    } catch (error) {
      console.error("[v0] Error calculating draft bonus:", error)
      return 0
    }
  }

  /**
   * Get captain leaderboard for tournament
   */
  async getCaptainLeaderboard(tournamentId: string): Promise<CaptainScore[]> {
    try {
      const { data: scores, error } = await this.supabase
        .from("captain_tournament_scores")
        .select(`
          *,
          captain:users!captain_id(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("total_points", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching captain leaderboard:", error)
        throw error
      }

      return (scores || []).map((score: any, index: number) => ({
        captain_id: score.captain_id,
        captain_username: score.captain?.username || "Unknown",
        tournament_id: score.tournament_id,
        total_points: score.total_points || 0,
        match_points: score.match_points || 0,
        performance_points: score.performance_points || 0,
        draft_bonus_points: score.draft_bonus_points || 0,
        team_performance_points: score.team_performance_points || 0,
        matches_played: score.matches_played || 0,
        wins: score.wins || 0,
        losses: score.losses || 0,
        goals: score.goals || 0,
        assists: score.assists || 0,
        saves: score.saves || 0,
        mvp_count: score.mvp_count || 0,
        perfect_draft_bonus: score.draft_bonus_points >= this.SCORING_RULES.PERFECT_DRAFT_BONUS,
        current_rank: index + 1,
      }))
    } catch (error) {
      console.error("[v0] Error getting captain leaderboard:", error)
      return []
    }
  }

  /**
   * Get captain's detailed performance
   */
  async getCaptainPerformance(
    captainId: string,
    tournamentId: string,
  ): Promise<{
    summary: CaptainScore | null
    matchHistory: any[]
    draftAnalysis: DraftPerformance | null
  }> {
    try {
      // Get captain summary
      const leaderboard = await this.getCaptainLeaderboard(tournamentId)
      const summary = leaderboard.find((score) => score.captain_id === captainId) || null

      // Get match history
      const { data: matchHistory, error: matchError } = await this.supabase
        .from("captain_match_performance")
        .select(`
          *,
          match:tournament_matches!inner(
            id,
            team1_id,
            team2_id,
            team1_score,
            team2_score,
            status,
            completed_at
          )
        `)
        .eq("captain_id", captainId)
        .order("created_at", { ascending: false })

      if (matchError) {
        console.error("[v0] Error fetching match history:", matchError)
      }

      // Get draft analysis
      const draftAnalysis = await this.getDraftAnalysis(captainId, tournamentId)

      return {
        summary,
        matchHistory: matchHistory || [],
        draftAnalysis,
      }
    } catch (error) {
      console.error("[v0] Error getting captain performance:", error)
      return {
        summary: null,
        matchHistory: [],
        draftAnalysis: null,
      }
    }
  }

  /**
   * Get draft analysis for captain
   */
  async getDraftAnalysis(captainId: string, tournamentId: string): Promise<DraftPerformance | null> {
    try {
      const { data: draftData, error } = await this.supabase
        .from("tournament_team_members")
        .select(`
          user_id,
          position,
          users(username, elo_rating),
          team:tournament_teams!inner(captain_id, tournament_id)
        `)
        .eq("team.captain_id", captainId)
        .eq("team.tournament_id", tournamentId)

      if (error || !draftData) {
        console.error("[v0] Error fetching draft analysis:", error)
        return null
      }

      const picksMade = draftData.length
      const successfulPicks = Math.floor(picksMade * 0.8) // Simplified calculation
      const draftEfficiency = picksMade > 0 ? (successfulPicks / picksMade) * 100 : 0
      const draftBonusEarned = draftEfficiency >= 90 ? this.SCORING_RULES.PERFECT_DRAFT_BONUS : 0

      return {
        captain_id: captainId,
        tournament_id: tournamentId,
        picks_made: picksMade,
        successful_picks: successfulPicks,
        draft_efficiency: draftEfficiency,
        draft_bonus_earned: draftBonusEarned,
      }
    } catch (error) {
      console.error("[v0] Error getting draft analysis:", error)
      return null
    }
  }

  /**
   * Award end-of-tournament bonuses
   */
  async awardTournamentBonuses(tournamentId: string): Promise<{
    success: boolean
    bonuses_awarded: number
    message: string
  }> {
    try {
      console.log("[v0] Awarding tournament bonuses for:", tournamentId)

      const leaderboard = await this.getCaptainLeaderboard(tournamentId)

      if (leaderboard.length === 0) {
        return {
          success: false,
          bonuses_awarded: 0,
          message: "No captains found for tournament",
        }
      }

      let bonusesAwarded = 0

      // Award placement bonuses
      const placementBonuses = [
        { rank: 1, bonus: 500 }, // 1st place
        { rank: 2, bonus: 300 }, // 2nd place
        { rank: 3, bonus: 200 }, // 3rd place
      ]

      for (const placement of placementBonuses) {
        if (leaderboard.length >= placement.rank) {
          const captain = leaderboard[placement.rank - 1]

          const { error } = await this.supabase.from("captain_tournament_bonuses").insert({
            captain_id: captain.captain_id,
            tournament_id: tournamentId,
            bonus_type: `placement_${placement.rank}`,
            bonus_points: placement.bonus,
            description: `${placement.rank === 1 ? "1st" : placement.rank === 2 ? "2nd" : "3rd"} Place Finish`,
            awarded_at: new Date().toISOString(),
          })

          if (error) {
            console.error("[v0] Error awarding placement bonus:", error)
          } else {
            bonusesAwarded++
          }
        }
      }

      // Award MVP bonuses for most MVPs
      const mvpLeader = leaderboard.reduce((prev, current) => (prev.mvp_count > current.mvp_count ? prev : current))

      if (mvpLeader.mvp_count > 0) {
        const { error } = await this.supabase.from("captain_tournament_bonuses").insert({
          captain_id: mvpLeader.captain_id,
          tournament_id: tournamentId,
          bonus_type: "mvp_leader",
          bonus_points: 100,
          description: `Most MVP Awards (${mvpLeader.mvp_count})`,
          awarded_at: new Date().toISOString(),
        })

        if (!error) bonusesAwarded++
      }

      console.log("[v0] Awarded", bonusesAwarded, "tournament bonuses")

      return {
        success: true,
        bonuses_awarded: bonusesAwarded,
        message: `Awarded ${bonusesAwarded} tournament bonuses`,
      }
    } catch (error) {
      console.error("[v0] Error awarding tournament bonuses:", error)
      return {
        success: false,
        bonuses_awarded: 0,
        message: `Failed to award bonuses: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Get tournament scoring statistics
   */
  async getTournamentScoringStats(tournamentId: string): Promise<{
    total_captains: number
    total_matches: number
    total_points_awarded: number
    average_points_per_captain: number
    highest_single_match_score: number
    most_mvps: number
    perfect_drafts: number
  }> {
    try {
      const leaderboard = await this.getCaptainLeaderboard(tournamentId)

      if (leaderboard.length === 0) {
        return {
          total_captains: 0,
          total_matches: 0,
          total_points_awarded: 0,
          average_points_per_captain: 0,
          highest_single_match_score: 0,
          most_mvps: 0,
          perfect_drafts: 0,
        }
      }

      const totalPointsAwarded = leaderboard.reduce((sum, captain) => sum + captain.total_points, 0)
      const totalMatches = leaderboard.reduce((sum, captain) => sum + captain.matches_played, 0)
      const perfectDrafts = leaderboard.filter((captain) => captain.perfect_draft_bonus).length
      const mostMvps = Math.max(...leaderboard.map((captain) => captain.mvp_count))

      // Get highest single match score
      const { data: highestMatch } = await this.supabase
        .from("captain_match_performance")
        .select("total_points")
        .order("total_points", { ascending: false })
        .limit(1)
        .single()

      return {
        total_captains: leaderboard.length,
        total_matches: totalMatches,
        total_points_awarded: totalPointsAwarded,
        average_points_per_captain: Math.round(totalPointsAwarded / leaderboard.length),
        highest_single_match_score: highestMatch?.total_points || 0,
        most_mvps: mostMvps,
        perfect_drafts: perfectDrafts,
      }
    } catch (error) {
      console.error("[v0] Error getting tournament scoring stats:", error)
      return {
        total_captains: 0,
        total_matches: 0,
        total_points_awarded: 0,
        average_points_per_captain: 0,
        highest_single_match_score: 0,
        most_mvps: 0,
        perfect_drafts: 0,
      }
    }
  }
}

export const captainScoringService = new CaptainScoringService()
