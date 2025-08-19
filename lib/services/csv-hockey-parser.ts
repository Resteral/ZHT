export interface HockeyStats {
  team: number
  matchId: string
  playerId: string
  stealsPlus: number
  goals: number
  assists: number
  shots: number
  pickups: number
  passes: number
  passReceived: number
  savePercent: number
  saves: number
  allowed: number
  goaltenderMinutes: number
  skaterMinutes: number
  // Mapped user data
  username?: string
  eloRating?: number
}

export class CSVHockeyParser {
  static parseCSVData(csvText: string): HockeyStats[] {
    const lines = csvText
      .trim()
      .replace(/\\n/g, "\n") // Convert literal \n to actual newlines
      .split(/\r?\n/) // Split on actual newlines (handles both \n and \r\n)
      .filter((line) => line.trim().length > 0) // Remove empty lines

    const stats: HockeyStats[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      const values = line.split(",").map((v) => v.trim().replace(/^,+|,+$/g, "")) // Remove leading/trailing commas
      if (values.length < 14) {
        console.log(`[v0] Skipping invalid CSV line (${values.length} fields): ${line}`)
        continue
      }

      const fullIdentifier = values[1] || ""
      const playerIdMatch = fullIdentifier.match(/-(\d+)$/) // Extract the last numeric part after the final dash
      const extractedPlayerId = playerIdMatch ? playerIdMatch[1] : fullIdentifier

      const stat: HockeyStats = {
        team: Number.parseInt(values[0]) || 0,
        matchId: fullIdentifier,
        playerId: extractedPlayerId, // Use extracted player ID instead of values[2]
        stealsPlus: Number.parseInt(values[2]) || 0,
        goals: Number.parseInt(values[3]) || 0,
        assists: Number.parseInt(values[4]) || 0,
        shots: Number.parseInt(values[5]) || 0,
        pickups: Number.parseInt(values[6]) || 0,
        passes: Number.parseInt(values[7]) || 0,
        passReceived: Number.parseInt(values[8]) || 0,
        savePercent: Number.parseFloat(values[9]) || 0,
        saves: Number.parseInt(values[10]) || 0,
        allowed: Number.parseInt(values[11]) || 0,
        goaltenderMinutes: Number.parseInt(values[12]) || 0,
        skaterMinutes: Number.parseInt(values[13]) || 0,
      }

      console.log(`[v0] Extracted player ID "${extractedPlayerId}" from identifier "${fullIdentifier}"`)
      stats.push(stat)
    }

    console.log(`[v0] Parsed ${stats.length} hockey stats from CSV data`)
    return stats
  }

  static calculateDerivedStats(stats: HockeyStats[]) {
    return stats.map((stat) => ({
      ...stat,
      // Calculate additional metrics
      passAccuracy: stat.passes > 0 ? ((stat.passReceived / stat.passes) * 100).toFixed(1) : "0.0",
      goaltenderTime: this.formatTime(stat.goaltenderMinutes),
      skaterTime: this.formatTime(stat.skaterMinutes),
      totalTime: this.formatTime(stat.goaltenderMinutes + stat.skaterMinutes),
    }))
  }

  private static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }
}

export function parseHockeyCSV(csvText: string) {
  const parsedStats = CSVHockeyParser.parseCSVData(csvText)

  // Convert to the format expected by the analytics page
  return parsedStats.map((stat) => ({
    playerId: stat.playerId,
    playerName: stat.username || `Player ${stat.playerId}`,
    team: stat.team,
    steals: stat.stealsPlus,
    goals: stat.goals,
    assists: stat.assists,
    saves: stat.saves,
    shotsOnGoal: stat.shots,
    shotsBlocked: 0, // Not available in current CSV format
    checks: 0, // Not available in current CSV format
    faceoffWinPercentage: 0, // Not available in current CSV format
    interceptions: stat.pickups,
    passes: stat.passes,
    faceoffs: 0, // Not available in current CSV format
    goalieMinutes: stat.goaltenderMinutes,
    skaterMinutes: stat.skaterMinutes,
  }))
}
