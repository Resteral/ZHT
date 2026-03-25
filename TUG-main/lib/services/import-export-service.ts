import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface ImportResult {
  success: boolean
  recordsProcessed: number
  recordsImported: number
  errors: string[]
  warnings: string[]
}

export interface ExportOptions {
  format: "csv" | "json" | "excel"
  dateRange?: { start: string; end: string }
  filters?: Record<string, any>
  includeStats?: boolean
}

export const importExportService = {
  // Import Functions
  async importPlayers(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      warnings: [],
    }

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      // Validate headers
      const requiredHeaders = ["name", "game", "elo_rating"]
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(", ")}`)
        return result
      }

      const players = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        if (values.length !== headers.length) {
          result.warnings.push(`Line ${i + 1}: Column count mismatch`)
          continue
        }

        const player: any = {}
        headers.forEach((header, index) => {
          player[header] = values[index]
        })

        // Validate required fields
        if (!player.name || !player.game) {
          result.warnings.push(`Line ${i + 1}: Missing required fields`)
          continue
        }

        // Convert numeric fields
        if (player.elo_rating) {
          player.elo_rating = Number.parseInt(player.elo_rating)
          if (isNaN(player.elo_rating)) {
            result.warnings.push(`Line ${i + 1}: Invalid ELO rating`)
            continue
          }
        }

        players.push({
          username: player.name,
          game: player.game,
          elo_rating: player.elo_rating || 1000,
          wins: Number.parseInt(player.wins) || 0,
          losses: Number.parseInt(player.losses) || 0,
          position: player.position || null,
          created_at: new Date().toISOString(),
        })
      }

      result.recordsProcessed = lines.length - 1

      // Insert players into database
      if (players.length > 0) {
        const { data, error } = await supabase.from("user_profiles").insert(players)

        if (error) {
          result.errors.push(`Database error: ${error.message}`)
        } else {
          result.recordsImported = players.length
          result.success = true
        }
      }

      // Log import activity
      await this.logImportActivity({
        type: "players",
        filename: file.name,
        status: result.success ? "success" : "failed",
        records_processed: result.recordsProcessed,
        records_imported: result.recordsImported,
        errors: result.errors,
      })

      return result
    } catch (error) {
      result.errors.push(`File processing error: ${error instanceof Error ? error.message : "Unknown error"}`)
      return result
    }
  },

  async importTournaments(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      warnings: [],
    }

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      const requiredHeaders = ["tournament_name", "game", "prize_pool"]
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(", ")}`)
        return result
      }

      const tournaments = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        const tournament: any = {}
        headers.forEach((header, index) => {
          tournament[header] = values[index]
        })

        if (!tournament.tournament_name || !tournament.game) {
          result.warnings.push(`Line ${i + 1}: Missing required fields`)
          continue
        }

        tournaments.push({
          name: tournament.tournament_name,
          game: tournament.game,
          prize_pool: Number.parseFloat(tournament.prize_pool) || 0,
          max_participants: Number.parseInt(tournament.participants) || 16,
          status: "upcoming",
          created_at: new Date().toISOString(),
        })
      }

      result.recordsProcessed = lines.length - 1

      if (tournaments.length > 0) {
        const { error } = await supabase.from("tournaments").insert(tournaments)

        if (error) {
          result.errors.push(`Database error: ${error.message}`)
        } else {
          result.recordsImported = tournaments.length
          result.success = true
        }
      }

      await this.logImportActivity({
        type: "tournaments",
        filename: file.name,
        status: result.success ? "success" : "failed",
        records_processed: result.recordsProcessed,
        records_imported: result.recordsImported,
        errors: result.errors,
      })

      return result
    } catch (error) {
      result.errors.push(`File processing error: ${error instanceof Error ? error.message : "Unknown error"}`)
      return result
    }
  },

  async importGameResults(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      warnings: [],
    }

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      const requiredHeaders = ["date", "team1", "team2", "score1", "score2"]
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(", ")}`)
        return result
      }

      const games = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        const game: any = {}
        headers.forEach((header, index) => {
          game[header] = values[index]
        })

        if (!game.team1 || !game.team2) {
          result.warnings.push(`Line ${i + 1}: Missing team names`)
          continue
        }

        games.push({
          name: `${game.team1} vs ${game.team2}`,
          game: game.game_type || "hockey",
          match_type: "regular",
          status: "completed",
          created_at: new Date().toISOString(),
          start_date: new Date(game.date).toISOString(),
          max_participants: 10,
          entry_fee: 0,
          prize_pool: 0,
        })
      }

      result.recordsProcessed = lines.length - 1

      if (games.length > 0) {
        const { error } = await supabase.from("games").insert(games)

        if (error) {
          result.errors.push(`Database error: ${error.message}`)
        } else {
          result.recordsImported = games.length
          result.success = true
        }
      }

      await this.logImportActivity({
        type: "games",
        filename: file.name,
        status: result.success ? "success" : "failed",
        records_processed: result.recordsProcessed,
        records_imported: result.recordsImported,
        errors: result.errors,
      })

      return result
    } catch (error) {
      result.errors.push(`File processing error: ${error instanceof Error ? error.message : "Unknown error"}`)
      return result
    }
  },

  // Export Functions
  async exportPlayers(options: ExportOptions): Promise<string> {
    let query = supabase.from("user_profiles").select("*")

    if (options.dateRange) {
      query = query.gte("created_at", options.dateRange.start).lte("created_at", options.dateRange.end)
    }

    const { data, error } = await query

    if (error) throw new Error(`Export error: ${error.message}`)

    await this.logExportActivity({
      type: "players",
      format: options.format,
      records_exported: data?.length || 0,
      status: "success",
    })

    return this.formatExportData(data || [], options.format)
  },

  async exportTournaments(options: ExportOptions): Promise<string> {
    let query = supabase.from("tournaments").select("*")

    if (options.filters?.status) {
      query = query.eq("status", options.filters.status)
    }

    if (options.filters?.game) {
      query = query.eq("game", options.filters.game)
    }

    const { data, error } = await query

    if (error) throw new Error(`Export error: ${error.message}`)

    await this.logExportActivity({
      type: "tournaments",
      format: options.format,
      records_exported: data?.length || 0,
      status: "success",
    })

    return this.formatExportData(data || [], options.format)
  },

  async exportGames(options: ExportOptions): Promise<string> {
    let query = supabase.from("games").select("*")

    if (options.dateRange) {
      query = query.gte("played_at", options.dateRange.start).lte("played_at", options.dateRange.end)
    }

    const { data, error } = await query

    if (error) throw new Error(`Export error: ${error.message}`)

    await this.logExportActivity({
      type: "games",
      format: options.format,
      records_exported: data?.length || 0,
      status: "success",
    })

    return this.formatExportData(data || [], options.format)
  },

  async exportBettingData(options: ExportOptions): Promise<string> {
    let query = supabase.from("betting_markets").select("*")

    if (options.filters?.status) {
      query = query.eq("status", options.filters.status)
    }

    const { data, error } = await query

    if (error) throw new Error(`Export error: ${error.message}`)

    await this.logExportActivity({
      type: "betting",
      format: options.format,
      records_exported: data?.length || 0,
      status: "success",
    })

    return this.formatExportData(data || [], options.format)
  },

  // Utility Functions
  formatExportData(data: any[], format: string): string {
    if (format === "json") {
      return JSON.stringify(data, null, 2)
    }

    if (format === "csv") {
      if (data.length === 0) return ""

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(","),
        ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
      ].join("\n")

      return csvContent
    }

    // For Excel format, return CSV for now (could be enhanced with actual Excel generation)
    return this.formatExportData(data, "csv")
  },

  async logImportActivity(activity: any) {
    try {
      await supabase.from("import_logs").insert({
        ...activity,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to log import activity:", error)
    }
  },

  async logExportActivity(activity: any) {
    try {
      await supabase.from("export_logs").insert({
        ...activity,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to log export activity:", error)
    }
  },

  async getImportHistory() {
    const { data, error } = await supabase
      .from("import_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw new Error(`Failed to fetch import history: ${error.message}`)
    return data || []
  },

  async getExportHistory() {
    const { data, error } = await supabase
      .from("export_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw new Error(`Failed to fetch export history: ${error.message}`)
    return data || []
  },
}
