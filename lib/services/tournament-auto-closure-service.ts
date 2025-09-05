import { createClient } from "@supabase/supabase-js" // Fixed incorrect import from "supabase-js" to "@supabase/supabase-js"

export interface TournamentClosureReason {
  reason: "insufficient_players" | "draft_date_passed" | "manual_closure"
  details: string
  required_players: number
  actual_players: number
}

class TournamentAutoClosureService {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  async checkAndCloseExpiredTournaments(): Promise<void> {
    console.log("[v0] Checking for tournaments that need automatic closure...")

    try {
      // Find tournaments that are past their start date but still in registration/drafting
      const { data: expiredTournaments, error } = await this.supabase
        .from("tournaments")
        .select(`
          id,
          name,
          start_date,
          status,
          player_pool_settings,
          tournament_participants(count)
        `)
        .in("status", ["registration", "drafting"])
        .lt("start_date", new Date().toISOString())

      if (error) {
        console.error("[v0] Error fetching expired tournaments:", error)
        return
      }

      if (!expiredTournaments || expiredTournaments.length === 0) {
        console.log("[v0] No expired tournaments found")
        return
      }

      console.log(`[v0] Found ${expiredTournaments.length} expired tournaments to check`)

      for (const tournament of expiredTournaments) {
        await this.evaluateAndCloseTournament(tournament)
      }
    } catch (error) {
      console.error("[v0] Error in automatic tournament closure:", error)
    }
  }

  private async evaluateAndCloseTournament(tournament: any): Promise<void> {
    const participantCount = tournament.tournament_participants[0]?.count || 0
    const settings = tournament.player_pool_settings || {}

    const requiredPlayers = this.calculateRequiredPlayers(settings)

    console.log(`[v0] Evaluating tournament ${tournament.name}:`, {
      participantCount,
      requiredPlayers,
      status: tournament.status,
    })

    if (participantCount < requiredPlayers) {
      const closureReason: TournamentClosureReason = {
        reason: "insufficient_players",
        details: `Tournament could not start: needed ${requiredPlayers} players but only had ${participantCount}`,
        required_players: requiredPlayers,
        actual_players: participantCount,
      }

      await this.closeTournament(tournament.id, closureReason)
    } else {
      // Tournament has enough players but didn't start - try to start it now
      console.log(`[v0] Tournament ${tournament.name} has enough players, attempting to start...`)
      await this.attemptLateStart(tournament.id)
    }
  }

  private calculateRequiredPlayers(settings: any): number {
    if (settings.player_organization === "teams" || settings.player_organization === "premade_teams") {
      const numTeams = settings.num_teams || settings.max_teams || 4
      const playersPerTeam = settings.players_per_team || 4
      return numTeams * playersPerTeam
    }

    // For individual tournaments, use minimum viable number
    return settings.min_participants || 8
  }

  private async closeTournament(tournamentId: string, reason: TournamentClosureReason): Promise<void> {
    console.log(`[v0] Automatically closing tournament ${tournamentId}:`, reason)

    try {
      // Update tournament status to cancelled
      const { error: updateError } = await this.supabase
        .from("tournaments")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (updateError) throw updateError

      // Log the closure reason
      await this.supabase.from("tournament_lifecycle_logs").insert({
        tournament_id: tournamentId,
        event_type: "automatic_closure",
        event_data: {
          closure_reason: reason,
          closed_at: new Date().toISOString(),
          automatic: true,
        },
        severity: "info",
      })

      // Notify participants about the cancellation
      await this.notifyParticipantsOfCancellation(tournamentId, reason)

      // Schedule cleanup for cancelled tournament
      await this.scheduleCleanup(tournamentId)

      console.log(`[v0] Tournament ${tournamentId} automatically closed due to: ${reason.reason}`)
    } catch (error) {
      console.error(`[v0] Error closing tournament ${tournamentId}:`, error)
    }
  }

  private async attemptLateStart(tournamentId: string): Promise<void> {
    try {
      // Try to progress tournament to drafting status
      const { error } = await this.supabase
        .from("tournaments")
        .update({
          status: "drafting",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (error) throw error

      console.log(`[v0] Tournament ${tournamentId} started late but successfully`)

      // Log the late start
      await this.supabase.from("tournament_lifecycle_logs").insert({
        tournament_id: tournamentId,
        event_type: "late_start",
        event_data: {
          started_at: new Date().toISOString(),
          automatic: true,
        },
        severity: "info",
      })
    } catch (error) {
      console.error(`[v0] Error attempting late start for tournament ${tournamentId}:`, error)
    }
  }

  private async notifyParticipantsOfCancellation(tournamentId: string, reason: TournamentClosureReason): Promise<void> {
    const { data: participants } = await this.supabase
      .from("tournament_participants")
      .select("user_id, users(username)")
      .eq("tournament_id", tournamentId)

    if (!participants || participants.length === 0) return

    const notifications = participants.map((participant) => ({
      user_id: participant.user_id,
      title: "Tournament Cancelled",
      message: `Tournament was automatically cancelled: ${reason.details}`,
      type: "tournament_cancelled",
      tournament_id: tournamentId,
      created_at: new Date().toISOString(),
    }))

    await this.supabase.from("notifications").insert(notifications)
  }

  private async scheduleCleanup(tournamentId: string): Promise<void> {
    const cleanupDate = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now

    await this.supabase.from("tournament_cleanup_schedule").insert({
      tournament_id: tournamentId,
      scheduled_cleanup_at: cleanupDate.toISOString(),
      cleanup_policy: JSON.stringify({
        cleanup_type: "soft",
        archive_before_cleanup: true,
        preserve_results: false,
        notify_participants: false,
      }),
      status: "scheduled",
      created_at: new Date().toISOString(),
    })
  }

  // Method to be called by cron job
  async runAutomaticClosure(): Promise<void> {
    console.log("[v0] Running automatic tournament closure check...")
    await this.checkAndCloseExpiredTournaments()
  }
}

export const tournamentAutoClosureService = new TournamentAutoClosureService()
