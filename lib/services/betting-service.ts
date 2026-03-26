import { createClient } from "@/lib/supabase/server"

export interface BettingMarket {
  id: string
  game_id: string
  market_type: "moneyline" | "spread" | "total" | "player_prop"
  selection: string
  odds: number
  decimal_odds: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Bet {
  id: string
  user_id: string
  market_id: string
  bet_type: string
  stake_amount: number
  odds: number
  potential_payout: number
  status: "pending" | "won" | "lost" | "cancelled"
  placed_at: string
  settled_at?: string
}

export class BettingService {
  private async getSupabase() {
    return await createClient()
  }

  async getActiveMarkets(gameId?: string) {
    const supabase = await this.getSupabase()
    let query = supabase
      .from("betting_markets")
      .select(`
        *,
        games (
          home_team_id,
          away_team_id,
          scheduled_time,
          status,
          teams!games_home_team_id_fkey (
            id,
            name,
            logo_url
          ),
          away_teams:teams!games_away_team_id_fkey (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (gameId) {
      query = query.eq("game_id", gameId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async placeBet(userId: string, marketId: string, selection: string, odds: number, stake: number) {
    const supabase = await this.getSupabase()
    const potentialPayout = stake * (odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1)

    const { data: user, error: userError } = await supabase.from("users").select("balance").eq("id", userId).single()

    if (userError) throw userError
    if (!user || (user.balance || 0) < stake) {
      throw new Error(
        `Insufficient balance. Available: $${(user?.balance || 0).toFixed(2)}, Required: $${stake.toFixed(2)}`,
      )
    }

    const { data: bet, error: betError } = await supabase
      .from("bets")
      .insert({
        user_id: userId,
        market_id: marketId,
        bet_type: selection,
        selection: selection, // Store in both columns for compatibility
        stake_amount: stake,
        stake: stake, // Store in both columns for compatibility
        odds,
        potential_payout: potentialPayout,
        status: "pending",
        placed_at: new Date().toISOString(),
        created_at: new Date().toISOString(), // Add created_at for compatibility
      })
      .select()
      .single()

    if (betError) {
      console.error("Error creating bet:", betError)
      throw new Error(`Failed to place bet: ${betError.message}`)
    }

    const { error: balanceError } = await supabase
      .from("users")
      .update({ balance: (user.balance || 0) - stake })
      .eq("id", userId)

    if (balanceError) {
      console.error("Error updating balance:", balanceError)
      // Try to rollback the bet if balance update fails
      await supabase.from("bets").delete().eq("id", bet.id)
      throw new Error("Failed to update balance")
    }

    return bet
  }

  async getUserBets(userId: string, status?: string) {
    const supabase = await this.getSupabase()
    let query = supabase
      .from("bets")
      .select(`
        *,
        betting_markets (
          *,
          games (
            *,
            teams!games_home_team_id_fkey (
              id,
              name,
              logo_url
            ),
            away_teams:teams!games_away_team_id_fkey (
              id,
              name,
              logo_url
            )
          )
        )
      `)
      .eq("user_id", userId)
      .order("placed_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async settleBet(betId: string, result: "won" | "lost") {
    const supabase = await this.getSupabase()
    const { data: bet, error: betError } = await supabase.from("bets").select("*").eq("id", betId).single()

    if (betError) throw betError
    if (!bet || bet.status !== "pending") {
      throw new Error("Bet not found or already settled")
    }

    // Update bet status
    const { error: updateError } = await supabase
      .from("bets")
      .update({
        status: result,
        settled_at: new Date().toISOString(),
      })
      .eq("id", betId)

    if (updateError) throw updateError

    // If won, add payout to user balance
    if (result === "won") {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", bet.user_id)
        .single()

      if (userError) throw userError

      const { error: balanceError } = await supabase
        .from("users")
        .update({ balance: (user.balance || 0) + bet.potential_payout })
        .eq("id", bet.user_id)

      if (balanceError) throw balanceError
    }

    return bet
  }

  async getBettingStats(userId: string) {
    const supabase = await this.getSupabase()
    const { data: bets, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled")

    if (error) throw error

    const totalBets = bets?.length || 0
    const wonBets = bets?.filter((bet) => bet.status === "won").length || 0
    const lostBets = bets?.filter((bet) => bet.status === "lost").length || 0
    const pendingBets = bets?.filter((bet) => bet.status === "pending").length || 0

    const totalWagered = bets?.reduce((sum, bet) => sum + bet.stake_amount, 0) || 0
    const totalWon =
      bets?.filter((bet) => bet.status === "won").reduce((sum, bet) => sum + bet.potential_payout, 0) || 0
    const totalLost = bets?.filter((bet) => bet.status === "lost").reduce((sum, bet) => sum + bet.stake_amount, 0) || 0

    const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0
    const netProfit = totalWon - totalLost

    return {
      totalBets,
      wonBets,
      lostBets,
      pendingBets,
      totalWagered,
      totalWon,
      totalLost,
      winRate,
      netProfit,
    }
  }

  async updateOdds(marketId: string, newOdds: number) {
    const supabase = await this.getSupabase()
    const decimalOdds = newOdds > 0 ? newOdds / 100 + 1 : 100 / Math.abs(newOdds) + 1

    const { data, error } = await supabase
      .from("betting_markets")
      .update({
        odds: newOdds,
        decimal_odds: decimalOdds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", marketId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const bettingService = new BettingService()
