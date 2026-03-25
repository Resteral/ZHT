import { createClient } from "@/lib/supabase/client"
import { monthLongTournamentService } from "./month-long-tournament-service"

const supabase = createClient()

export const tournamentProgressionService = {
  async initializeAutomation() {
    console.log("[v0] Initializing tournament progression automation")

    // Check for phase progression every 5 minutes
    setInterval(
      async () => {
        try {
          await monthLongTournamentService.checkPhaseProgression()
        } catch (error) {
          console.error("[v0] Error in phase progression check:", error)
        }
      },
      5 * 60 * 1000,
    )
  },

  async generateWeeklySchedule(tournamentId: string, week: number) {
    console.log("[v0] Generating weekly schedule:", { tournamentId, week })

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("user_id, users!inner(username, elo_rating)")
      .eq("tournament_id", tournamentId)
      .eq("status", "active")

    if (!participants || participants.length < 2) return

    const matches = []
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        const { data: match } = await supabase
          .from("matches")
          .insert({
            name: `Week ${week} Match ${Math.floor(i / 2) + 1}`,
            description: `${participants[i].users.username} vs ${participants[i + 1].users.username}`,
            match_type: "tournament",
            status: "scheduled",
            creator_id: participants[i].user_id,
            max_participants: 2,
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          })
          .select()
          .single()

        if (match) {
          // Add participants to match
          await supabase.from("match_participants").insert([
            { match_id: match.id, user_id: participants[i].user_id },
            { match_id: match.id, user_id: participants[i + 1].user_id },
          ])

          matches.push(match)
        }
      }
    }

    return matches
  },

  async updateTournamentStandings(tournamentId: string) {
    console.log("[v0] Updating tournament standings:", tournamentId)

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select(`
        user_id,
        users!inner(username),
        matches:match_participants!inner(
          match:matches!inner(
            status,
            match_results(winning_team, team1_score, team2_score)
          )
        )
      `)
      .eq("tournament_id", tournamentId)

    if (!participants) return

    // Calculate wins/losses for each participant
    const standings = participants
      .map((participant) => {
        const wins = 0
        const losses = 0
        const points = 0

        // This would need more complex logic based on actual match results
        // For now, using placeholder calculation

        return {
          user_id: participant.user_id,
          username: participant.users.username,
          wins,
          losses,
          points: wins * 3 + losses * 1, // 3 points for win, 1 for participation
        }
      })
      .sort((a, b) => b.points - a.points)

    await supabase.from("tournament_settings").upsert({
      tournament_id: tournamentId,
      setting_key: "current_standings",
      setting_value: JSON.stringify(standings),
    })

    return standings
  },

  async distributePrizes(tournamentId: string) {
    console.log("[v0] Distributing tournament prizes:", tournamentId)

    const { data: tournament } = await supabase.from("tournaments").select("prize_pool").eq("id", tournamentId).single()

    if (!tournament?.prize_pool) return

    const { data: standingsData } = await supabase
      .from("tournament_settings")
      .select("setting_value")
      .eq("tournament_id", tournamentId)
      .eq("setting_key", "current_standings")
      .single()

    if (!standingsData) return

    const standings = JSON.parse(standingsData.setting_value)
    const prizePool = tournament.prize_pool

    const prizeDistribution = [0.4, 0.25, 0.15, 0.1, 0.05, 0.05]

    for (let i = 0; i < Math.min(standings.length, prizeDistribution.length); i++) {
      const prize = prizePool * prizeDistribution[i]

      // Add prize to user balance
      await supabase
        .from("users")
        .update({
          balance: supabase.raw("balance + ?", [prize]),
        })
        .eq("id", standings[i].user_id)

      // Record transaction
      await supabase.from("financial_transactions").insert({
        user_id: standings[i].user_id,
        transaction_type: "tournament_prize",
        amount: prize,
        currency: "USD",
        status: "completed",
        description: `Tournament prize - ${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} place`,
        metadata: { tournament_id: tournamentId, placement: i + 1 },
      })
    }

    await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId)
  },
}
