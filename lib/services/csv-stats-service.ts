export interface CSVPlayerStats {
  accountId: string
  username: string
  team: number
  steals: number
  goals: number
  assists: number
  shots: number
  pickups: number
  passes: number
  passesReceived: number
  savePercentage: number
  shotsOnGoalie: number
  shotsSaved: number
  goalieMinutes: number
  skaterMinutes: number
  matchId: string
  matchName: string
  submittedAt: string
}

export class CSVStatsService {
  static parseCSVData(csvCode: string, matchId: string, matchName: string): CSVPlayerStats[] {
    if (!csvCode.trim()) {
      console.log("[v0] Empty CSV code provided")
      return []
    }

    console.log("[v0] Parsing CSV data:", csvCode.substring(0, 200) + "...")
    const lines = csvCode.trim().split("\n")
    const stats: CSVPlayerStats[] = []

    console.log("[v0] Found", lines.length, "lines in CSV")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(",")
      console.log(`[v0] Line ${i + 1}: ${parts.length} parts -`, parts.slice(0, 5))

      if (parts.length < 10) {
        console.log(`[v0] Skipping line ${i + 1}: insufficient parts (${parts.length})`)
        continue
      }

      let accountId = ""
      let team = 1

      // Try different formats for account ID
      if (parts[1]?.includes("-")) {
        // Format like "1-S2-1-5822233" - extract the last part
        accountId = parts[1].split("-").pop()?.trim() || ""
      } else if (parts[1]?.trim()) {
        // Direct account ID
        accountId = parts[1].trim()
      }

      // Try to extract team from first part
      const teamPart = parts[0]?.trim()
      if (teamPart && !isNaN(Number(teamPart))) {
        team = Number(teamPart)
      }

      if (!accountId) {
        console.log(`[v0] Skipping line ${i + 1}: no valid account ID found`)
        continue
      }

      console.log(`[v0] Processing player: accountId=${accountId}, team=${team}`)

      const stat: CSVPlayerStats = {
        accountId,
        username: "", // Will be populated when displaying
        team,
        steals: this.parseNumber(parts[2], 0),
        goals: this.parseNumber(parts[3], 0),
        assists: this.parseNumber(parts[4], 0),
        shots: this.parseNumber(parts[5], 0),
        pickups: this.parseNumber(parts[6], 0),
        passes: this.parseNumber(parts[7], 0),
        passesReceived: this.parseNumber(parts[8], 0),
        savePercentage: this.parseNumber(parts[9], 0),
        shotsOnGoalie: this.parseNumber(parts[10], 0),
        shotsSaved: this.parseNumber(parts[11], 0),
        goalieMinutes: this.parseNumber(parts[12], 0),
        skaterMinutes: this.parseNumber(parts[13], 0),
        matchId,
        matchName,
        submittedAt: new Date().toISOString(),
      }

      stats.push(stat)
      console.log(`[v0] Added stats for ${accountId}: ${stat.goals}G ${stat.assists}A`)
    }

    console.log(`[v0] Parsed ${stats.length} player stats from CSV`)
    return stats
  }

  private static parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue
    const parsed = Number(value.trim())
    return isNaN(parsed) ? defaultValue : parsed
  }

  static async getPlayerCSVStats(supabase: any, playerId?: string) {
    try {
      console.log("[v0] Loading CSV stats for player:", playerId || "all players")

      // Get all score submissions with CSV data
      let query = supabase
        .from("score_submissions")
        .select(`
          csv_code,
          match_id,
          submitted_at,
          matches!inner(name)
        `)
        .not("csv_code", "is", null)
        .neq("csv_code", "")

      if (playerId) {
        query = query.eq("submitter_id", playerId)
      }

      const { data: submissions, error } = await query

      if (error) throw error

      console.log(`[v0] Found ${submissions?.length || 0} CSV submissions`)

      const allStats: CSVPlayerStats[] = []

      for (const submission of submissions || []) {
        console.log(`[v0] Processing submission for match: ${submission.matches?.name}`)
        const matchStats = this.parseCSVData(
          submission.csv_code,
          submission.match_id,
          submission.matches?.name || "Unknown Match",
        )
        allStats.push(...matchStats)
      }

      console.log(`[v0] Total stats collected: ${allStats.length}`)

      // Group by account ID and aggregate stats
      const playerStatsMap = new Map<string, CSVPlayerStats>()

      for (const stat of allStats) {
        const existing = playerStatsMap.get(stat.accountId)
        if (existing) {
          // Aggregate stats
          existing.goals += stat.goals
          existing.assists += stat.assists
          existing.steals += stat.steals
          existing.shots += stat.shots
          existing.pickups += stat.pickups
          existing.passes += stat.passes
          existing.passesReceived += stat.passesReceived
          existing.shotsOnGoalie += stat.shotsOnGoalie
          existing.shotsSaved += stat.shotsSaved
          existing.goalieMinutes += stat.goalieMinutes
          existing.skaterMinutes += stat.skaterMinutes
        } else {
          playerStatsMap.set(stat.accountId, { ...stat })
        }
      }

      const result = Array.from(playerStatsMap.values())
      console.log(`[v0] Returning ${result.length} aggregated player stats`)
      return result
    } catch (error) {
      console.error("[v0] Error fetching CSV stats:", error)
      return []
    }
  }

  static async getUsernameForAccountId(supabase: any, accountId: string): Promise<string> {
    try {
      const { data: user, error } = await supabase.from("users").select("username").eq("account_id", accountId).single()

      if (error || !user) return `Player ${accountId}`
      return user.username
    } catch (error) {
      return `Player ${accountId}`
    }
  }
}
