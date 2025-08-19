import { analyticsService } from "./analytics-service"

export interface CSVPlayerData {
  username: string
  kills: number
  deaths: number
  assists: number
  damage_dealt: number
  damage_taken: number
  healing_done: number
  accuracy: number
  score: number
}

export interface CSVMatchData {
  duration_seconds?: number
  total_kills?: number
  total_damage?: number
  mvp_username?: string
}

export class CSVAnalyticsService {
  parseCSVData(csvData: string): {
    players: CSVPlayerData[]
    match: CSVMatchData
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const players: CSVPlayerData[] = []
    const match: CSVMatchData = {}

    try {
      const lines = csvData.trim().split("\n")

      if (lines.length < 2) {
        errors.push("CSV must have at least a header and one data row")
        return { players, match, isValid: false, errors }
      }

      const header = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim())

      // Expected columns
      const expectedColumns = [
        "username",
        "kills",
        "deaths",
        "assists",
        "damage_dealt",
        "damage_taken",
        "healing_done",
        "accuracy",
        "score",
      ]

      // Check if all required columns are present
      const missingColumns = expectedColumns.filter((col) => !header.includes(col))
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(", ")}`)
      }

      // Parse player data
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(",").map((v) => v.trim())

        if (values.length !== header.length) {
          errors.push(`Row ${i + 1}: Expected ${header.length} columns, got ${values.length}`)
          continue
        }

        try {
          const playerData: CSVPlayerData = {
            username: values[header.indexOf("username")] || "",
            kills: Number.parseInt(values[header.indexOf("kills")] || "0"),
            deaths: Number.parseInt(values[header.indexOf("deaths")] || "0"),
            assists: Number.parseInt(values[header.indexOf("assists")] || "0"),
            damage_dealt: Number.parseInt(values[header.indexOf("damage_dealt")] || "0"),
            damage_taken: Number.parseInt(values[header.indexOf("damage_taken")] || "0"),
            healing_done: Number.parseInt(values[header.indexOf("healing_done")] || "0"),
            accuracy: Number.parseFloat(values[header.indexOf("accuracy")] || "0"),
            score: Number.parseInt(values[header.indexOf("score")] || "0"),
          }

          // Validate player data
          if (!playerData.username) {
            errors.push(`Row ${i + 1}: Username is required`)
            continue
          }

          if (isNaN(playerData.kills) || isNaN(playerData.deaths) || isNaN(playerData.score)) {
            errors.push(`Row ${i + 1}: Invalid numeric values`)
            continue
          }

          players.push(playerData)
        } catch (error) {
          errors.push(`Row ${i + 1}: Error parsing data - ${error}`)
        }
      }

      // Calculate match-level statistics
      if (players.length > 0) {
        match.total_kills = players.reduce((sum, p) => sum + p.kills, 0)
        match.total_damage = players.reduce((sum, p) => sum + p.damage_dealt, 0)

        // Find MVP (highest score)
        const mvpPlayer = players.reduce((prev, current) => (current.score > prev.score ? current : prev))
        match.mvp_username = mvpPlayer.username
      }
    } catch (error) {
      errors.push(`General parsing error: ${error}`)
    }

    return {
      players,
      match,
      isValid: errors.length === 0 && players.length > 0,
      errors,
    }
  }

  async storeCSVAnalytics(
    matchId: string,
    csvData: string,
    userIdMap: Map<string, string>,
  ): Promise<{ success: boolean; errors: string[] }> {
    const parsed = this.parseCSVData(csvData)

    if (!parsed.isValid) {
      return { success: false, errors: parsed.errors }
    }

    const errors: string[] = []

    try {
      // Store player analytics
      for (const playerData of parsed.players) {
        const userId = userIdMap.get(playerData.username)

        if (!userId) {
          errors.push(`User not found: ${playerData.username}`)
          continue
        }

        const success = await analyticsService.storePlayerAnalytics({
          match_id: matchId,
          user_id: userId,
          kills: playerData.kills,
          deaths: playerData.deaths,
          assists: playerData.assists,
          damage_dealt: playerData.damage_dealt,
          damage_taken: playerData.damage_taken,
          healing_done: playerData.healing_done,
          accuracy: playerData.accuracy,
          score: playerData.score,
        })

        if (!success) {
          errors.push(`Failed to store analytics for ${playerData.username}`)
        }
      }

      // Store match analytics
      const mvpUserId = parsed.match.mvp_username ? userIdMap.get(parsed.match.mvp_username) : null

      const matchSuccess = await analyticsService.storeMatchAnalytics({
        match_id: matchId,
        duration_seconds: parsed.match.duration_seconds || null,
        total_kills: parsed.match.total_kills || 0,
        total_damage: parsed.match.total_damage || 0,
        mvp_user_id: mvpUserId || null,
        csv_data: csvData,
      })

      if (!matchSuccess) {
        errors.push("Failed to store match analytics")
      }
    } catch (error) {
      errors.push(`Storage error: ${error}`)
    }

    return {
      success: errors.length === 0,
      errors,
    }
  }

  generateSampleCSV(): string {
    return `username,kills,deaths,assists,damage_dealt,damage_taken,healing_done,accuracy,score
Player1,15,8,12,2500,1800,500,75.5,1200
Player2,12,10,15,2200,2000,800,68.2,1100
Player3,18,6,8,2800,1500,200,82.1,1400
Player4,10,12,18,1800,2200,1200,65.8,1000`
  }
}

// Export singleton instance
export const csvAnalyticsService = new CSVAnalyticsService()
