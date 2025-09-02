import { createClient } from "@/lib/supabase/client"

export interface SeasonalTournament {
  id: string
  name: string
  season_number: number
  start_date: string
  end_date: string
  status: "upcoming" | "registration" | "active" | "completed" | "cancelled"
  registration_start: string
  registration_end: string
  total_prize_pool: number
  max_participants: number
  current_participants: number
  elo_cutoff_minimum: number
  season_type: "standard" | "championship" | "special"
  division_settings: any
  lobby_integration_settings: any
  created_at: string
  updated_at: string
}

export interface SeasonalParticipant {
  id: string
  seasonal_tournament_id: string
  user_id: string
  username: string
  starting_elo: number
  current_elo: number
  peak_elo: number
  lowest_elo: number
  total_matches_played: number
  total_wins: number
  total_losses: number
  seasonal_points: number
  current_division: "premier" | "championship" | "league_one" | "league_two"
  highest_division_reached: "premier" | "championship" | "league_one" | "league_two"
  current_rank: number | null
  best_rank: number | null
  lobby_stats: any
  achievements: any[]
  joined_at: string
  last_activity: string
}

export interface SeasonalLeaderboard {
  id: string
  seasonal_tournament_id: string
  user_id: string
  username: string
  division: "premier" | "championship" | "league_one" | "league_two"
  rank: number
  elo_rating: number
  seasonal_points: number
  matches_played: number
  win_rate: number
  elo_change_from_start: number
  weekly_elo_change: number
  streak_type: "win" | "loss" | null
  current_streak: number
  best_streak: number
  updated_at: string
}

export interface SeasonalAchievement {
  id: string
  name: string
  description: string
  achievement_type: "elo" | "matches" | "streak" | "division" | "special"
  requirements: any
  reward_points: number
  reward_description: string
  icon: string
  rarity: "common" | "rare" | "epic" | "legendary"
  is_active: boolean
  created_at: string
}

class SeasonalTournamentService {
  private supabase = createClient()

  async getCurrentSeason(): Promise<SeasonalTournament | null> {
    try {
      const { data, error } = await this.supabase
        .from("seasonal_tournaments")
        .select("*")
        .eq("status", "active")
        .single()

      if (error && error.code !== "PGRST116") throw error
      return data
    } catch (error) {
      console.error("Error fetching current season:", error)
      return null
    }
  }

  async joinSeason(seasonId: string, userId: string): Promise<boolean> {
    try {
      // Get user's current ELO
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("username, elo_rating")
        .eq("id", userId)
        .single()

      if (userError) throw userError

      const currentDivision = this.getDivisionFromElo(user.elo_rating)

      const { error } = await this.supabase.from("seasonal_tournament_participants").insert({
        seasonal_tournament_id: seasonId,
        user_id: userId,
        username: user.username,
        starting_elo: user.elo_rating,
        current_elo: user.elo_rating,
        peak_elo: user.elo_rating,
        lowest_elo: user.elo_rating,
        current_division: currentDivision,
        highest_division_reached: currentDivision,
      })

      if (error && error.code !== "23505") throw error // Ignore duplicate key errors

      // Update participant count
      await this.supabase.rpc("increment_seasonal_participants", { season_id: seasonId })

      return true
    } catch (error) {
      console.error("Error joining season:", error)
      return false
    }
  }

  async getSeasonalLeaderboard(seasonId: string, division?: string, limit = 100): Promise<SeasonalLeaderboard[]> {
    try {
      let query = this.supabase
        .from("seasonal_tournament_participants")
        .select("*")
        .eq("seasonal_tournament_id", seasonId)
        .order("seasonal_points", { ascending: false })
        .order("current_elo", { ascending: false })
        .limit(limit)

      if (division) {
        query = query.eq("current_division", division)
      }

      const { data, error } = await query

      if (error) throw error

      // Convert to leaderboard format with ranks
      return (data || []).map((participant, index) => ({
        id: participant.id,
        seasonal_tournament_id: participant.seasonal_tournament_id,
        user_id: participant.user_id,
        username: participant.username,
        division: participant.current_division,
        rank: index + 1,
        elo_rating: participant.current_elo,
        seasonal_points: participant.seasonal_points,
        matches_played: participant.total_matches_played,
        win_rate:
          participant.total_matches_played > 0 ? (participant.total_wins / participant.total_matches_played) * 100 : 0,
        elo_change_from_start: participant.current_elo - participant.starting_elo,
        weekly_elo_change: 0, // Would be calculated from recent matches
        streak_type: null, // Would be calculated from recent matches
        current_streak: 0, // Would be calculated from recent matches
        best_streak: 0, // Would be calculated from match history
        updated_at: participant.last_activity,
      }))
    } catch (error) {
      console.error("Error fetching seasonal leaderboard:", error)
      return []
    }
  }

  async getUserSeasonalStats(seasonId: string, userId: string): Promise<SeasonalParticipant | null> {
    try {
      const { data, error } = await this.supabase
        .from("seasonal_tournament_participants")
        .select("*")
        .eq("seasonal_tournament_id", seasonId)
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116") throw error
      return data
    } catch (error) {
      console.error("Error fetching user seasonal stats:", error)
      return null
    }
  }

  async getSeasonalAchievements(): Promise<SeasonalAchievement[]> {
    try {
      const { data, error } = await this.supabase
        .from("seasonal_achievements")
        .select("*")
        .eq("is_active", true)
        .order("rarity", { ascending: false })
        .order("reward_points", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching seasonal achievements:", error)
      return []
    }
  }

  async checkAndAwardAchievements(userId: string, seasonId: string): Promise<string[]> {
    try {
      const participant = await this.getUserSeasonalStats(seasonId, userId)
      if (!participant) return []

      const achievements = await this.getSeasonalAchievements()
      const newAchievements: string[] = []

      for (const achievement of achievements) {
        // Check if user already has this achievement
        if (participant.achievements.some((a: any) => a.id === achievement.id)) {
          continue
        }

        // Check if user meets requirements
        const meetsRequirements = this.checkAchievementRequirements(achievement, participant)

        if (meetsRequirements) {
          // Award achievement
          const updatedAchievements = [
            ...participant.achievements,
            {
              id: achievement.id,
              name: achievement.name,
              awarded_at: new Date().toISOString(),
              points_earned: achievement.reward_points,
            },
          ]

          await this.supabase
            .from("seasonal_tournament_participants")
            .update({
              achievements: updatedAchievements,
              seasonal_points: participant.seasonal_points + achievement.reward_points,
            })
            .eq("id", participant.id)

          newAchievements.push(achievement.name)
        }
      }

      return newAchievements
    } catch (error) {
      console.error("Error checking achievements:", error)
      return []
    }
  }

  private checkAchievementRequirements(achievement: SeasonalAchievement, participant: SeasonalParticipant): boolean {
    const req = achievement.requirements

    switch (achievement.achievement_type) {
      case "elo":
        return participant.current_elo - participant.starting_elo >= req.elo_gain
      case "matches":
        return participant.total_matches_played >= req.matches_played
      case "division":
        if (req.promotion) {
          return participant.current_division !== participant.highest_division_reached
        }
        if (req.division) {
          return participant.current_division === req.division
        }
        return false
      case "special":
        if (req.all_formats) {
          const stats = participant.lobby_stats
          return Object.keys(stats).every((format) => stats[format].won > 0)
        }
        return false
      default:
        return false
    }
  }

  private getDivisionFromElo(elo: number): "premier" | "championship" | "league_one" | "league_two" {
    if (elo >= 1800) return "premier"
    if (elo >= 1600) return "championship"
    if (elo >= 1400) return "league_one"
    return "league_two"
  }

  async getSeasonalStats(seasonId: string) {
    try {
      const { data: participants, error } = await this.supabase
        .from("seasonal_tournament_participants")
        .select("*")
        .eq("seasonal_tournament_id", seasonId)

      if (error) throw error

      const totalParticipants = participants?.length || 0
      const totalMatches = participants?.reduce((sum, p) => sum + p.total_matches_played, 0) || 0
      const averageElo = participants?.reduce((sum, p) => sum + p.current_elo, 0) / totalParticipants || 0

      const divisionCounts =
        participants?.reduce(
          (acc, p) => {
            acc[p.current_division] = (acc[p.current_division] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ) || {}

      return {
        total_participants: totalParticipants,
        total_matches: totalMatches,
        average_elo: Math.round(averageElo),
        division_distribution: {
          premier: divisionCounts.premier || 0,
          championship: divisionCounts.championship || 0,
          league_one: divisionCounts.league_one || 0,
          league_two: divisionCounts.league_two || 0,
        },
        top_performers: participants?.slice(0, 10) || [],
      }
    } catch (error) {
      console.error("Error fetching seasonal stats:", error)
      return null
    }
  }
}

export const seasonalTournamentService = new SeasonalTournamentService()
