import { createClient } from "@/lib/supabase/client"
import { seasonalTournamentService } from "./seasonal-tournament-service"

interface AutomaticTournamentConfig {
  season_duration_days: number
  registration_period_days: number
  prize_pool: number
  max_participants: number
  elo_cutoff_minimum: number
}

class AutomaticSeasonalTournamentService {
  private supabase = createClient()
  private config: AutomaticTournamentConfig = {
    season_duration_days: 90, // 3 months
    registration_period_days: 14, // 2 weeks registration
    prize_pool: 10000,
    max_participants: 500,
    elo_cutoff_minimum: 1200,
  }

  async checkAndCreateNewSeason(): Promise<boolean> {
    try {
      console.log("[v0] Checking for active seasonal tournaments...")

      // Check if there's an active season
      const currentSeason = await seasonalTournamentService.getCurrentSeason()

      if (currentSeason) {
        const endDate = new Date(currentSeason.end_date)
        const now = new Date()

        // If season ends within 24 hours, prepare next season
        const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
          console.log("[v0] Current season ending soon, preparing next season...")
          await this.prepareNextSeason(currentSeason.season_number + 1)
          return true
        }

        // If season has ended, start new one immediately
        if (now > endDate) {
          console.log("[v0] Current season has ended, starting new season...")
          await this.startNewSeason(currentSeason.season_number + 1)
          return true
        }

        console.log("[v0] Current season is active, no action needed")
        return false
      }

      // No active season, create the first one
      console.log("[v0] No active season found, creating initial season...")
      await this.startNewSeason(1)
      return true
    } catch (error) {
      console.error("Error checking/creating seasonal tournament:", error)
      return false
    }
  }

  private async prepareNextSeason(seasonNumber: number): Promise<void> {
    const now = new Date()
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Start tomorrow
    const endDate = new Date(startDate.getTime() + this.config.season_duration_days * 24 * 60 * 60 * 1000)
    const registrationStart = now
    const registrationEnd = new Date(startDate.getTime() + this.config.registration_period_days * 24 * 60 * 60 * 1000)

    const { error } = await this.supabase.from("seasonal_tournaments").insert({
      name: `Season ${seasonNumber} - ${this.getSeasonName(seasonNumber)}`,
      season_number: seasonNumber,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: "upcoming",
      registration_start: registrationStart.toISOString(),
      registration_end: registrationEnd.toISOString(),
      total_prize_pool: this.config.prize_pool,
      max_participants: this.config.max_participants,
      elo_cutoff_minimum: this.config.elo_cutoff_minimum,
      season_type: "standard",
    })

    if (error) throw error
    console.log(`[v0] Prepared Season ${seasonNumber} for automatic start`)
  }

  private async startNewSeason(seasonNumber: number): Promise<void> {
    // End current season if exists
    await this.supabase.from("seasonal_tournaments").update({ status: "completed" }).eq("status", "active")

    // Start new season
    const now = new Date()
    const endDate = new Date(now.getTime() + this.config.season_duration_days * 24 * 60 * 60 * 1000)
    const registrationEnd = new Date(now.getTime() + this.config.registration_period_days * 24 * 60 * 60 * 1000)

    const { error } = await this.supabase.from("seasonal_tournaments").upsert(
      {
        name: `Season ${seasonNumber} - ${this.getSeasonName(seasonNumber)}`,
        season_number: seasonNumber,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        status: "active",
        registration_start: now.toISOString(),
        registration_end: registrationEnd.toISOString(),
        total_prize_pool: this.config.prize_pool,
        max_participants: this.config.max_participants,
        current_participants: 0,
        elo_cutoff_minimum: this.config.elo_cutoff_minimum,
        season_type: "standard",
      },
      {
        onConflict: "season_number",
      },
    )

    if (error) throw error
    console.log(`[v0] Started Season ${seasonNumber} automatically`)
  }

  private getSeasonName(seasonNumber: number): string {
    const seasonNames = ["Spring Championship", "Summer League", "Autumn Tournament", "Winter Series"]
    return seasonNames[(seasonNumber - 1) % 4]
  }

  async resetSeasonalData(seasonId: string): Promise<boolean> {
    try {
      console.log("[v0] Resetting seasonal data for completed season...")

      // Archive current season data
      await this.supabase
        .from("seasonal_tournament_participants")
        .update({
          last_activity: new Date().toISOString(),
          // Keep all data for historical purposes
        })
        .eq("seasonal_tournament_id", seasonId)

      // Update season status
      await this.supabase
        .from("seasonal_tournaments")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", seasonId)

      console.log("[v0] Seasonal data reset completed")
      return true
    } catch (error) {
      console.error("Error resetting seasonal data:", error)
      return false
    }
  }

  // Method to be called by a cron job or scheduled task
  async runAutomaticSeasonManagement(): Promise<void> {
    console.log("[v0] Running automatic seasonal tournament management...")

    try {
      const actionTaken = await this.checkAndCreateNewSeason()

      if (actionTaken) {
        console.log("[v0] Automatic season management completed with actions taken")
      } else {
        console.log("[v0] Automatic season management completed - no actions needed")
      }
    } catch (error) {
      console.error("Error in automatic season management:", error)
    }
  }

  // Initialize the automatic system
  async initialize(): Promise<void> {
    console.log("[v0] Initializing automatic seasonal tournament system...")

    // Run initial check
    await this.runAutomaticSeasonManagement()

    // Set up periodic checks (every 6 hours)
    setInterval(
      () => {
        this.runAutomaticSeasonManagement()
      },
      6 * 60 * 60 * 1000,
    )

    console.log("[v0] Automatic seasonal tournament system initialized")
  }
}

export const automaticSeasonalTournamentService = new AutomaticSeasonalTournamentService()
