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
  possession: number
  savesAllowed: number
  saves: number
  savePercentage: number
  saveAmount: number // Total save attempts
  goalTended: number
  skatingTime: number
  matchId: string
  matchName: string
  submittedAt: string
  gamesPlayed: number
}

export class CSVStatsService {
  static parseCSVData(csvCode: string, matchId: string, matchName: string): CSVPlayerStats[] {
    if (!csvCode.trim()) {
      console.log("[v0] Empty CSV code provided")
      return []
    }

    console.log("[v0] Parsing CSV data:", csvCode.substring(0, 200) + "...")
    const lines = csvCode.trim().replace(/\/n/g, "\n").split("\n")
    const stats: CSVPlayerStats[] = []

    console.log("[v0] Found", lines.length, "lines in CSV")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      let parts = line.split(",")

      // Try semicolon if comma doesn't work well
      if (parts.length < 8 && line.includes(";")) {
        parts = line.split(";")
        console.log(`[v0] Line ${i + 1}: Trying semicolon delimiter, got ${parts.length} parts`)
      }

      // Try tab delimiter
      if (parts.length < 8 && line.includes("\t")) {
        parts = line.split("\t")
        console.log(`[v0] Line ${i + 1}: Trying tab delimiter, got ${parts.length} parts`)
      }

      console.log(`[v0] Line ${i + 1}: ${parts.length} parts -`, parts.slice(0, 8))

      if (parts.length < 6) {
        console.log(`[v0] Skipping line ${i + 1}: insufficient parts (${parts.length}, need at least 6)`)
        continue
      }

      let accountId = ""
      let team = 1

      if (parts[1]?.includes("-")) {
        // Format like "1-S2-1-5822233" - extract the last part
        const idParts = parts[1].split("-")
        accountId = idParts[idParts.length - 1]?.trim() || ""
        console.log(`[v0] Extracted account ID from complex format: ${accountId}`)
      } else if (parts[1]?.trim()) {
        // Direct account ID or handle
        accountId = parts[1].trim()
        console.log(`[v0] Using direct account ID/handle: ${accountId}`)
      }

      if (!accountId && parts[0]?.includes("-")) {
        const idParts = parts[0].split("-")
        accountId = idParts[idParts.length - 1]?.trim() || ""
        console.log(`[v0] Found account ID in first column: ${accountId}`)
      }

      // Try to extract team from first part
      const teamPart = parts[0]?.trim()
      if (teamPart && !isNaN(Number(teamPart))) {
        team = Number(teamPart)
      }

      if (!accountId || accountId === "0") {
        console.log(`[v0] Skipping line ${i + 1}: no valid account ID found (got: "${accountId}")`)
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
        possession: this.parseNumber(parts[9], 0),
        savesAllowed: this.parseNumber(parts[10], 0),
        saves: this.parseNumber(parts[11], 0),
        goalTended: this.parseNumber(parts[12], 0),
        skatingTime: this.parseNumber(parts[13], 0),
        saveAmount: this.parseNumber(parts[11], 0) + this.parseNumber(parts[10], 0), // Total save attempts
        savePercentage: this.calculateSavePercentage(this.parseNumber(parts[11], 0), this.parseNumber(parts[10], 0)),
        matchId,
        matchName,
        submittedAt: new Date().toISOString(),
        gamesPlayed: 1,
      }

      stats.push(stat)
      console.log(
        `[v0] Added stats for ${accountId}: ${stat.goals}G ${stat.assists}A ${stat.saves}S ${stat.savePercentage.toFixed(1)}%`,
      )
    }

    console.log(`[v0] Successfully parsed ${stats.length} player stats from CSV`)
    return stats
  }

  private static parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value || value.trim() === "") return defaultValue

    const cleaned = value.trim().replace(/[^\d.-]/g, "") // Remove non-numeric characters except decimal and minus
    const parsed = Number(cleaned)

    if (isNaN(parsed)) {
      console.log(`[v0] Could not parse number from "${value}", using default ${defaultValue}`)
      return defaultValue
    }

    return parsed
  }

  private static calculateSavePercentage(saves: number, savesAllowed: number): number {
    const totalShots = saves + savesAllowed
    if (totalShots === 0) return 0
    return (saves / totalShots) * 100
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

      console.log(`[v0] Found ${submissions?.length || 0} CSV submissions to process`)

      const allStats: CSVPlayerStats[] = []

      for (const submission of submissions || []) {
        console.log(`[v0] Processing submission for match: ${submission.matches?.name}`)
        const matchStats = this.parseCSVData(
          submission.csv_code,
          submission.match_id,
          submission.matches?.name || "Unknown Match",
        )
        allStats.push(...matchStats)
        console.log(`[v0] Extracted ${matchStats.length} player stats from this submission`)
      }

      console.log(`[v0] Total individual stats collected: ${allStats.length}`)

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
          existing.possession += stat.possession
          existing.savesAllowed += stat.savesAllowed
          existing.saves += stat.saves
          existing.goalTended += stat.goalTended
          existing.skatingTime += stat.skatingTime
          existing.saveAmount += stat.saveAmount
          existing.gamesPlayed += 1
          // Recalculate save percentage
          existing.savePercentage = this.calculateSavePercentage(existing.saves, existing.savesAllowed)
          console.log(`[v0] Aggregated stats for ${stat.accountId}`)
        } else {
          playerStatsMap.set(stat.accountId, { ...stat })
          console.log(`[v0] Added new player stats for ${stat.accountId}`)
        }
      }

      const result = Array.from(playerStatsMap.values())
      console.log(`[v0] Returning ${result.length} unique players with aggregated stats`)
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
