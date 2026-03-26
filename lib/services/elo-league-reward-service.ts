import { createClient } from "@/lib/supabase/client"

export interface EloLeagueReward {
  reward_id: string
  season_name: string
  division: string
  final_rank: number
  trophy_title: string
  trophy_description: string
  trophy_icon: string
  trophy_rarity: string
  monetary_reward: number
  achievement_points: number
  awarded_at: string
  status: string
}

export interface EloLeagueRewardTier {
  id: string
  tier_name: string
  division: string
  rank_min: number
  rank_max: number
  monetary_reward: number
  achievement_points: number
  trophy_type: string
  trophy_title: string
  trophy_description: string
  trophy_icon: string
  trophy_rarity: string
}

class EloLeagueRewardService {
  private supabase = createClient()

  async getUserRewards(userId: string): Promise<EloLeagueReward[]> {
    try {
      const { data, error } = await this.supabase.rpc("get_user_elo_league_rewards", {
        user_id_param: userId,
      })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching user ELO league rewards:", error)
      return []
    }
  }

  async claimReward(rewardId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc("claim_elo_league_reward", {
        reward_id_param: rewardId,
        user_id_param: userId,
      })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error("Error claiming ELO league reward:", error)
      return false
    }
  }

  async getRewardTiers(): Promise<EloLeagueRewardTier[]> {
    try {
      const { data, error } = await this.supabase
        .from("elo_league_reward_tiers")
        .select("*")
        .order("division")
        .order("rank_min")

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching reward tiers:", error)
      return []
    }
  }

  async distributeSeasonRewards(seasonalTournamentId: string): Promise<void> {
    try {
      console.log("[v0] Distributing ELO league rewards for season:", seasonalTournamentId)

      const { error } = await this.supabase.rpc("distribute_elo_league_rewards", {
        seasonal_tournament_id_param: seasonalTournamentId,
      })

      if (error) throw error

      console.log("[v0] ELO league rewards distributed successfully")
    } catch (error) {
      console.error("Error distributing season rewards:", error)
      throw error
    }
  }

  async getSeasonRewardsSummary(seasonalTournamentId: string) {
    try {
      const { data, error } = await this.supabase
        .from("elo_league_reward_history")
        .select(`
          division,
          tier_name,
          monetary_reward,
          achievement_points,
          trophy_rarity,
          status
        `)
        .eq("seasonal_tournament_id", seasonalTournamentId)

      if (error) throw error

      const summary = {
        total_rewards: data?.length || 0,
        total_monetary: data?.reduce((sum, r) => sum + r.monetary_reward, 0) || 0,
        total_points: data?.reduce((sum, r) => sum + r.achievement_points, 0) || 0,
        by_division: {} as Record<string, number>,
        by_rarity: {} as Record<string, number>,
        claimed_count: data?.filter((r) => r.status === "claimed").length || 0,
        pending_count: data?.filter((r) => r.status === "pending").length || 0,
      }

      data?.forEach((reward) => {
        summary.by_division[reward.division] = (summary.by_division[reward.division] || 0) + 1
        summary.by_rarity[reward.trophy_rarity] = (summary.by_rarity[reward.trophy_rarity] || 0) + 1
      })

      return summary
    } catch (error) {
      console.error("Error getting season rewards summary:", error)
      return null
    }
  }
}

export const eloLeagueRewardService = new EloLeagueRewardService()
