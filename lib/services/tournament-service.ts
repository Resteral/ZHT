import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const tournamentService = {
  async getTournaments() {
    const { data, error } = await supabase
      .from("leagues")
      .select(`
        *,
        participant_count:league_memberships(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((tournament) => ({
      ...tournament,
      participant_count: tournament.participant_count[0]?.count || 0,
      // Map league fields to tournament interface
      tournament_type: tournament.league_mode || "standard",
      max_participants: tournament.max_teams || 16,
      start_date: tournament.created_at,
    }))
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from("leagues")
      .select(`
        *,
        participant_count:league_memberships(count)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return {
      ...data,
      participant_count: data.participant_count[0]?.count || 0,
      // Map league fields to tournament interface
      tournament_type: data.league_mode || "standard",
      max_participants: data.max_teams || 16,
      start_date: data.created_at,
    }
  },

  async createTournament(tournamentData: any) {
    console.log("[v0] Creating tournament with data:", tournamentData)

    const userStr = localStorage.getItem("user")
    if (!userStr) {
      throw new Error("Not authenticated - please log in")
    }

    const user = JSON.parse(userStr)
    console.log("[v0] User from localStorage:", user)

    const { data, error } = await supabase
      .from("leagues")
      .insert({
        name: tournamentData.name,
        sport: tournamentData.game || "hockey",
        max_teams: tournamentData.max_participants || 16,
        entry_fee: tournamentData.entry_fee || 0,
        prize_pool: tournamentData.prize_pool || 0,
        commissioner_id: user.id,
        league_mode: tournamentData.tournament_type || "tournament",
        status: "registration",
        season: new Date().getFullYear().toString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      throw error
    }

    console.log("[v0] Tournament created successfully:", data)
    return data
  },

  async joinTournament(tournamentId: string, teamName?: string) {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      throw new Error("Not authenticated - please log in")
    }

    const user = JSON.parse(userStr)

    const { data: participants } = await supabase.from("league_memberships").select("id").eq("league_id", tournamentId)

    const seed = (participants?.length || 0) + 1

    const { data, error } = await supabase
      .from("league_memberships")
      .insert({
        league_id: tournamentId,
        user_id: user.id,
        team_name: teamName || `Team ${seed}`,
        draft_position: seed,
        total_budget: 1000,
        remaining_budget: 1000,
      })
      .select()
      .single()

    if (error) throw error

    try {
      const { error: balanceError } = await supabase
        .from("users")
        .update({
          balance: supabase.raw("balance + ?", [25]),
        })
        .eq("id", user.id)

      if (balanceError) {
        console.error("Error updating user balance:", balanceError)
      }
    } catch (rewardError) {
      console.error("Error processing tournament participation reward:", rewardError)
    }

    return data
  },

  async getParticipants(tournamentId: string) {
    const { data, error } = await supabase
      .from("league_memberships")
      .select(`
        *,
        user:users(username, elo_rating, display_name)
      `)
      .eq("league_id", tournamentId)
      .order("draft_position")

    if (error) throw error
    return data
  },

  async getBracket(tournamentId: string) {
    // Return empty bracket for now since tournament_brackets table doesn't exist
    return []
  },

  async generateBracket(tournamentId: string) {
    // Update league status to in_progress
    await supabase.from("leagues").update({ status: "in_progress" }).eq("id", tournamentId)
  },

  async updateMatchScore(matchId: string, scores: { score1: number; score2: number }) {
    // Simplified match score update - could use matches table if needed
    console.log("[v0] Match score updated:", { matchId, scores })
  },
}
