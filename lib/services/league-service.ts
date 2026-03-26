import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface ScheduledGame {
  id?: string
  league_id: string
  team1_id: string
  team2_id: string
  scheduled_date: string
  game_type: "regular" | "playoff_semi" | "playoff_final"
  status: "scheduled" | "in_progress" | "completed"
  team1_score?: number
  team2_score?: number
  series_info?: {
    series_id: string
    game_number: number
    best_of: number
  }
}

export interface LeagueStanding {
  team_id: string
  team_name: string
  wins: number
  losses: number
  points: number
  games_played: number
}

class LeagueService {
  async createScheduledGame(gameData: ScheduledGame): Promise<ScheduledGame> {
    try {
      const { data, error } = await supabase
        .from("league_games")
        .insert({
          league_id: gameData.league_id,
          team1_id: gameData.team1_id,
          team2_id: gameData.team2_id,
          scheduled_date: gameData.scheduled_date,
          game_type: gameData.game_type,
          status: "scheduled",
          series_info: gameData.series_info,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating scheduled game:", error)
      throw error
    }
  }

  async getLeagueSchedule(leagueId: string): Promise<ScheduledGame[]> {
    try {
      const { data, error } = await supabase
        .from("league_games")
        .select(`
          *,
          team1:team1_id(name),
          team2:team2_id(name)
        `)
        .eq("league_id", leagueId)
        .order("scheduled_date", { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching league schedule:", error)
      throw error
    }
  }

  async updateGameScore(gameId: string, team1Score: number, team2Score: number): Promise<void> {
    try {
      const { error } = await supabase
        .from("league_games")
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (error) throw error

      // Update league standings after game completion
      await this.updateLeagueStandings(gameId)

      // Check if we should generate playoffs
      const { data: game } = await supabase
        .from("league_games")
        .select("league_id, game_type")
        .eq("id", gameId)
        .single()

      if (game && game.game_type === "regular") {
        await this.generatePlayoffsIfReady(game.league_id)
      }
    } catch (error) {
      console.error("Error updating game score:", error)
      throw error
    }
  }

  private async updateLeagueStandings(gameId: string): Promise<void> {
    try {
      // Get the completed game
      const { data: game, error: gameError } = await supabase.from("league_games").select("*").eq("id", gameId).single()

      if (gameError) throw gameError

      // Determine winner and update team records
      const winner = game.team1_score > game.team2_score ? game.team1_id : game.team2_id
      const loser = game.team1_score > game.team2_score ? game.team2_id : game.team1_id

      // Update winner's record
      await supabase.rpc("update_team_record", {
        team_id: winner,
        is_win: true,
        points_earned: game.game_type === "regular" ? 2 : 3, // More points for playoff wins
      })

      // Update loser's record
      await supabase.rpc("update_team_record", {
        team_id: loser,
        is_win: false,
        points_earned: 0,
      })
    } catch (error) {
      console.error("Error updating league standings:", error)
      throw error
    }
  }

  async getLeagueStandings(leagueId: string): Promise<LeagueStanding[]> {
    try {
      const { data, error } = await supabase
        .from("league_standings")
        .select(`
          *,
          team:team_id(name)
        `)
        .eq("league_id", leagueId)
        .order("points", { ascending: false })
        .order("wins", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching league standings:", error)
      throw error
    }
  }

  async deleteScheduledGame(gameId: string): Promise<void> {
    try {
      const { error } = await supabase.from("league_games").delete().eq("id", gameId).eq("status", "scheduled") // Only allow deletion of unplayed games

      if (error) throw error
    } catch (error) {
      console.error("Error deleting scheduled game:", error)
      throw error
    }
  }

  async createPlayoffSeries(
    leagueId: string,
    team1Id: string,
    team2Id: string,
    seriesType: "semi" | "final",
    startDate: string,
  ): Promise<void> {
    try {
      const bestOf = seriesType === "semi" ? 3 : 5
      const gameType = seriesType === "semi" ? "playoff_semi" : "playoff_final"
      const seriesId = `${leagueId}_${seriesType}_${Date.now()}`

      // Create all games in the series
      const games = []
      for (let i = 1; i <= bestOf; i++) {
        const gameDate = new Date(startDate)
        gameDate.setDate(gameDate.getDate() + (i - 1) * 2) // Games every 2 days

        games.push({
          league_id: leagueId,
          team1_id: team1Id,
          team2_id: team2Id,
          scheduled_date: gameDate.toISOString(),
          game_type: gameType,
          status: "scheduled",
          series_info: {
            series_id: seriesId,
            game_number: i,
            best_of: bestOf,
          },
        })
      }

      const { error } = await supabase.from("league_games").insert(games)

      if (error) throw error
    } catch (error) {
      console.error("Error creating playoff series:", error)
    }
  }

  async checkLeagueCompletion(leagueId: string): Promise<boolean> {
    try {
      const { data: games, error } = await supabase
        .from("league_games")
        .select("status, game_type")
        .eq("league_id", leagueId)

      if (error) throw error

      const regularSeasonGames = games?.filter((game) => game.game_type === "regular") || []
      const playoffGames = games?.filter((game) => game.game_type !== "regular") || []

      const regularSeasonComplete =
        regularSeasonGames.length > 0 && regularSeasonGames.every((game) => game.status === "completed")

      const playoffsComplete = playoffGames.length === 0 || playoffGames.every((game) => game.status === "completed")

      return regularSeasonComplete && playoffsComplete
    } catch (error) {
      console.error("Error checking league completion:", error)
      return false
    }
  }

  async generatePlayoffsIfReady(leagueId: string): Promise<void> {
    try {
      // Check if regular season is complete
      const { data: regularGames, error } = await supabase
        .from("league_games")
        .select("status")
        .eq("league_id", leagueId)
        .eq("game_type", "regular")

      if (error) throw error

      const regularSeasonComplete =
        regularGames?.length > 0 && regularGames.every((game) => game.status === "completed")

      if (!regularSeasonComplete) return

      // Check if playoffs already exist
      const { data: existingPlayoffs } = await supabase
        .from("league_games")
        .select("id")
        .eq("league_id", leagueId)
        .neq("game_type", "regular")
        .limit(1)

      if (existingPlayoffs && existingPlayoffs.length > 0) return

      // Get top teams for playoffs
      const standings = await this.getLeagueStandings(leagueId)
      const topTeams = standings.slice(0, 4) // Top 4 teams make playoffs

      if (topTeams.length >= 4) {
        // Create semi-final series
        await this.createPlayoffSeries(
          leagueId,
          topTeams[0].team_id,
          topTeams[3].team_id,
          "semi",
          new Date().toISOString(),
        )
        await this.createPlayoffSeries(
          leagueId,
          topTeams[1].team_id,
          topTeams[2].team_id,
          "semi",
          new Date().toISOString(),
        )
      }
    } catch (error) {
      console.error("Error generating playoffs:", error)
    }
  }
}

export const leagueService = new LeagueService()
