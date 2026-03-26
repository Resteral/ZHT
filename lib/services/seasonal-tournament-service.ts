import { createClient } from "@/lib/supabase/client"

export interface SeasonalTournament {
  id: string
  name: string
  description: string
  tournament_type: string
  start_date: string
  end_date: string
  status: "upcoming" | "registration" | "active" | "completed" | "cancelled"
  max_participants: number
  entry_fee: number
  prize_pool: number
  created_by: string
  created_at: string
  updated_at: string
  player_pool_settings: any
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
        .from("tournaments")
        .select("*")
        .eq("tournament_type", "seasonal_elo_league")
        .eq("status", "active")
        .single()

      if (error && error.code !== "PGRST116") {
        // If no active season found, try to create a new one
        if (error.code === "PGRST116") {
          return await this.createNewSeason()
        }
        throw error
      }
      return data
    } catch (error) {
      console.error("Error fetching current season:", error)
      return null
    }
  }

  private async createNewSeason(): Promise<SeasonalTournament | null> {
    try {
      const now = new Date()
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from now

      const { data, error } = await this.supabase
        .from("tournaments")
        .insert({
          name: `ELO League Season ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          description: "3-month competitive ELO league with division-based rankings and rewards",
          tournament_type: "seasonal_elo_league",
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
          max_participants: 10000,
          entry_fee: 0,
          prize_pool: 5000,
          created_by: "00000000-0000-0000-0000-000000000000", // System user
          player_pool_settings: {
            divisions: {
              premier: { min_elo: 1800, max_participants: 100 },
              championship: { min_elo: 1600, max_participants: 500 },
              league_one: { min_elo: 1400, max_participants: 1000 },
              league_two: { min_elo: 0, max_participants: 8400 },
            },
          },
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating new season:", error)
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

      const { error } = await this.supabase.from("tournament_participants").insert({
        tournament_id: seasonId,
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
      })

      if (error && error.code !== "23505") throw error // Ignore duplicate key errors

      return true
    } catch (error) {
      console.error("Error joining season:", error)
      return false
    }
  }

  async getSeasonalLeaderboard(seasonId: string, division?: string, limit = 100): Promise<SeasonalLeaderboard[]> {
    try {
      const query = this.supabase
        .from("tournament_participants")
        .select(`
          *,
          users!inner(username, elo_rating, wins, losses, total_games)
        `)
        .eq("tournament_id", seasonId)
        .eq("status", "active")
        .order("users.elo_rating", { ascending: false })
        .limit(limit)

      const { data, error } = await query

      if (error) throw error

      // Convert to leaderboard format with ranks
      return (data || []).map((participant, index) => ({
        id: participant.id,
        seasonal_tournament_id: participant.tournament_id,
        user_id: participant.user_id,
        username: participant.users.username,
        division: this.getDivisionFromElo(participant.users.elo_rating),
        rank: index + 1,
        elo_rating: participant.users.elo_rating,
        seasonal_points: participant.users.elo_rating, // Use ELO as seasonal points for now
        matches_played: participant.users.total_games || 0,
        win_rate:
          participant.users.total_games > 0 ? (participant.users.wins / participant.users.total_games) * 100 : 0,
        elo_change_from_start: 0, // Would need historical data
        weekly_elo_change: 0,
        streak_type: null,
        current_streak: 0,
        best_streak: 0,
        updated_at: participant.joined_at,
      }))
    } catch (error) {
      console.error("Error fetching seasonal leaderboard:", error)
      return []
    }
  }

  async getUserSeasonalStats(seasonId: string, userId: string): Promise<SeasonalParticipant | null> {
    try {
      // Get user's current ELO
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("username, elo_rating")
        .eq("id", userId)
        .single()

      if (userError) throw userError

      const currentDivision = this.getDivisionFromElo(user.elo_rating)

      const { error } = await this.supabase.from("tournament_participants").insert({
        tournament_id: seasonId,
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
      })

      if (error && error.code !== "23505") throw error // Ignore duplicate key errors

      return true
    } catch (error) {
      console.error("Error joining season:", error)
      return false
    }
  }

  async getUserSeasonalStats(seasonId: string, userId: string): Promise<SeasonalParticipant | null> {
    try {
      const { data, error } = await this.supabase
        .from("tournament_participants")
        .select(`
          *,
          users!inner(username, elo_rating, wins, losses, total_games)
        `)
        .eq("tournament_id", seasonId)
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (!data) return null

      return {
        id: data.id,
        seasonal_tournament_id: data.tournament_id,
        user_id: data.user_id,
        username: data.users.username,
        starting_elo: data.users.elo_rating, // Would need historical data for actual starting ELO
        current_elo: data.users.elo_rating,
        peak_elo: data.users.elo_rating,
        lowest_elo: data.users.elo_rating,
        total_matches_played: data.users.total_games || 0,
        total_wins: data.users.wins || 0,
        total_losses: data.users.losses || 0,
        seasonal_points: data.users.elo_rating,
        current_division: this.getDivisionFromElo(data.users.elo_rating),
        highest_division_reached: this.getDivisionFromElo(data.users.elo_rating),
        current_rank: null,
        best_rank: null,
        lobby_stats: {},
        achievements: [],
        joined_at: data.joined_at,
        last_activity: data.joined_at,
      }
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
            .from("tournament_participants")
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
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", seasonId)

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
