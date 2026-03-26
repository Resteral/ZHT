import { createClient } from "@/lib/supabase/client"
import { tournamentCompletionService } from "./tournament-completion-service"

const supabase = createClient()

export const tournamentAutoClosureService = {
  async runAutomaticClosure(): Promise<void> {
    console.log("[v0] Running automatic tournament closure check")

    try {
      const now = new Date().toISOString()

      // 1. Find active tournaments that have passed their end_date
      const { data: expiredTournaments, error: expiredError } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("status", "active")
        .lte("end_date", now)

      if (expiredError) throw expiredError

      for (const tournament of expiredTournaments || []) {
        console.log(`[v0] Auto-closing expired tournament: ${tournament.name} (${tournament.id})`)
        await tournamentCompletionService.completeTournament(tournament.id)
      }

      // 2. Find tournaments that are "completed" in terms of matches but not yet status='completed'
      // This is delegated to tournamentCompletionService
      await tournamentCompletionService.checkAndCompleteFinishedTournaments()

    } catch (error) {
      console.error("[v0] Error in automatic closure service:", error)
    }
  }
}
