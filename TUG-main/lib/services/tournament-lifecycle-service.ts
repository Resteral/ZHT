import { createClient } from "@/lib/supabase/client"
import { tournamentProgressionService } from "./tournament-progression-service"
import { tournamentAutoClosureService } from "./tournament-auto-closure-service"

const supabase = createClient()

export interface TournamentLifecycleState {
  id: string
  status: "registration" | "drafting" | "active" | "completed" | "cancelled" | "archived"
  phase?: string
  progress_percentage: number
  next_action?: string
  cleanup_scheduled?: string
  can_rollback: boolean
  error_state?: string
}

export interface TournamentCleanupPolicy {
  tournament_id: string
  cleanup_after_hours: number
  archive_before_cleanup: boolean
  preserve_results: boolean
  notify_participants: boolean
  cleanup_type: "soft" | "hard" | "archive_only"
}

export const tournamentLifecycleService = {
  async getLifecycleState(tournamentId: string): Promise<TournamentLifecycleState> {
    console.log("[v0] Getting tournament lifecycle state:", tournamentId)

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .select(`
        id,
        status,
        start_date,
        end_date,
        max_participants,
        tournament_participants(count),
        tournament_settings(setting_key, setting_value)
      `)
      .eq("id", tournamentId)
      .single()

    if (error) throw error

    const participantCount = tournament.tournament_participants[0]?.count || 0
    const progressPercentage = this.calculateProgress(tournament, participantCount)
    const nextAction = this.determineNextAction(tournament, participantCount)
    const canRollback = this.canRollbackStatus(tournament.status)

    return {
      id: tournamentId,
      status: tournament.status,
      progress_percentage: progressPercentage,
      next_action: nextAction,
      can_rollback: canRollback,
      cleanup_scheduled: await this.getScheduledCleanup(tournamentId),
    }
  },

  async progressStatus(
    tournamentId: string,
    targetStatus: string,
    userId: string,
    force = false,
  ): Promise<TournamentLifecycleState> {
    console.log("[v0] Progressing tournament status:", { tournamentId, targetStatus, force })

    const currentState = await this.getLifecycleState(tournamentId)

    // Validate status transition
    if (!force && !this.isValidStatusTransition(currentState.status, targetStatus)) {
      throw new Error(`Invalid status transition from ${currentState.status} to ${targetStatus}`)
    }

    // Check user permissions
    const { data: tournament } = await supabase.from("tournaments").select("created_by").eq("id", tournamentId).single()

    if (tournament?.created_by !== userId && !force) {
      throw new Error("Only tournament creator can change status")
    }

    // Store previous state for rollback
    await this.storeStatusHistory(tournamentId, currentState.status, targetStatus, userId)

    // Execute status change
    const { error } = await supabase
      .from("tournaments")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)

    if (error) throw error

    // Handle status-specific actions
    await this.handleStatusTransition(tournamentId, currentState.status, targetStatus)

    return await this.getLifecycleState(tournamentId)
  },

  async rollbackStatus(tournamentId: string, userId: string): Promise<TournamentLifecycleState> {
    console.log("[v0] Rolling back tournament status:", tournamentId)

    const { data: history, error } = await supabase
      .from("tournament_status_history")
      .select("previous_status, changed_by")
      .eq("tournament_id", tournamentId)
      .order("changed_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !history) {
      throw new Error("No rollback history available")
    }

    if (history.changed_by !== userId) {
      throw new Error("Only the user who made the change can rollback")
    }

    const { error: rollbackError } = await supabase
      .from("tournaments")
      .update({
        status: history.previous_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)

    if (rollbackError) throw rollbackError

    // Log rollback action
    await supabase.from("tournament_status_history").insert({
      tournament_id: tournamentId,
      previous_status: await this.getCurrentStatus(tournamentId),
      new_status: history.previous_status,
      changed_by: userId,
      change_type: "rollback",
      changed_at: new Date().toISOString(),
    })

    return await this.getLifecycleState(tournamentId)
  },

  async scheduleCleanup(tournamentId: string, policy: Partial<TournamentCleanupPolicy>): Promise<void> {
    console.log("[v0] Scheduling tournament cleanup:", { tournamentId, policy })

    const defaultPolicy: TournamentCleanupPolicy = {
      tournament_id: tournamentId,
      cleanup_after_hours: 24,
      archive_before_cleanup: true,
      preserve_results: true,
      notify_participants: true,
      cleanup_type: "soft",
    }

    const finalPolicy = { ...defaultPolicy, ...policy }

    const cleanupDate = new Date(Date.now() + finalPolicy.cleanup_after_hours * 60 * 60 * 1000)

    await supabase.from("tournament_cleanup_schedule").upsert({
      tournament_id: tournamentId,
      scheduled_cleanup_at: cleanupDate.toISOString(),
      cleanup_policy: JSON.stringify(finalPolicy),
      status: "scheduled",
      created_at: new Date().toISOString(),
    })

    console.log("[v0] Cleanup scheduled for:", cleanupDate.toISOString())
  },

  async executeCleanup(tournamentId: string): Promise<void> {
    console.log("[v0] Executing tournament cleanup:", tournamentId)

    const { data: cleanupJob, error } = await supabase
      .from("tournament_cleanup_schedule")
      .select("cleanup_policy")
      .eq("tournament_id", tournamentId)
      .single()

    if (error) throw error

    const policy: TournamentCleanupPolicy = JSON.parse(cleanupJob.cleanup_policy)

    try {
      // Archive tournament data if requested
      if (policy.archive_before_cleanup) {
        await this.archiveTournament(tournamentId, policy.preserve_results)
      }

      // Notify participants if requested
      if (policy.notify_participants) {
        await this.notifyParticipantsOfCleanup(tournamentId)
      }

      // Execute cleanup based on type
      switch (policy.cleanup_type) {
        case "soft":
          await this.softCleanup(tournamentId)
          break
        case "hard":
          await this.hardCleanup(tournamentId)
          break
        case "archive_only":
          // Already archived above, just mark as cleaned
          break
      }

      // Update cleanup status
      await supabase
        .from("tournament_cleanup_schedule")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)

      console.log("[v0] Tournament cleanup completed:", tournamentId)
    } catch (error) {
      console.error("[v0] Error during cleanup:", error)

      await supabase
        .from("tournament_cleanup_schedule")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("tournament_id", tournamentId)

      throw error
    }
  },

  async runLifecycleMonitoring(): Promise<void> {
    console.log("[v0] Running tournament lifecycle monitoring")

    await tournamentAutoClosureService.runAutomaticClosure()

    // Check for tournaments that need status progression
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id, status, start_date, end_date")
      .in("status", ["registration", "drafting", "active"])

    if (!tournaments) return

    for (const tournament of tournaments) {
      try {
        await this.checkAutomaticProgression(tournament.id)
        await this.checkCleanupSchedule(tournament.id)
      } catch (error) {
        console.error(`[v0] Error monitoring tournament ${tournament.id}:`, error)
      }
    }
  },

  // Helper methods
  calculateProgress(tournament: any, participantCount: number): number {
    switch (tournament.status) {
      case "registration":
        return Math.min((participantCount / tournament.max_participants) * 100, 100)
      case "drafting":
        return 25
      case "active":
        return 50
      case "completed":
        return 100
      default:
        return 0
    }
  },

  determineNextAction(tournament: any, participantCount: number): string {
    switch (tournament.status) {
      case "registration":
        return participantCount >= 4 ? "Start Draft" : `Need ${4 - participantCount} more players`
      case "drafting":
        return "Complete Draft"
      case "active":
        return "Complete Tournament"
      case "completed":
        return "Archive Tournament"
      default:
        return "Unknown"
    }
  },

  canRollbackStatus(status: string): boolean {
    return !["completed", "cancelled", "archived"].includes(status)
  },

  isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      registration: ["drafting", "cancelled"],
      drafting: ["active", "cancelled", "registration"],
      active: ["completed", "cancelled"],
      completed: ["archived"],
      cancelled: ["registration"],
    }

    return validTransitions[from]?.includes(to) || false
  },

  async storeStatusHistory(
    tournamentId: string,
    previousStatus: string,
    newStatus: string,
    userId: string,
  ): Promise<void> {
    await supabase.from("tournament_status_history").insert({
      tournament_id: tournamentId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      change_type: "manual",
      changed_at: new Date().toISOString(),
    })
  },

  async handleStatusTransition(tournamentId: string, fromStatus: string, toStatus: string): Promise<void> {
    switch (toStatus) {
      case "completed":
        await this.scheduleCleanup(tournamentId, { cleanup_after_hours: 24 })
        await tournamentProgressionService.distributePrizes(tournamentId)
        break
      case "cancelled":
        await this.scheduleCleanup(tournamentId, { cleanup_after_hours: 1, cleanup_type: "soft" })
        break
      case "archived":
        await this.scheduleCleanup(tournamentId, { cleanup_after_hours: 168, cleanup_type: "hard" }) // 1 week
        break
    }
  },

  async getCurrentStatus(tournamentId: string): Promise<string> {
    const { data } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single()
    return data?.status || "unknown"
  },

  async getScheduledCleanup(tournamentId: string): Promise<string | undefined> {
    const { data } = await supabase
      .from("tournament_cleanup_schedule")
      .select("scheduled_cleanup_at")
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .single()

    return data?.scheduled_cleanup_at
  },

  async checkAutomaticProgression(tournamentId: string): Promise<void> {
    const state = await this.getLifecycleState(tournamentId)

    // Auto-progress based on time and conditions
    const now = new Date()
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("start_date, end_date")
      .eq("id", tournamentId)
      .single()

    if (!tournament) return

    if (state.status === "registration" && tournament.start_date && new Date(tournament.start_date) <= now) {
      // Auto-start draft if start time reached and enough players
      if (state.progress_percentage >= 25) {
        // At least 25% capacity
        await this.progressStatus(tournamentId, "drafting", "system", true)
      }
    }

    if (state.status === "active" && tournament.end_date && new Date(tournament.end_date) <= now) {
      // Auto-complete if end time reached
      await this.progressStatus(tournamentId, "completed", "system", true)
    }
  },

  async checkCleanupSchedule(tournamentId: string): Promise<void> {
    const { data: cleanupJobs } = await supabase
      .from("tournament_cleanup_schedule")
      .select("scheduled_cleanup_at")
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .lte("scheduled_cleanup_at", new Date().toISOString())

    if (cleanupJobs && cleanupJobs.length > 0) {
      await this.executeCleanup(tournamentId)
    }
  },

  async archiveTournament(tournamentId: string, preserveResults: boolean): Promise<void> {
    console.log("[v0] Archiving tournament:", { tournamentId, preserveResults })

    const { data: tournament } = await supabase
      .from("tournaments")
      .select(`
        *,
        tournament_participants(*),
        tournament_brackets(*),
        tournament_settings(*)
      `)
      .eq("id", tournamentId)
      .single()

    if (!tournament) return

    const archiveData = {
      tournament_id: tournamentId,
      tournament_data: JSON.stringify(tournament),
      archived_at: new Date().toISOString(),
      preserve_results: preserveResults,
    }

    await supabase.from("tournament_archives").insert(archiveData)
  },

  async notifyParticipantsOfCleanup(tournamentId: string): Promise<void> {
    console.log("[v0] Notifying participants of cleanup:", tournamentId)

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("user_id, users(username)")
      .eq("tournament_id", tournamentId)

    if (!participants) return

    // Create notifications for all participants
    const notifications = participants.map((participant) => ({
      user_id: participant.user_id,
      title: "Tournament Cleanup",
      message: "Tournament data will be cleaned up soon. Results have been archived.",
      type: "tournament_cleanup",
      tournament_id: tournamentId,
      created_at: new Date().toISOString(),
    }))

    await supabase.from("notifications").insert(notifications)
  },

  async softCleanup(tournamentId: string): Promise<void> {
    // Soft cleanup: Mark as archived but keep data
    await supabase.from("tournaments").update({ status: "archived" }).eq("id", tournamentId)
  },

  async hardCleanup(tournamentId: string): Promise<void> {
    // Hard cleanup: Remove all tournament data
    await supabase.from("tournaments").delete().eq("id", tournamentId)
  },
}
