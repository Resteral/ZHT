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
    const processedPlayers = new Set<string>()

    for (const line of lines) {
      if (!line.trim()) continue

      const values = line.split(",").map((v) => v.trim())

      // Remove empty leading values and adjust indices accordingly
      let startIndex = 0
      while (startIndex < values.length && (!values[startIndex] || values[startIndex] === "")) {
        startIndex++
      }

      const adjustedValues = values.slice(startIndex)

      if (adjustedValues.length < 14) {
        console.log(`[v0] Skipping invalid CSV line (${adjustedValues.length} fields after adjustment): ${line}`)
        continue
      }

      const fullIdentifier = adjustedValues[1] || ""

      // Skip empty or invalid player identifiers
      if (!fullIdentifier || fullIdentifier.length < 3) {
        console.log(`[v0] Skipping line with empty or invalid player identifier: ${line}`)
        continue
      }

      let accountId = fullIdentifier
      if (fullIdentifier.includes("-")) {
        const accountIdMatch = fullIdentifier.match(/-(\d+)$/) // Extract the last numeric part after the final dash
        accountId = accountIdMatch ? accountIdMatch[1] : fullIdentifier
      }

      if (processedPlayers.has(accountId)) {
        console.log(`[v0] Skipping duplicate account ID "${accountId}"`)
        continue
      }
      processedPlayers.add(accountId)

      const stat: HockeyStats = {
        team: 0, // Set neutral team (0) instead of using CSV team data
        matchId: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playerId: accountId, // Use Account ID as primary identifier
        stealsPlus: Number.parseInt(adjustedValues[2]) || 0,
        goals: Number.parseInt(adjustedValues[3]) || 0,
        assists: Number.parseInt(adjustedValues[4]) || 0,
        shots: Number.parseInt(adjustedValues[5]) || 0,
        pickups: Number.parseInt(adjustedValues[6]) || 0,
        passes: Number.parseInt(adjustedValues[7]) || 0,
        passReceived: Number.parseInt(adjustedValues[8]) || 0,
        savePercent: Number.parseFloat(adjustedValues[9]) || 0,
        saves: Number.parseInt(adjustedValues[10]) || 0,
        allowed: Number.parseInt(adjustedValues[11]) || 0,
        goaltenderMinutes: Number.parseInt(adjustedValues[12]) || 0,
        skaterMinutes: Number.parseInt(adjustedValues[13]) || 0,
      }

      console.log(
        `[v0] Processed account ID "${accountId}" from identifier "${fullIdentifier}" (team assignment ignored)`,
      )
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
    playerName: stat.username || "Unknown Player",
    team: stat.team, // Will now be 0 (neutral) for all players
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

export const csvHockeyParser = {
  parseCSVData: CSVHockeyParser.parseCSVData.bind(CSVHockeyParser),
  calculateDerivedStats: CSVHockeyParser.calculateDerivedStats.bind(CSVHockeyParser),
  parseHockeyCSV,
}
