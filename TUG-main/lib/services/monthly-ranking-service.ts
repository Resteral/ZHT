import { createClient } from "@/lib/supabase/client"

export interface MonthlyRanking {
  id: string
  user_id: string
  username: string
  elo_rating: number
  previous_elo: number
  elo_change: number
  monthly_points: number
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  rank: number
  previous_rank: number
  rank_change: number
  division: "premier" | "championship" | "league_one" | "league_two"
  previous_division: string
  promotion_status: "promoted" | "relegated" | "maintained" | null
  month: string
  year: number
  created_at: string
  updated_at: string
}

export interface MonthlyTournamentStats {
  total_players: number
  total_matches: number
  average_elo: number
  division_distribution: {
    premier: number
    championship: number
    league_one: number
    league_two: number
  }
  top_performers: MonthlyRanking[]
  biggest_climbers: MonthlyRanking[]
  promotion_relegation_summary: {
    promoted: number
    relegated: number
    maintained: number
  }
}

class MonthlyRankingService {
  private supabase = createClient()

  async generateMonthlyRankings(month?: string, year?: number): Promise<MonthlyRanking[]> {
    const currentDate = new Date()
    const targetMonth = month || currentDate.toLocaleString("default", { month: "long" })
    const targetYear = year || currentDate.getFullYear()

    try {
      // Get all users with their current ELO and match history for the month
      const { data: usersData, error: usersError } = await this.supabase
        .from("users")
        .select(`
          id,
          username,
          elo_rating,
          created_at,
          elo_history(
            old_rating,
            new_rating,
            change,
            created_at
          ),
          match_participants!match_participants_user_id_fkey(
            match_id,
            result,
            matches!inner(
              created_at,
              status
            )
          )
        `)
        .gte("elo_rating", 1200)
        .order("elo_rating", { ascending: false })

      if (usersError) throw usersError

      // Get previous month's rankings for comparison
      const { data: previousRankings } = await this.supabase
        .from("monthly_rankings")
        .select("*")
        .eq("year", targetYear)
        .eq("month", this.getPreviousMonth(targetMonth))
        .order("rank", { ascending: true })

      const previousRankingsMap = new Map(previousRankings?.map((r) => [r.user_id, r]) || [])

      const rankings: MonthlyRanking[] = []

      for (let i = 0; i < usersData.length; i++) {
        const user = usersData[i]
        const previousRanking = previousRankingsMap.get(user.id)

        // Calculate monthly stats
        const monthlyMatches = this.getMonthlyMatches(user.match_participants, targetMonth, targetYear)
        const monthlyEloHistory = this.getMonthlyEloHistory(user.elo_history, targetMonth, targetYear)

        const wins = monthlyMatches.filter((m) => m.result === "win").length
        const losses = monthlyMatches.filter((m) => m.result === "loss").length
        const matchesPlayed = wins + losses

        const previousElo = previousRanking?.elo_rating || user.elo_rating
        const eloChange = user.elo_rating - previousElo
        const monthlyPoints = this.calculateMonthlyPoints(user.elo_rating, wins, losses, eloChange)

        const currentDivision = this.getDivisionFromElo(user.elo_rating)
        const previousDivision = previousRanking?.division || currentDivision
        const promotionStatus = this.getPromotionStatus(currentDivision, previousDivision)

        const ranking: MonthlyRanking = {
          id: `${user.id}_${targetMonth}_${targetYear}`,
          user_id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          previous_elo: previousElo,
          elo_change: eloChange,
          monthly_points: monthlyPoints,
          matches_played: matchesPlayed,
          wins,
          losses,
          win_rate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
          rank: i + 1,
          previous_rank: previousRanking?.rank || i + 1,
          rank_change: (previousRanking?.rank || i + 1) - (i + 1),
          division: currentDivision,
          previous_division: previousDivision,
          promotion_status: promotionStatus,
          month: targetMonth,
          year: targetYear,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        rankings.push(ranking)
      }

      // Save rankings to database
      await this.saveMonthlyRankings(rankings)

      return rankings
    } catch (error) {
      console.error("Error generating monthly rankings:", error)
      throw error
    }
  }

  async getMonthlyRankings(month: string, year: number): Promise<MonthlyRanking[]> {
    try {
      const { data, error } = await this.supabase
        .from("monthly_rankings")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("rank", { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching monthly rankings:", error)
      return []
    }
  }

  async getMonthlyTournamentStats(month: string, year: number): Promise<MonthlyTournamentStats> {
    try {
      const rankings = await this.getMonthlyRankings(month, year)

      const divisionCounts = rankings.reduce(
        (acc, ranking) => {
          acc[ranking.division] = (acc[ranking.division] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const promotionCounts = rankings.reduce(
        (acc, ranking) => {
          if (ranking.promotion_status === "promoted") acc.promoted++
          else if (ranking.promotion_status === "relegated") acc.relegated++
          else acc.maintained++
          return acc
        },
        { promoted: 0, relegated: 0, maintained: 0 },
      )

      const topPerformers = rankings.slice(0, 10)
      const biggestClimbers = rankings
        .filter((r) => r.rank_change > 0)
        .sort((a, b) => b.rank_change - a.rank_change)
        .slice(0, 10)

      const totalElo = rankings.reduce((sum, r) => sum + r.elo_rating, 0)
      const totalMatches = rankings.reduce((sum, r) => sum + r.matches_played, 0)

      return {
        total_players: rankings.length,
        total_matches: totalMatches,
        average_elo: rankings.length > 0 ? totalElo / rankings.length : 0,
        division_distribution: {
          premier: divisionCounts.premier || 0,
          championship: divisionCounts.championship || 0,
          league_one: divisionCounts.league_one || 0,
          league_two: divisionCounts.league_two || 0,
        },
        top_performers: topPerformers,
        biggest_climbers: biggestClimbers,
        promotion_relegation_summary: promotionCounts,
      }
    } catch (error) {
      console.error("Error getting monthly tournament stats:", error)
      throw error
    }
  }

  private async saveMonthlyRankings(rankings: MonthlyRanking[]): Promise<void> {
    try {
      // Delete existing rankings for this month/year
      await this.supabase
        .from("monthly_rankings")
        .delete()
        .eq("month", rankings[0]?.month)
        .eq("year", rankings[0]?.year)

      // Insert new rankings
      const { error } = await this.supabase.from("monthly_rankings").insert(rankings)

      if (error) throw error
    } catch (error) {
      console.error("Error saving monthly rankings:", error)
      throw error
    }
  }

  private getMonthlyMatches(matchParticipants: any[], month: string, year: number) {
    return matchParticipants.filter((mp) => {
      if (!mp.matches?.created_at) return false
      const matchDate = new Date(mp.matches.created_at)
      const matchMonth = matchDate.toLocaleString("default", { month: "long" })
      const matchYear = matchDate.getFullYear()
      return matchMonth === month && matchYear === year && mp.matches.status === "completed"
    })
  }

  private getMonthlyEloHistory(eloHistory: any[], month: string, year: number) {
    return eloHistory.filter((eh) => {
      if (!eh.created_at) return false
      const historyDate = new Date(eh.created_at)
      const historyMonth = historyDate.toLocaleString("default", { month: "long" })
      const historyYear = historyDate.getFullYear()
      return historyMonth === month && historyYear === year
    })
  }

  private calculateMonthlyPoints(elo: number, wins: number, losses: number, eloChange: number): number {
    // Base points from ELO
    const basePoints = Math.floor(elo / 10)

    // Bonus points for wins
    const winBonus = wins * 10

    // Penalty for losses (but not below 0)
    const lossPenalty = losses * 5

    // Bonus for ELO improvement
    const eloBonus = Math.max(0, eloChange)

    return Math.max(0, basePoints + winBonus - lossPenalty + eloBonus)
  }

  private getDivisionFromElo(elo: number): "premier" | "championship" | "league_one" | "league_two" {
    if (elo >= 1800) return "premier"
    if (elo >= 1600) return "championship"
    if (elo >= 1400) return "league_one"
    return "league_two"
  }

  private getPromotionStatus(
    currentDivision: string,
    previousDivision: string,
  ): "promoted" | "relegated" | "maintained" | null {
    const divisionOrder = ["league_two", "league_one", "championship", "premier"]
    const currentIndex = divisionOrder.indexOf(currentDivision)
    const previousIndex = divisionOrder.indexOf(previousDivision)

    if (currentIndex > previousIndex) return "promoted"
    if (currentIndex < previousIndex) return "relegated"
    return "maintained"
  }

  private getPreviousMonth(currentMonth: string): string {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const currentIndex = months.indexOf(currentMonth)
    return months[currentIndex === 0 ? 11 : currentIndex - 1]
  }

  async scheduleMonthlyRankingUpdate(): Promise<void> {
    // This would typically be called by a cron job or scheduled task
    const currentDate = new Date()
    const currentMonth = currentDate.toLocaleString("default", { month: "long" })
    const currentYear = currentDate.getFullYear()

    try {
      console.log(`[v0] Generating monthly rankings for ${currentMonth} ${currentYear}`)
      await this.generateMonthlyRankings(currentMonth, currentYear)
      console.log(`[v0] Monthly rankings generated successfully`)
    } catch (error) {
      console.error(`[v0] Error in scheduled monthly ranking update:`, error)
    }
  }
}

export const monthlyRankingService = new MonthlyRankingService()
