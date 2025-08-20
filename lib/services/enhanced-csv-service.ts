import { createClient } from "@/lib/supabase/client"
import { csvHockeyParser } from "./csv-hockey-parser"
import { csvIdMappingService } from "./csv-id-mapping"
import crypto from "crypto"

export class EnhancedCSVService {
  private supabase = createClient()

  async processCSVForMatch(
    matchId: string,
    csvData: string,
  ): Promise<{
    success: boolean
    processed: number
    errors: string[]
    alreadyProcessed?: boolean
  }> {
    try {
      // Generate hash for deduplication
      const csvHash = crypto.createHash("md5").update(csvData).digest("hex")

      // Parse CSV data
      const parsedStats = csvHockeyParser.parseCSV(csvData)
      console.log(`[v0] Parsed ${parsedStats.length} hockey stats from CSV`)

      // Map CSV player IDs to user IDs
      const csvPlayerIds = parsedStats.map((stat) => stat.playerId)
      const userMappings = await csvIdMappingService.getUsersBatchByCSVIds(csvPlayerIds)

      // Prepare stats data with user mappings
      const statsWithUsers = parsedStats
        .map((stat) => {
          const userMapping = userMappings.find((u) => u.csvId === stat.playerId)
          if (!userMapping?.userFound) return null

          return {
            userId: userMapping.userId,
            username: userMapping.username,
            stats: {
              goals: stat.goals,
              assists: stat.assists,
              saves: stat.saves,
              passes: stat.passes,
              team: stat.team,
              goalieMinutes: stat.goalieMinutes,
              skaterMinutes: stat.skaterMinutes,
            },
          }
        })
        .filter(Boolean)

      // Process using database function
      const { data: result, error } = await this.supabase.rpc("process_csv_stats_safely", {
        p_match_id: matchId,
        p_csv_hash: csvHash,
        p_stats_data: statsWithUsers,
      })

      if (error) {
        console.error("[v0] Error processing CSV stats:", error)
        return {
          success: false,
          processed: 0,
          errors: [error.message],
        }
      }

      return result || { success: true, processed: 0, errors: [] }
    } catch (error) {
      console.error("[v0] CSV processing error:", error)
      return {
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async getCSVProcessingHistory(matchId?: string) {
    let query = this.supabase
      .from("csv_processing_logs")
      .select(`
        *,
        matches(name, status)
      `)
      .order("processed_at", { ascending: false })

    if (matchId) {
      query = query.eq("match_id", matchId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching CSV history:", error)
      return []
    }

    return data || []
  }

  async validateCSVFormat(csvData: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic format validation
      if (!csvData.trim()) {
        errors.push("CSV data is empty")
        return { valid: false, errors, warnings }
      }

      // Parse and validate structure
      const parsedStats = csvHockeyParser.parseCSV(csvData)

      if (parsedStats.length === 0) {
        errors.push("No valid hockey stats found in CSV")
        return { valid: false, errors, warnings }
      }

      // Validate each stat record
      parsedStats.forEach((stat, index) => {
        if (!stat.playerId) {
          errors.push(`Row ${index + 1}: Missing player ID`)
        }

        if (stat.goals < 0 || stat.assists < 0 || stat.saves < 0) {
          warnings.push(`Row ${index + 1}: Negative stat values detected`)
        }

        if (stat.team !== 1 && stat.team !== 2) {
          warnings.push(`Row ${index + 1}: Invalid team assignment (${stat.team})`)
        }
      })

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      errors.push(`CSV parsing error: ${error instanceof Error ? error.message : "Unknown error"}`)
      return { valid: false, errors, warnings }
    }
  }
}

export const enhancedCSVService = new EnhancedCSVService()
