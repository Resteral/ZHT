import { createClient } from "@/lib/supabase/client"
import { captainSelectionService } from "./captain-selection-service"

export const readyCheckService = {
    async markUserReady(tournamentId: string, userId: string) {
        const supabase = createClient()
        console.log("[v0] Marking user ready:", userId, "for tournament:", tournamentId)

        // 1. Update participant status to 'ready'
        const { error: updateError } = await supabase
            .from("tournament_participants")
            .update({ status: "ready" })
            .eq("tournament_id", tournamentId)
            .eq("user_id", userId)

        if (updateError) {
            console.error("[v0] Error marking user ready:", updateError)
            throw updateError
        }

        // 2. Check if all participants are ready
        const { data: participants, error: fetchError } = await supabase
            .from("tournament_participants")
            .select("status")
            .eq("tournament_id", tournamentId)

        if (fetchError) {
            console.error("[v0] Error fetching participants for ready check:", fetchError)
            return
        }

        const allReady = participants.every((p) => p.status === "ready")

        if (allReady) {
            console.log("[v0] All players ready! Starting snake draft initialization...")
            await this.startSnakeDraft(tournamentId)
        }
    },

    async startSnakeDraft(tournamentId: string) {
        const supabase = createClient()

        try {
            // 1. Auto-select captains
            const captainResult = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

            if (!captainResult.success) {
                console.error("[v0] Failed to auto-select captains:", captainResult.message)
                // Ideally notify creating user or handle error state
                return
            }

            // 2. Update tournament status to 'drafting'
            const { error: updateError } = await supabase
                .from("tournaments")
                .update({ status: "drafting" })
                .eq("id", tournamentId)

            if (updateError) {
                console.error("[v0] Error starting drafting phase:", updateError)
            } else {
                console.log("[v0] Tournament transitioned to 'drafting' phase.")
            }

        } catch (e) {
            console.error("[v0] Exception starting snake draft:", e)
        }
    }
}
