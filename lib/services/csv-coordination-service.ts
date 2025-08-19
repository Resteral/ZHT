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
}

export class CSVCoordinationService {
  private supabase = createClient()

  async processAndCoordinateCSV(csvData: string, matchId?: string): Promise<CSVCoordinationResult> {
    const errors: string[] = []

    try {
      // Parse CSV data
      const rawStats = CSVHockeyParser.parseCSVData(csvData)
      console.log(`[v0] Parsed ${rawStats.length} hockey stats from CSV data`)

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

      // Update leaderboard statistics
      await this.updateLeaderboardStats(processedStats)

      // Update betting odds based on performance - removed due to missing table

      return {
        success: true,
        processedStats,
        errors,
        matchId,
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
      // Calculate team scores from CSV data
      const team1Goals = stats.filter((s) => s.team === 1).reduce((sum, s) => sum + s.goals, 0)
      const team2Goals = stats.filter((s) => s.team === 2).reduce((sum, s) => sum + s.goals, 0)

      const winningTeam = team1Goals > team2Goals ? 1 : team2Goals > team1Goals ? 2 : 0

      // Store or update match results with CSV data
      const { error } = await this.supabase.from("match_results").upsert({
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
      }
    } catch (error) {
      console.error("Error in storeCSVDataForMatch:", error)
    }
  }

  private async updateLeaderboardStats(stats: ProcessedHockeyStats[]) {
    try {
      for (const stat of stats.filter((s) => s.userFound && s.userId)) {
        console.log(`[v0] Processing stats for ${stat.actualUsername}, userId: ${stat.userId}`)

        const { data: userExists, error: userCheckError } = await this.supabase
          .from("users")
          .select("id, username")
          .eq("id", stat.userId)
          .single()

        if (userCheckError || !userExists) {
          console.warn(
            `[v0] User ${stat.actualUsername} (${stat.userId}) not found in users table:`,
            userCheckError?.message || "No user data returned",
          )
          continue
        }

        console.log(`[v0] User validation passed for ${userExists.username} (${userExists.id})`)

        const { error } = await this.supabase.from("player_performances").upsert({
          player_id: userExists.id, // Use the validated ID from the database
          game_date: new Date().toISOString(),
          season: new Date().getFullYear().toString(),
          game_week: Math.ceil(new Date().getDate() / 7),
          points_scored: stat.goals + stat.assists,
          stats: {
            goals: stat.goals,
            assists: stat.assists,
            saves: stat.saves,
            steals: stat.steals,
            passes: stat.passes,
            passReceived: stat.passReceived,
            savePercent: stat.savePercent,
            goaltenderMinutes: stat.goaltenderMinutes,
            skaterMinutes: stat.skaterMinutes,
            team: stat.team,
          },
          created_at: new Date().toISOString(),
        })

        if (error) {
          console.error(`Error updating leaderboard stats for ${stat.actualUsername}:`, error)
          console.error(`Attempted to use player_id: ${userExists.id}`)
        } else {
          console.log(`[v0] Successfully updated stats for ${stat.actualUsername}`)
        }
      }
    } catch (error) {
      console.error("Error updating leaderboard stats:", error)
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
}

export const csvCoordinationService = new CSVCoordinationService()
