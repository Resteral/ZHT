import { createClient } from "@/lib/supabase/client"
import { CSVHockeyParser, type HockeyStats } from "./csv-hockey-parser"
import { csvIdMappingService } from "./csv-id-mapping"

export interface ProcessedHockeyStats extends HockeyStats {
  actualUsername?: string
  actualEloRating?: number
  userFound: boolean
  userId?: string
}

export interface CSVCoordinationResult {
  success: boolean
  processedStats: ProcessedHockeyStats[]
  errors: string[]
  matchId?: string
  consensusValidation?: {
    isValid: boolean
    submissionCount: number
    requiredConsensus: number
    conflictingSubmissions: string[]
  }
}

export interface MatchContext {
  matchName?: string
  gameNumber?: number
  matchDate?: string
}

export class CSVCoordinationService {
  private supabase = createClient()

  async processAndCoordinateCSV(
    csvData: string,
    matchId?: string,
    matchContext?: MatchContext,
  ): Promise<CSVCoordinationResult> {
    const errors: string[] = []

    try {
      // Parse CSV data
      const rawStats = CSVHockeyParser.parseCSVData(csvData)
      console.log(`[v0] Parsed ${rawStats.length} hockey stats from CSV data`)

      const consensusValidation = await this.validateCSVConsensus(csvData, matchId)
      if (!consensusValidation.isValid) {
        errors.push(`CSV consensus validation failed: ${consensusValidation.conflictingSubmissions.join(", ")}`)
        console.warn(`[v0] CSV consensus validation failed for match ${matchId}`)
      }

      // Get user mappings for all players
      const csvIds = rawStats.map((stat) => stat.playerId)
      const userMap = await csvIdMappingService.getUsersBatchByCSVIds(csvIds)

      // Enhance stats with user data
      const processedStats: ProcessedHockeyStats[] = rawStats.map((stat) => {
        const user = userMap.get(stat.playerId)
        return {
          ...stat,
          actualUsername: user?.username,
          actualEloRating: user?.elo_rating,
          userFound: !!user,
          userId: user?.id,
        }
      })

      // Store in database for coordination across systems
      if (matchId) {
        await this.storeCSVDataForMatch(matchId, csvData, processedStats)
      }

      if (consensusValidation.isValid && consensusValidation.submissionCount >= consensusValidation.requiredConsensus) {
        console.log(`[v0] Consensus reached for match ${matchId || "unknown"} - finalizing game and updating profiles`)
        await this.finalizeGameAndUpdateProfiles(processedStats, matchId, matchContext)
        await this.syncWinLossAcrossSystems(processedStats)
      } else if (consensusValidation.isValid) {
        // Store preliminary stats but don't finalize ratings
        await this.storePreliminaryStats(processedStats, matchId, matchContext)
      }

      return {
        success: consensusValidation.isValid,
        processedStats,
        errors,
        matchId,
        consensusValidation,
      }
    } catch (error) {
      console.error("Error in CSV coordination:", error)
      errors.push(`CSV coordination failed: ${error}`)
      return {
        success: false,
        processedStats: [],
        errors,
      }
    }
  }

  private async storeCSVDataForMatch(matchId: string, csvData: string, stats: ProcessedHockeyStats[]) {
    try {
      const { data: existingResult } = await this.supabase
        .from("match_results")
        .select("match_id")
        .eq("match_id", matchId)
        .single()

      if (existingResult) {
        console.log(`[v0] Match result already exists for ${matchId}, skipping CSV storage`)
        return
      }

      // Calculate team scores from CSV data
      const team1Goals = stats.filter((s) => s.team === 1).reduce((sum, s) => sum + s.goals, 0)
      const team2Goals = stats.filter((s) => s.team === 2).reduce((sum, s) => sum + s.goals, 0)

      const winningTeam = team1Goals > team2Goals ? 1 : team2Goals > team1Goals ? 2 : 0

      const { error } = await this.supabase.from("match_results").insert({
        match_id: matchId,
        team1_score: team1Goals,
        team2_score: team2Goals,
        winning_team: winningTeam,
        csv_code: csvData,
        total_submissions: stats.length,
        consensus_threshold: Math.ceil(stats.length * 0.6),
        validated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error storing CSV match data:", error)
      } else {
        console.log(`[v0] Successfully stored CSV match data for ${matchId}`)
      }
    } catch (error) {
      console.error("Error in storeCSVDataForMatch:", error)
    }
  }

  private async finalizeGameAndUpdateProfiles(
    stats: ProcessedHockeyStats[],
    actualMatchId?: string,
    matchContext?: MatchContext,
  ) {
    try {
      console.log(
        `[v0] Finalizing game ${matchContext?.matchName || "Match"} #${matchContext?.gameNumber || 1} - updating all player profiles`,
      )

      let matchResult = null
      let validMatchId = actualMatchId

      if (!validMatchId) {
        const { data: existingMatch } = await this.supabase.from("matches").select("id").limit(1).single()
        if (existingMatch) {
          validMatchId = existingMatch.id
        }
      }

      if (validMatchId) {
        const { data } = await this.supabase
          .from("match_results")
          .select("team1_score, team2_score, winning_team")
          .eq("match_id", validMatchId)
          .single()
        matchResult = data
      }

      // Mark match as completed with consensus
      if (validMatchId) {
        await this.supabase
          .from("match_results")
          .update({
            consensus_reached: true,
            finalized_at: new Date().toISOString(),
          })
          .eq("match_id", validMatchId)
      }

      for (const stat of stats.filter((s) => s.userFound && s.userId)) {
        await this.updatePlayerProfileWithFinalRating(stat, matchResult, matchContext)
      }

      console.log(
        `[v0] Game finalized - all ${stats.filter((s) => s.userFound).length} player profiles updated with correct ratings`,
      )
    } catch (error) {
      console.error("Error finalizing game and updating profiles:", error)
    }
  }

  private async storePreliminaryStats(
    stats: ProcessedHockeyStats[],
    actualMatchId?: string,
    matchContext?: MatchContext,
  ) {
    try {
      console.log(
        `[v0] Storing preliminary stats for ${matchContext?.matchName || "Match"} #${matchContext?.gameNumber || 1} - awaiting consensus`,
      )

      for (const stat of stats.filter((s) => s.userFound && s.userId)) {
        // Store performance data but don't update ELO/wins/losses yet
        const performanceRecord = {
          player_id: stat.userId,
          game_date: new Date().toISOString(),
          season: "2025",
          game_week: 1,
          points_scored: stat.goals + stat.assists,
          stats: {
            goals: stat.goals,
            assists: stat.assists,
            saves: stat.saves,
            shots: stat.shots,
            steals_plus: stat.stealsPlus,
            pickups: stat.pickups,
            passes: stat.passes,
            pass_received: stat.passReceived,
            shots_on_goalie: stat.shotsOnGoalie,
            shots_saved: stat.shotsSaved,
            save_percent: stat.savePercent,
            goaltender_minutes: stat.goaltenderMinutes,
            skater_minutes: stat.skaterMinutes,
            team: stat.team,
            match_name: matchContext?.matchName || "Unknown Match",
            game_number: matchContext?.gameNumber || 1,
            match_date: matchContext?.matchDate || new Date().toISOString(),
            preliminary: true, // Mark as preliminary until consensus
          },
          created_at: new Date().toISOString(),
        }

        await this.supabase.from("player_performances").upsert(performanceRecord)
        console.log(`[v0] Stored preliminary stats for ${stat.actualUsername}`)
      }
    } catch (error) {
      console.error("Error storing preliminary stats:", error)
    }
  }

  private async updatePlayerProfileWithFinalRating(
    stat: ProcessedHockeyStats,
    matchResult: any,
    matchContext?: MatchContext,
  ) {
    try {
      const { data: userExists, error: userCheckError } = await this.supabase
        .from("users")
        .select("id, username, elo_rating, wins, losses, total_games")
        .eq("id", stat.userId)
        .single()

      if (userCheckError || !userExists) {
        console.warn(`[v0] Player ${stat.actualUsername} not found for final rating update`)
        return
      }

      let eloChange = 0
      let isWinner = false
      let newWins = userExists.wins || 0
      let newLosses = userExists.losses || 0
      const newTotalGames = (userExists.total_games || 0) + 1

      if (matchResult && matchResult.winning_team !== 0) {
        isWinner = stat.team === matchResult.winning_team
        const currentElo = userExists.elo_rating || 1200
        const kFactor = 32
        const expectedScore = 0.5
        const actualScore = isWinner ? 1 : 0
        eloChange = Math.round(kFactor * (actualScore - expectedScore))

        if (isWinner) {
          newWins += 1
        } else {
          newLosses += 1
        }
      }

      const newEloRating = Math.max(800, (userExists.elo_rating || 1200) + eloChange)

      // Final profile update with correct rating
      const { error: userUpdateError } = await this.supabase
        .from("users")
        .update({
          elo_rating: newEloRating,
          wins: newWins,
          losses: newLosses,
          total_games: newTotalGames,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userExists.id)

      if (userUpdateError) {
        console.error(`Error updating final profile for ${stat.actualUsername}:`, userUpdateError)
      } else {
        console.log(
          `[v0] FINAL PROFILE UPDATE - ${userExists.username}: ELO ${userExists.elo_rating || 1200} → ${newEloRating}, Record: ${newWins}W-${newLosses}L`,
        )
      }

      // Update performance record to mark as finalized
      await this.supabase
        .from("player_performances")
        .update({
          stats: {
            ...stat,
            preliminary: false,
            finalized: true,
            final_elo: newEloRating,
          },
        })
        .eq("player_id", stat.userId)
        .eq("game_date", new Date().toISOString().split("T")[0])
    } catch (error) {
      console.error("Error updating player profile with final rating:", error)
    }
  }

  private async updateLeaderboardStats(
    stats: ProcessedHockeyStats[],
    actualMatchId?: string,
    matchContext?: MatchContext,
  ) {
    // This method is now replaced by finalizeGameAndUpdateProfiles and storePreliminaryStats
    console.log(`[v0] Legacy updateLeaderboardStats called - redirecting to new consensus-based system`)
    return this.finalizeGameAndUpdateProfiles(stats, actualMatchId, matchContext)
  }

  private async syncWinLossAcrossSystems(stats: ProcessedHockeyStats[]) {
    try {
      for (const stat of stats.filter((s) => s.userFound && s.userId)) {
        const { data: userData } = await this.supabase
          .from("users")
          .select("id, wins, losses, elo_rating")
          .eq("id", stat.userId)
          .single()

        if (!userData) continue

        await this.supabase.from("leaderboards").upsert({
          user_id: userData.id,
          wins: userData.wins,
          losses: userData.losses,
          elo_rating: userData.elo_rating,
          updated_at: new Date().toISOString(),
        })

        await this.supabase.from("player_analytics").upsert({
          player_id: userData.id,
          total_wins: userData.wins,
          total_losses: userData.losses,
          current_elo: userData.elo_rating,
          win_rate: userData.wins / Math.max(1, userData.wins + userData.losses),
          updated_at: new Date().toISOString(),
        })

        await this.updateBettingOdds(userData.id, userData.elo_rating, userData.wins, userData.losses)
      }

      console.log(`[v0] Successfully synchronized win/loss ratios across all systems`)
    } catch (error) {
      console.error("Error syncing win/loss across systems:", error)
    }
  }

  private async updateBettingOdds(userId: string, eloRating: number, wins: number, losses: number) {
    try {
      const winRate = wins / Math.max(1, wins + losses)
      const performanceMultiplier = Math.max(0.5, Math.min(2.0, eloRating / 1200)) // Scale based on ELO

      await this.supabase
        .from("betting_markets")
        .update({
          odds: Math.round((2.0 / Math.max(0.1, winRate)) * 100) / 100, // Convert win rate to odds
          performance_multiplier: performanceMultiplier,
          updated_at: new Date().toISOString(),
        })
        .eq("player_id", userId)

      console.log(
        `[v0] Updated betting odds: Win rate ${(winRate * 100).toFixed(1)}%, Multiplier ${performanceMultiplier.toFixed(2)}`,
      )
    } catch (error) {
      console.error("Error updating betting odds:", error)
    }
  }

  async getCoordinatedCSVData(matchId: string): Promise<ProcessedHockeyStats[]> {
    try {
      const { data, error } = await this.supabase
        .from("match_results")
        .select("csv_code")
        .eq("match_id", matchId)
        .single()

      if (error || !data?.csv_code) {
        return []
      }

      const result = await this.processAndCoordinateCSV(data.csv_code, matchId)
      return result.processedStats
    } catch (error) {
      console.error("Error getting coordinated CSV data:", error)
      return []
    }
  }

  async getAllCSVStatsForLeaderboards(): Promise<Map<string, any>> {
    const statsMap = new Map()

    try {
      const { data: matches } = await this.supabase
        .from("match_results")
        .select("match_id, csv_code")
        .not("csv_code", "is", null)

      if (!matches) return statsMap

      for (const match of matches) {
        const result = await this.processAndCoordinateCSV(match.csv_code)

        result.processedStats.forEach((stat) => {
          if (stat.userFound && stat.userId) {
            const existing = statsMap.get(stat.userId) || {
              userId: stat.userId,
              username: stat.actualUsername,
              totalGoals: 0,
              totalAssists: 0,
              totalSaves: 0,
              totalGames: 0,
              totalMinutes: 0,
            }

            existing.totalGoals += stat.goals
            existing.totalAssists += stat.assists
            existing.totalSaves += stat.saves
            existing.totalGames += 1
            existing.totalMinutes += stat.goaltenderMinutes + stat.skaterMinutes

            statsMap.set(stat.userId, existing)
          }
        })
      }
    } catch (error) {
      console.error("Error getting all CSV stats:", error)
    }

    return statsMap
  }

  private async validateCSVConsensus(
    csvData: string,
    matchId?: string,
  ): Promise<{
    isValid: boolean
    submissionCount: number
    requiredConsensus: number
    conflictingSubmissions: string[]
  }> {
    if (!matchId) {
      return { isValid: true, submissionCount: 1, requiredConsensus: 1, conflictingSubmissions: [] }
    }

    try {
      // Check for existing CSV submissions for this match
      const { data: existingSubmissions } = await this.supabase
        .from("csv_submissions")
        .select("csv_data, submitter_id, created_at")
        .eq("match_id", matchId)

      const submissionCount = (existingSubmissions?.length || 0) + 1
      const requiredConsensus = Math.max(2, Math.ceil(submissionCount * 0.6)) // At least 60% consensus

      if (!existingSubmissions || existingSubmissions.length === 0) {
        // First submission - store it
        await this.supabase.from("csv_submissions").insert({
          match_id: matchId,
          csv_data: csvData,
          submitter_id: "system", // Could be actual user ID
          created_at: new Date().toISOString(),
        })
        return { isValid: true, submissionCount, requiredConsensus, conflictingSubmissions: [] }
      }

      // Compare with existing submissions
      const conflictingSubmissions: string[] = []
      const currentStats = CSVHockeyParser.parseCSVData(csvData)

      for (const submission of existingSubmissions) {
        const existingStats = CSVHockeyParser.parseCSVData(submission.csv_data)

        // Check for significant statistical differences that might indicate stat padding
        const conflicts = this.detectStatPaddingConflicts(currentStats, existingStats)
        if (conflicts.length > 0) {
          conflictingSubmissions.push(`Submission from ${submission.created_at}: ${conflicts.join(", ")}`)
        }
      }

      const isValid = conflictingSubmissions.length === 0 || submissionCount >= requiredConsensus

      return { isValid, submissionCount, requiredConsensus, conflictingSubmissions }
    } catch (error) {
      console.error("Error validating CSV consensus:", error)
      return { isValid: false, submissionCount: 0, requiredConsensus: 2, conflictingSubmissions: ["Validation error"] }
    }
  }

  private detectStatPaddingConflicts(currentStats: HockeyStats[], existingStats: HockeyStats[]): string[] {
    const conflicts: string[] = []

    // Check for unrealistic stat differences between submissions
    for (const currentStat of currentStats) {
      const existingStat = existingStats.find((s) => s.playerId === currentStat.playerId)
      if (existingStat) {
        // Flag suspicious differences (>50% variance in key stats)
        const goalsDiff = Math.abs(currentStat.goals - existingStat.goals)
        const assistsDiff = Math.abs(currentStat.assists - existingStat.assists)
        const savesDiff = Math.abs(currentStat.saves - existingStat.saves)

        if (goalsDiff > Math.max(1, existingStat.goals * 0.5)) {
          conflicts.push(
            `Goals mismatch for player ${currentStat.playerId}: ${currentStat.goals} vs ${existingStat.goals}`,
          )
        }
        if (assistsDiff > Math.max(1, existingStat.assists * 0.5)) {
          conflicts.push(
            `Assists mismatch for player ${currentStat.playerId}: ${currentStat.assists} vs ${existingStat.assists}`,
          )
        }
        if (savesDiff > Math.max(2, existingStat.saves * 0.3)) {
          conflicts.push(
            `Saves mismatch for player ${currentStat.playerId}: ${currentStat.saves} vs ${existingStat.saves}`,
          )
        }
      }
    }

    return conflicts
  }
}

export const csvCoordinationService = new CSVCoordinationService()
