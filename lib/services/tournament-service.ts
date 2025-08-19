import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const tournamentService = {
  async getTournaments() {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((tournament) => ({
      ...tournament,
      participant_count: tournament.participant_count[0]?.count || 0,
    }))
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        participant_count:tournament_participants(count)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return {
      ...data,
      participant_count: data.participant_count[0]?.count || 0,
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
      .from("tournaments")
      .insert({
        ...tournamentData,
        creator_id: user.id,
        status: "registration",
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

    const { data: profile } = await supabase.from("user_profiles").select("username").eq("user_id", user.id).single()

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)

    const seed = (participants?.length || 0) + 1

    const { data, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        team_name: teamName || profile?.username || `Team ${seed}`,
        seed,
      })
      .select()
      .single()

    if (error) throw error

    try {
      const { error: walletError } = await supabase
        .from("user_wallets")
        .update({
          balance: supabase.raw("balance + ?", [25]),
        })
        .eq("user_id", user.id)

      if (walletError) {
        console.error("Error updating wallet balance:", walletError)
      }

      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 25,
        transaction_type: "tournament_participation",
        description: `Tournament participation reward - ${teamName || profile?.username || `Team ${seed}`}`,
        reference_id: data.id,
      })
    } catch (rewardError) {
      console.error("Error processing tournament participation reward:", rewardError)
    }

    return data
  },

  async getParticipants(tournamentId: string) {
    const { data, error } = await supabase
      .from("tournament_participants")
      .select(`
        *,
        user_profile:user_profiles(username, elo_rating)
      `)
      .eq("tournament_id", tournamentId)
      .order("seed")

    if (error) throw error
    return data
  },

  async getBracket(tournamentId: string) {
    const { data, error } = await supabase
      .from("tournament_brackets")
      .select(`
        *,
        participant1:tournament_participants!tournament_brackets_participant1_id_fkey(id, team_name, user_id),
        participant2:tournament_participants!tournament_brackets_participant2_id_fkey(id, team_name, user_id),
        winner:tournament_participants!tournament_brackets_winner_id_fkey(id, team_name, user_id)
      `)
      .eq("tournament_id", tournamentId)
      .order("round_number")
      .order("match_number")

    if (error) throw error
    return data
  },

  async generateBracket(tournamentId: string) {
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed")

    if (!participants || participants.length < 2) {
      throw new Error("Need at least 2 participants to generate bracket")
    }

    const numParticipants = participants.length
    const numRounds = Math.ceil(Math.log2(numParticipants))

    const matches = []
    let matchNumber = 1

    for (let i = 0; i < numParticipants; i += 2) {
      if (i + 1 < numParticipants) {
        matches.push({
          tournament_id: tournamentId,
          round_number: 1,
          match_number: matchNumber++,
          participant1_id: participants[i].id,
          participant2_id: participants[i + 1].id,
          status: "pending",
        })
      }
    }

    for (let round = 2; round <= numRounds; round++) {
      const matchesInRound = Math.ceil(matches.filter((m) => m.round_number === round - 1).length / 2)
      for (let match = 1; match <= matchesInRound; match++) {
        matches.push({
          tournament_id: tournamentId,
          round_number: round,
          match_number: match,
          participant1_id: null,
          participant2_id: null,
          status: "pending",
        })
      }
    }

    const { error } = await supabase.from("tournament_brackets").insert(matches)

    if (error) throw error

    await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)
  },

  async updateMatchScore(matchId: string, scores: { score1: number; score2: number }) {
    const { data: match, error: fetchError } = await supabase
      .from("tournament_brackets")
      .select(`
        *,
        participant1:tournament_participants!tournament_brackets_participant1_id_fkey(*),
        participant2:tournament_participants!tournament_brackets_participant2_id_fkey(*)
      `)
      .eq("id", matchId)
      .single()

    if (fetchError) throw fetchError

    const winnerId = scores.score1 > scores.score2 ? match.participant1_id : match.participant2_id

    const { error } = await supabase
      .from("tournament_brackets")
      .update({
        score1: scores.score1,
        score2: scores.score2,
        winner_id: winnerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (error) throw error

    const { data: nextMatch } = await supabase
      .from("tournament_brackets")
      .select("*")
      .eq("tournament_id", match.tournament_id)
      .eq("round_number", match.round_number + 1)
      .eq("match_number", Math.ceil(match.match_number / 2))
      .single()

    if (nextMatch) {
      const updateField = match.match_number % 2 === 1 ? "participant1_id" : "participant2_id"
      await supabase
        .from("tournament_brackets")
        .update({ [updateField]: winnerId })
        .eq("id", nextMatch.id)
    }

    const { data: finalMatch } = await supabase
      .from("tournament_brackets")
      .select("*")
      .eq("tournament_id", match.tournament_id)
      .order("round_number", { ascending: false })
      .limit(1)
      .single()

    if (finalMatch?.status === "completed") {
      await supabase
        .from("tournaments")
        .update({
          status: "completed",
          end_date: new Date().toISOString(),
        })
        .eq("id", match.tournament_id)

      await supabase.from("tournament_participants").update({ status: "winner" }).eq("id", finalMatch.winner_id)
    }
  },
}
