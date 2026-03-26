import { createClient } from "@/lib/supabase/server"
import { bettingService } from "./betting-service"

export interface GameResult {
  game_id: string
  winner_id: string
  loser_id: string
  winner_score: number
  loser_score: number
  completed_at: string
}

export class IntegrationService {
  private supabase = createClient()

  // Sequence: Game completion -> ELO updates -> Bet settlements -> Analytics updates
  async processGameCompletion(gameResult: GameResult) {
    try {
      // 1. Update game status
      await this.updateGameStatus(gameResult.game_id, "completed", gameResult)

      // 2. Update ELO ratings for both teams
      await this.updateEloRatings(gameResult)

      // 3. Settle all bets for this game
      await this.settleBetsForGame(gameResult.game_id, gameResult)

      // 4. Update analytics and statistics
      await this.updateGameAnalytics(gameResult)

      // 5. Create automatic announcements
      await this.createGameResultAnnouncement(gameResult)

      return { success: true, message: "Game completion processed successfully" }
    } catch (error) {
      console.error("Error processing game completion:", error)
      throw error
    }
  }

  // Sequence: Draft completion -> Team rosters -> Betting markets -> Schedule updates
  async processDraftCompletion(draftId: string) {
    try {
      // 1. Finalize team rosters
      await this.finalizeTeamRosters(draftId)

      // 2. Create betting markets for upcoming games
      await this.createBettingMarketsForDraft(draftId)

      // 3. Update league schedule
      await this.updateLeagueSchedule(draftId)

      // 4. Send draft completion announcements
      await this.createDraftCompletionAnnouncement(draftId)

      return { success: true, message: "Draft completion processed successfully" }
    } catch (error) {
      console.error("Error processing draft completion:", error)
      throw error
    }
  }

  // Sequence: Schedule creation -> Betting markets -> PR announcements
  async processScheduleCreation(gameId: string) {
    try {
      // 1. Create betting markets for the new game
      await this.createBettingMarketsForGame(gameId)

      // 2. Create PR announcement for the scheduled game
      await this.createScheduleAnnouncement(gameId)

      // 3. Set up automated reminders
      await this.setupGameReminders(gameId)

      return { success: true, message: "Schedule creation processed successfully" }
    } catch (error) {
      console.error("Error processing schedule creation:", error)
      throw error
    }
  }

  private async updateGameStatus(gameId: string, status: string, result?: GameResult) {
    const updateData: any = { status, updated_at: new Date().toISOString() }

    if (result) {
      updateData.winner_id = result.winner_id
      updateData.loser_id = result.loser_id
      updateData.winner_score = result.winner_score
      updateData.loser_score = result.loser_score
      updateData.completed_at = result.completed_at
    }

    const { error } = await this.supabase.from("games").update(updateData).eq("id", gameId)

    if (error) throw error
  }

  private async updateEloRatings(gameResult: GameResult) {
    // Get current ELO ratings for both teams
    const { data: teams, error: teamsError } = await this.supabase
      .from("teams")
      .select("id, elo_rating")
      .in("id", [gameResult.winner_id, gameResult.loser_id])

    if (teamsError) throw teamsError

    const winner = teams?.find((t) => t.id === gameResult.winner_id)
    const loser = teams?.find((t) => t.id === gameResult.loser_id)

    if (!winner || !loser) throw new Error("Teams not found")

    // Calculate new ELO ratings
    const kFactor = 32
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo_rating - winner.elo_rating) / 400))
    const expectedLoser = 1 - expectedWinner

    const newWinnerRating = Math.round(winner.elo_rating + kFactor * (1 - expectedWinner))
    const newLoserRating = Math.round(loser.elo_rating + kFactor * (0 - expectedLoser))

    // Update ELO ratings
    await Promise.all([
      this.supabase.from("teams").update({ elo_rating: newWinnerRating }).eq("id", gameResult.winner_id),
      this.supabase.from("teams").update({ elo_rating: newLoserRating }).eq("id", gameResult.loser_id),
    ])

    // Record ELO history
    await this.supabase.from("elo_history").insert([
      {
        team_id: gameResult.winner_id,
        old_rating: winner.elo_rating,
        new_rating: newWinnerRating,
        game_id: gameResult.game_id,
        created_at: new Date().toISOString(),
      },
      {
        team_id: gameResult.loser_id,
        old_rating: loser.elo_rating,
        new_rating: newLoserRating,
        game_id: gameResult.game_id,
        created_at: new Date().toISOString(),
      },
    ])
  }

  private async settleBetsForGame(gameId: string, gameResult: GameResult) {
    // Get all pending bets for this game
    const { data: bets, error: betsError } = await this.supabase
      .from("bets")
      .select(`
        *,
        betting_markets (*)
      `)
      .eq("betting_markets.game_id", gameId)
      .eq("status", "pending")

    if (betsError) throw betsError

    // Process each bet
    for (const bet of bets || []) {
      let result: "won" | "lost" = "lost"

      // Determine bet result based on market type and game outcome
      const market = bet.betting_markets
      if (market.market_type === "moneyline") {
        if (
          (bet.selection.includes("winner") && gameResult.winner_score > gameResult.loser_score) ||
          (bet.selection.includes("loser") && gameResult.loser_score > gameResult.winner_score)
        ) {
          result = "won"
        }
      }
      // Add more market type logic here...

      // Settle the bet
      await bettingService.settleBet(bet.id, result)
    }
  }

  private async updateGameAnalytics(gameResult: GameResult) {
    // Update game statistics
    await this.supabase.from("game_stats").insert({
      game_id: gameResult.game_id,
      winner_id: gameResult.winner_id,
      loser_id: gameResult.loser_id,
      winner_score: gameResult.winner_score,
      loser_score: gameResult.loser_score,
      total_score: gameResult.winner_score + gameResult.loser_score,
      margin_of_victory: Math.abs(gameResult.winner_score - gameResult.loser_score),
      created_at: new Date().toISOString(),
    })
  }

  private async createGameResultAnnouncement(gameResult: GameResult) {
    // Get team names
    const { data: teams, error } = await this.supabase
      .from("teams")
      .select("id, name")
      .in("id", [gameResult.winner_id, gameResult.loser_id])

    if (error) return

    const winner = teams?.find((t) => t.id === gameResult.winner_id)
    const loser = teams?.find((t) => t.id === gameResult.loser_id)

    if (!winner || !loser) return

    await this.supabase.from("announcements").insert({
      title: `Game Result: ${winner.name} defeats ${loser.name}`,
      content: `Final Score: ${winner.name} ${gameResult.winner_score} - ${gameResult.loser_score} ${loser.name}`,
      priority: "medium",
      category: "results",
      status: "published",
      created_at: new Date().toISOString(),
    })
  }

  private async finalizeTeamRosters(draftId: string) {
    // Mark all draft picks as finalized
    const { error } = await this.supabase.from("draft_picks").update({ status: "finalized" }).eq("draft_id", draftId)

    if (error) throw error
  }

  private async createBettingMarketsForDraft(draftId: string) {
    // Get upcoming games for teams in this draft
    const { data: games, error } = await this.supabase
      .from("games")
      .select("*")
      .eq("league_id", draftId) // Assuming draft_id relates to league
      .eq("status", "scheduled")

    if (error) throw error

    // Create betting markets for each game
    for (const game of games || []) {
      await this.createBettingMarketsForGame(game.id)
    }
  }

  private async createBettingMarketsForGame(gameId: string) {
    const markets = [
      { market_type: "moneyline", selection: "home_win", odds: -110 },
      { market_type: "moneyline", selection: "away_win", odds: -110 },
      { market_type: "spread", selection: "home_spread", odds: -110 },
      { market_type: "spread", selection: "away_spread", odds: -110 },
      { market_type: "total", selection: "over", odds: -110 },
      { market_type: "total", selection: "under", odds: -110 },
    ]

    const marketData = markets.map((market) => ({
      game_id: gameId,
      market_type: market.market_type,
      selection: market.selection,
      odds: market.odds,
      decimal_odds: market.odds > 0 ? market.odds / 100 + 1 : 100 / Math.abs(market.odds) + 1,
      is_active: true,
      created_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase.from("betting_markets").insert(marketData)
    if (error) throw error
  }

  private async updateLeagueSchedule(draftId: string) {
    // Update league status to active after draft completion
    const { error } = await this.supabase
      .from("leagues")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", draftId)

    if (error) throw error
  }

  private async createDraftCompletionAnnouncement(draftId: string) {
    const { data: league, error } = await this.supabase.from("leagues").select("name").eq("id", draftId).single()

    if (error) return

    await this.supabase.from("announcements").insert({
      title: `Draft Completed: ${league.name}`,
      content: `The auction draft for ${league.name} has been completed. All team rosters are now finalized and the season is ready to begin!`,
      priority: "high",
      category: "draft",
      status: "published",
      created_at: new Date().toISOString(),
    })
  }

  private async createScheduleAnnouncement(gameId: string) {
    const { data: game, error } = await this.supabase
      .from("games")
      .select(`
        *,
        teams!games_home_team_id_fkey (name),
        away_teams:teams!games_away_team_id_fkey (name)
      `)
      .eq("id", gameId)
      .single()

    if (error) return

    await this.supabase.from("announcements").insert({
      title: `Game Scheduled: ${game.away_teams.name} @ ${game.teams.name}`,
      content: `New game scheduled for ${new Date(game.scheduled_time).toLocaleString()}. Betting markets are now open!`,
      priority: "medium",
      category: "schedule",
      status: "published",
      created_at: new Date().toISOString(),
    })
  }

  private async setupGameReminders(gameId: string) {
    // This would typically integrate with a job queue or scheduling system
    // For now, we'll just log the reminder setup
    console.log(`Game reminders set up for game ${gameId}`)
  }
}

export const integrationService = new IntegrationService()
