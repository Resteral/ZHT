import { createClient } from "@/lib/supabase/client"

export interface PlayerAnalytics {
  id: string
  match_id: string
  user_id: string
  kills: number
  deaths: number
  assists: number
  damage_dealt: number
  damage_taken: number
  healing_done: number
  accuracy: number
  score: number
  created_at: string
  updated_at: string
}

export interface TeamAnalytics {
  id: string
  match_id: string
  team_name: string
  total_kills: number
  total_deaths: number
  total_damage: number
  total_healing: number
  team_score: number
  created_at: string
  updated_at: string
}

export interface MatchAnalytics {
  id: string
  match_id: string
  duration_seconds: number | null
  total_kills: number
  total_damage: number
  mvp_user_id: string | null
  csv_data: string | null
  created_at: string
  updated_at: string
}

export interface CSVPlayerStats {
  id: string
  user?: { id: string; username: string; elo_rating: number } | null
  steals: number
  goals: number
  assists: number
  points: number // goals + assists
  shots: number
  shootingPercentage: number
  pickups: number
  passes: number
  passesReceived: number
  savePercentage: number
  shotsOnGoalie: number
  shotsSaved: number
  goalieMinutes: number
  skaterMinutes: number
  gamesPlayed: number
}

export class AnalyticsService {
  private supabase = createClient()

  async getPlayerAnalytics(matchId: string): Promise<PlayerAnalytics[]> {
    const { data, error } = await this.supabase
      .from("player_analytics")
      .select("*")
      .eq("match_id", matchId)
      .order("score", { ascending: false })

    if (error) {
      console.error("Error fetching player analytics:", error)
      return []
    }

    return data || []
  }

  async getTeamAnalytics(matchId: string): Promise<TeamAnalytics[]> {
    const { data, error } = await this.supabase
      .from("team_analytics")
      .select("*")
      .eq("match_id", matchId)
      .order("total_kills", { ascending: false })

    if (error) {
      console.error("Error fetching team analytics:", error)
      return []
    }

    return data || []
  }

  async getMatchAnalytics(matchId: string): Promise<MatchAnalytics | null> {
    console.log("[v0] match_analytics table doesn't exist, returning null for match:", matchId)
    return null
  }

  async getPlayerStats(userId: string, limit = 10): Promise<PlayerAnalytics[]> {
    const { data, error } = await this.supabase
      .from("player_analytics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching player stats:", error)
      return []
    }

    return data || []
  }

  async getTopPerformers(limit = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("player_analytics")
      .select(`
        *,
        users(username, elo_rating)
      `)
      .order("score", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching top performers:", error)
      // Fallback: get player analytics without user data if relationship fails
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from("player_analytics")
        .select("*")
        .order("score", { ascending: false })
        .limit(limit)

      if (fallbackError) {
        console.error("Error fetching fallback top performers:", fallbackError)
        return []
      }

      return fallbackData || []
    }

    return data || []
  }

  async getTopPerformersWithUsers(limit = 10): Promise<any[]> {
    // First get the top performers
    const { data: analytics, error: analyticsError } = await this.supabase
      .from("player_analytics")
      .select("*")
      .order("score", { ascending: false })
      .limit(limit)

    if (analyticsError) {
      console.error("Error fetching player analytics:", analyticsError)
      return []
    }

    if (!analytics || analytics.length === 0) {
      return []
    }

    // Get unique user IDs
    const userIds = [...new Set(analytics.map((a) => a.user_id))]

    // Fetch user data
    const { data: users, error: usersError } = await this.supabase
      .from("users")
      .select("id, username, elo_rating")
      .in("id", userIds)

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return analytics // Return analytics without user data
    }

    // Combine analytics with user data
    const usersMap = new Map(users?.map((u) => [u.id, u]) || [])

    return analytics.map((analytic) => ({
      ...analytic,
      user: usersMap.get(analytic.user_id) || null,
    }))
  }

  async getMatchesWithAnalytics(limit = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("matches")
      .select(`
        *,
        match_results!match_results_match_id_fkey(team1_score, team2_score, winning_team, validated_at)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching matches with analytics:", error)
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (fallbackError) {
        console.error("Error fetching fallback matches:", fallbackError)
        return []
      }

      return (fallbackData || []).map((match) => ({
        ...match,
        team1_score: 0,
        team2_score: 0,
        winning_team: null,
        total_goals: 0,
        total_assists: 0,
        total_saves: 0,
        avg_elo: 0,
        all_players: [],
      }))
    }

    return (data || []).map((match) => ({
      ...match,
      team1_score: match.match_results?.[0]?.team1_score || 0,
      team2_score: match.match_results?.[0]?.team2_score || 0,
      winning_team: match.match_results?.[0]?.winning_team || null,
      total_goals: 0, // Could be calculated from player_analytics.kills if needed
      total_assists: 0,
      total_saves: 0,
      avg_elo: 0,
      all_players: [],
    }))
  }

  async calculatePlayerAverages(userId: string): Promise<{
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgDamage: number
    avgHealing: number
    avgAccuracy: number
    avgScore: number
    totalMatches: number
  }> {
    const stats = await this.getPlayerStats(userId, 100) // Get more for better averages

    if (stats.length === 0) {
      return {
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        avgDamage: 0,
        avgHealing: 0,
        avgAccuracy: 0,
        avgScore: 0,
        totalMatches: 0,
      }
    }

    const totals = stats.reduce(
      (acc, stat) => ({
        kills: acc.kills + stat.kills,
        deaths: acc.deaths + stat.deaths,
        assists: acc.assists + stat.assists,
        damage: acc.damage + stat.damage_dealt,
        healing: acc.healing + stat.healing_done,
        accuracy: acc.accuracy + stat.accuracy,
        score: acc.score + stat.score,
      }),
      { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0, accuracy: 0, score: 0 },
    )

    const count = stats.length

    return {
      avgKills: Math.round((totals.kills / count) * 100) / 100,
      avgDeaths: Math.round((totals.deaths / count) * 100) / 100,
      avgAssists: Math.round((totals.assists / count) * 100) / 100,
      avgDamage: Math.round(totals.damage / count),
      avgHealing: Math.round(totals.healing / count),
      avgAccuracy: Math.round((totals.accuracy / count) * 100) / 100,
      avgScore: Math.round(totals.score / count),
      totalMatches: count,
    }
  }

  async storePlayerAnalytics(analytics: Omit<PlayerAnalytics, "id" | "created_at" | "updated_at">): Promise<boolean> {
    const { error } = await this.supabase.from("player_analytics").insert(analytics)

    if (error) {
      console.error("Error storing player analytics:", error)
      return false
    }

    return true
  }

  async storeTeamAnalytics(analytics: Omit<TeamAnalytics, "id" | "created_at" | "updated_at">): Promise<boolean> {
    const { error } = await this.supabase.from("team_analytics").insert(analytics)

    if (error) {
      console.error("Error storing team analytics:", error)
      return false
    }

    return true
  }

  async storeMatchAnalytics(analytics: Omit<MatchAnalytics, "id" | "created_at" | "updated_at">): Promise<boolean> {
    console.log("[v0] match_analytics table doesn't exist, cannot store analytics for match:", analytics.match_id)
    return false
  }

  async getEloHistory(userId: string, limit = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("elo_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching ELO history:", error)
      return []
    }

    return data || []
  }

  async getEloDistribution(): Promise<{ eloRange: string; count: number }[]> {
    const { data, error } = await this.supabase.from("users").select("elo_rating").not("elo_rating", "is", null)

    if (error) {
      console.error("Error fetching ELO distribution:", error)
      return []
    }

    // Group ELO ratings into ranges
    const ranges = [
      { min: 0, max: 999, label: "0-999" },
      { min: 1000, max: 1199, label: "1000-1199" },
      { min: 1200, max: 1399, label: "1200-1399" },
      { min: 1400, max: 1599, label: "1400-1599" },
      { min: 1600, max: 1799, label: "1600-1799" },
      { min: 1800, max: 2000, label: "1800+" },
    ]

    return ranges.map((range) => ({
      eloRange: range.label,
      count:
        data?.filter((user) => {
          const elo = user.elo_rating || 0
          return range.label === "1800+" ? elo >= 1800 : elo >= range.min && elo <= range.max
        }).length || 0,
    }))
  }

  async getTopEloPlayers(limit = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("users")
      .select("id, username, elo_rating")
      .not("elo_rating", "is", null)
      .order("elo_rating", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching top ELO players:", error)
      return []
    }

    return data || []
  }

  async getOverallStats(): Promise<{
    totalMatches: number
    totalPlayers: number
    avgEloRating: number
    totalKills: number
    totalDamage: number
    mostActivePlayer: string | null
  }> {
    // Get total matches
    const { count: matchCount } = await this.supabase.from("matches").select("*", { count: "exact", head: true })

    // Get total players
    const { count: playerCount } = await this.supabase.from("users").select("*", { count: "exact", head: true })

    // Get average ELO
    const { data: eloData } = await this.supabase.from("users").select("elo_rating").not("elo_rating", "is", null)

    const avgElo = eloData?.length
      ? Math.round(eloData.reduce((sum, user) => sum + (user.elo_rating || 0), 0) / eloData.length)
      : 0

    // Get total kills and damage from analytics
    const { data: analyticsData } = await this.supabase.from("player_analytics").select("kills, damage_dealt, user_id")

    const totalKills = analyticsData?.reduce((sum, stat) => sum + stat.kills, 0) || 0
    const totalDamage = analyticsData?.reduce((sum, stat) => sum + stat.damage_dealt, 0) || 0

    // Find most active player (most matches played)
    const userMatchCounts =
      analyticsData?.reduce(
        (acc, stat) => {
          acc[stat.user_id] = (acc[stat.user_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    const mostActiveUserId = Object.entries(userMatchCounts).sort(([, a], [, b]) => b - a)[0]?.[0]

    let mostActivePlayer = null
    if (mostActiveUserId) {
      const { data: userData } = await this.supabase
        .from("users")
        .select("username")
        .eq("id", mostActiveUserId)
        .single()

      mostActivePlayer = userData?.username || null
    }

    return {
      totalMatches: matchCount || 0,
      totalPlayers: playerCount || 0,
      avgEloRating: avgElo,
      totalKills,
      totalDamage,
      mostActivePlayer,
    }
  }

  async getPlayerWinRate(userId: string): Promise<{ wins: number; losses: number; winRate: number }> {
    // Get all matches for this player
    const { data: participations } = await this.supabase
      .from("match_participants")
      .select(`
        match_id,
        matches(status, winner_team)
      `)
      .eq("user_id", userId)

    if (!participations) {
      return { wins: 0, losses: 0, winRate: 0 }
    }

    const completedMatches = participations.filter((p) => p.matches && p.matches.status === "completed")

    // For now, assume 50% win rate since we don't have team assignment logic
    // This would need to be enhanced based on actual team/winner logic
    const totalMatches = completedMatches.length
    const wins = Math.floor(totalMatches * 0.5) // Placeholder logic
    const losses = totalMatches - wins
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

    return { wins, losses, winRate }
  }

  async getPlayerGamesPlayed(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("match_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching games played:", error)
      return 0
    }

    return count || 0
  }

  async getPlayerPerGameStats(userId: string): Promise<{
    gamesPlayed: number
    killsPerGame: number
    deathsPerGame: number
    assistsPerGame: number
    damagePerGame: number
    healingPerGame: number
    accuracyPerGame: number
    scorePerGame: number
    kdr: number
    kda: number
  }> {
    const gamesPlayed = await this.getPlayerGamesPlayed(userId)
    const stats = await this.getPlayerStats(userId, 1000) // Get all stats

    if (stats.length === 0 || gamesPlayed === 0) {
      return {
        gamesPlayed: 0,
        killsPerGame: 0,
        deathsPerGame: 0,
        assistsPerGame: 0,
        damagePerGame: 0,
        healingPerGame: 0,
        accuracyPerGame: 0,
        scorePerGame: 0,
        kdr: 0,
        kda: 0,
      }
    }

    const totals = stats.reduce(
      (acc, stat) => ({
        kills: acc.kills + stat.kills,
        deaths: acc.deaths + stat.deaths,
        assists: acc.assists + stat.assists,
        damage: acc.damage + stat.damage_dealt,
        healing: acc.healing + stat.healing_done,
        accuracy: acc.accuracy + stat.accuracy,
        score: acc.score + stat.score,
      }),
      { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0, accuracy: 0, score: 0 },
    )

    const killsPerGame = Math.round((totals.kills / gamesPlayed) * 100) / 100
    const deathsPerGame = Math.round((totals.deaths / gamesPlayed) * 100) / 100
    const assistsPerGame = Math.round((totals.assists / gamesPlayed) * 100) / 100
    const kdr = deathsPerGame > 0 ? Math.round((killsPerGame / deathsPerGame) * 100) / 100 : killsPerGame
    const kda =
      deathsPerGame > 0
        ? Math.round(((killsPerGame + assistsPerGame) / deathsPerGame) * 100) / 100
        : killsPerGame + assistsPerGame

    return {
      gamesPlayed,
      killsPerGame,
      deathsPerGame,
      assistsPerGame,
      damagePerGame: Math.round(totals.damage / gamesPlayed),
      healingPerGame: Math.round(totals.healing / gamesPlayed),
      accuracyPerGame: Math.round((totals.accuracy / gamesPlayed) * 100) / 100,
      scorePerGame: Math.round(totals.score / gamesPlayed),
      kdr,
      kda,
    }
  }

  async getAllPlayersPerGameStats(limit = 50): Promise<any[]> {
    // Get all users with ELO ratings
    const { data: users, error: usersError } = await this.supabase
      .from("users")
      .select("id, username, elo_rating")
      .not("elo_rating", "is", null)
      .order("elo_rating", { ascending: false })
      .limit(limit)

    if (usersError || !users) {
      console.error("Error fetching users:", usersError)
      return []
    }

    // Get per-game stats for each user
    const playersWithStats = await Promise.all(
      users.map(async (user) => {
        const perGameStats = await this.getPlayerPerGameStats(user.id)
        return {
          ...user,
          ...perGameStats,
        }
      }),
    )

    // Filter out players with no games played and sort by games played
    return playersWithStats.filter((player) => player.gamesPlayed > 0).sort((a, b) => b.gamesPlayed - a.gamesPlayed)
  }

  async getLeaderboards(): Promise<{
    mostGamesPlayed: any[]
    highestKDR: any[]
    highestKDA: any[]
    mostKillsPerGame: any[]
    mostDamagePerGame: any[]
  }> {
    const allStats = await this.getAllPlayersPerGameStats(100)

    return {
      mostGamesPlayed: allStats.slice(0, 10),
      highestKDR: [...allStats].sort((a, b) => b.kdr - a.kdr).slice(0, 10),
      highestKDA: [...allStats].sort((a, b) => b.kda - a.kda).slice(0, 10),
      mostKillsPerGame: [...allStats].sort((a, b) => b.killsPerGame - a.killsPerGame).slice(0, 10),
      mostDamagePerGame: [...allStats].sort((a, b) => b.damagePerGame - a.damagePerGame).slice(0, 10),
    }
  }

  private parseCSVData(csvData: string): any[] {
    if (!csvData || csvData.trim() === "") return []

    try {
      const lines = csvData.trim().split("\n")
      if (lines.length < 2) return []

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
      const data = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",")
        const row: any = {}

        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ""

          // Map CSV headers to our expected fields
          switch (header) {
            case "id":
            case "player_id":
            case "user_id":
              row.csvId = value
              row.id = value
              break
            case "name":
            case "username":
            case "player_name":
              row.displayName = value
              break
            case "steals":
              row.steals = Number.parseInt(value) || 0
              break
            case "goals":
              row.goals = Number.parseInt(value) || 0
              break
            case "assists":
              row.assists = Number.parseInt(value) || 0
              break
            case "shots":
              row.shots = Number.parseInt(value) || 0
              break
            case "shooting %":
            case "shooting_percentage":
              row.shootingPercentage = Number.parseFloat(value.replace("%", "")) || 0
              break
            case "pickups":
              row.pickups = Number.parseInt(value) || 0
              break
            case "passes":
              row.passes = Number.parseInt(value) || 0
              break
            case "pass received":
            case "passes_received":
              row.passesReceived = Number.parseInt(value) || 0
              break
            case "save %":
            case "save_percentage":
              row.savePercentage = Number.parseFloat(value.replace("%", "")) || 0
              break
            case "shots on goalie":
            case "shots_on_goalie":
              row.shotsOnGoalie = Number.parseInt(value) || 0
              break
            case "shots saved":
            case "shots_saved":
              row.shotsSaved = Number.parseInt(value) || 0
              break
            case "goalie (minutes)":
            case "goalie_minutes":
              row.goalieMinutes = Number.parseInt(value) || 0
              break
            case "skater (minutes)":
            case "skater_minutes":
              row.skaterMinutes = Number.parseInt(value) || 0
              break
          }
        })

        // Calculate points (goals + assists)
        row.points = (row.goals || 0) + (row.assists || 0)

        if (row.id) {
          data.push(row)
        }
      }

      return data
    } catch (error) {
      console.error("Error parsing CSV data:", error)
      return []
    }
  }

  async getAllCSVData(): Promise<any[]> {
    console.log("[v0] match_analytics table doesn't exist, cannot fetch CSV data")
    return []
  }

  async getStackedCSVStats(): Promise<CSVPlayerStats[]> {
    return []
  }

  async getPlayerStackedCSVStats(csvId: string): Promise<CSVPlayerStats | null> {
    return null
  }

  async getCSVLeaderboards(): Promise<{
    topScorers: CSVPlayerStats[]
    topGoalScorers: CSVPlayerStats[]
    topAssists: CSVPlayerStats[]
    mostGamesPlayed: CSVPlayerStats[]
    bestShootingPercentage: CSVPlayerStats[]
    mostSteals: CSVPlayerStats[]
  }> {
    return {
      topScorers: [],
      topGoalScorers: [],
      topAssists: [],
      mostGamesPlayed: [],
      bestShootingPercentage: [],
      mostSteals: [],
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
