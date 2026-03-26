import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface DraftSettings {
  num_teams: number
  max_teams?: number // Keep as fallback for backward compatibility
  players_per_team: number
  draft_type: "auction" | "snake" | "linear"
  auction_budget?: number
  pick_time_limit: number // seconds per pick
}

export interface DraftState {
  status: "waiting" | "active" | "paused" | "completed" | "choosing_order"
  current_round: number
  current_pick: number
  current_team_index: number
  current_team_id: string | null
  time_remaining: number
  draft_order: string[] // team IDs in draft order
  pick_history: DraftPick[]
  auction_state?: AuctionState
  pass_first_pick?: boolean // Custom rule for TUG
}

export interface DraftPick {
  pick_number: number
  team_id: string
  player_id: string
  player_name: string
  cost: number
  timestamp: string
}

export interface AuctionState {
  current_player_id: string | null
  current_bid: number
  highest_bidder_team_id: string | null
  bid_history: AuctionBid[]
  auction_time_remaining: number
}

export interface AuctionBid {
  team_id: string
  team_name: string
  bid_amount: number
  timestamp: string
}

export interface Team {
  id: string
  name: string
  captain_id: string
  captain_name: string
  budget_remaining: number
  players: Player[]
  draft_order: number
}

export interface Player {
  id: string
  username: string
  elo_rating: number
  csv_stats: {
    goals: number
    assists: number
    saves: number
    games_played: number
  }
  total_score: number
  status: "available" | "drafted"
  draft_cost?: number
  team_id?: string
}

export const tournamentDraftService = {
  async initializeDraft(tournamentId: string): Promise<{ draftState: DraftState; settings: DraftSettings }> {
    try {
      // Load tournament settings
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("player_pool_settings")
        .eq("id", tournamentId)
        .single()

      if (!tournament?.player_pool_settings) {
        throw new Error("Tournament draft settings not found")
      }

      const settings: DraftSettings = {
        ...tournament.player_pool_settings,
        num_teams: tournament.player_pool_settings.num_teams || tournament.player_pool_settings.max_teams || 4,
        pick_time_limit: tournament.player_pool_settings.pick_time_limit || 120,
      }

      // Load teams in draft order (ELO based)
      // Highest ELO = Team 1, 2nd Highest = Team 2
      const { data: teams } = await supabase
        .from("tournament_teams")
        .select("id, team_name, draft_order, team_captain, users!tournament_teams_team_captain_fkey(elo_rating)")
        .eq("tournament_id", tournamentId)
        .order("users(elo_rating)", { ascending: false })

      if (!teams || teams.length === 0) {
        throw new Error("No teams found for tournament")
      }

      // For custom TUG draft, we need to wait for the 2nd highest ELO decision
      const initialState: DraftState = {
        status: "choosing_order",
        current_round: 1,
        current_pick: 1,
        current_team_index: 0,
        current_team_id: teams[1].id, // 2nd highest ELO chooses first
        time_remaining: 30, // 30 seconds to choose
        draft_order: [], // Will be generated after choice
        pick_history: [],
      }

      // Save initial draft state
      await this.saveDraftState(tournamentId, initialState)

      return { draftState: initialState, settings }
    } catch (error) {
      console.error("Error initializing draft:", error)
      throw error
    }
  },

  async setPassDecision(tournamentId: string, teamId: string, pass: boolean): Promise<DraftState> {
    const currentState = await this.getDraftState(tournamentId)
    if (!currentState || currentState.status !== "choosing_order") {
        throw new Error("Not in order selection phase")
    }

    // Verify it's the correct team
    if (currentState.current_team_id !== teamId) {
        throw new Error("Only the 2nd highest ELO captain can choose")
    }

    const { data: teams } = await supabase
      .from("tournament_teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .order("users(elo_rating)", { ascending: false })

    if (!teams || teams.length < 2) throw new Error("Teams not found")

    const settings = await this.getTournamentSettings(tournamentId)
    
    // Custom TUG Snake Order: 8 players total, 2 captains used, 6 picks needed.
    // teamIds[0] = highest ELO, teamIds[1] = 2nd highest ELO (Decider)
    const teamIds = teams.map(t => t.id)
    const deciderId = teamIds[1]
    const highestId = teamIds[0]
    
    let draftOrder: string[] = []
    if (!pass) {
        // Decider takes 1st pick: 1, 2, 2, 1, 1, 2
        draftOrder = [deciderId, highestId, highestId, deciderId, deciderId, highestId]
    } else {
        // Decider passes: Highest takes 1, 2. Decider takes 3, 4. Highest takes 5, 6
        // User says: "they get 3rd and 4th pick" if they pass
        // Order: Highest, Highest, Decider, Decider, Highest, Decider
        draftOrder = [highestId, highestId, deciderId, deciderId, highestId, deciderId]
    }

    const newState: DraftState = {
        ...currentState,
        status: "active",
        pass_first_pick: pass,
        draft_order: draftOrder,
        current_team_id: draftOrder[0],
        time_remaining: 120
    }

    await this.saveDraftState(tournamentId, newState)
    await this.broadcastDraftUpdate(tournamentId, newState, "draft_started")
    this.startDraftTimer(tournamentId)
    return newState
  },

  async getTournamentSettings(tournamentId: string): Promise<DraftSettings> {
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("player_pool_settings")
        .eq("id", tournamentId)
        .single()
    return {
        ...tournament?.player_pool_settings,
        num_teams: tournament?.player_pool_settings.num_teams || 2,
        players_per_team: tournament?.player_pool_settings.players_per_team || 4
    }
  },

  generateDraftOrder(teams: { id: string; draft_order: number }[], settings: DraftSettings): string[] {
    // This is now overridden by setPassDecision for custom TUG draft
    return []
  },

  async startDraft(tournamentId: string, userId: string): Promise<DraftState> {
    try {
      // Verify user has permission to start draft
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("created_by")
        .eq("id", tournamentId)
        .single()

      if (tournament?.created_by !== userId) {
        throw new Error("Only tournament organizer can start the draft")
      }

      // Load current draft state
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState) {
        throw new Error("Draft not initialized")
      }

      const newState: DraftState = {
        ...currentState,
        status: "active",
        time_remaining: currentState.auction_state ? 60 : 120, // Different timers for auction vs snake/linear
      }

      await this.saveDraftState(tournamentId, newState)
      await this.broadcastDraftUpdate(tournamentId, newState, "draft_started")

      // Start timer
      this.startDraftTimer(tournamentId)

      return newState
    } catch (error) {
      console.error("Error starting draft:", error)
      throw error
    }
  },

  async draftPlayer(tournamentId: string, playerId: string, teamId: string, userId: string): Promise<DraftState> {
    try {
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState || currentState.status !== "active") {
        throw new Error("Draft is not active")
      }

      // Verify it's the correct team's turn
      if (currentState.current_team_id !== teamId) {
        throw new Error("Not your turn to draft")
      }

      // Verify user is captain of the team
      const { data: team } = await supabase.from("tournament_teams").select("team_captain").eq("id", teamId).single()

      if (team?.team_captain !== userId) {
        throw new Error("Only team captain can make draft picks")
      }

      const { data: player } = await supabase
        .from("tournament_player_pool")
        .select("status, users(username)")
        .eq("tournament_id", tournamentId)
        .eq("user_id", playerId)
        .single()

      if (!player || player.status !== "available") {
        throw new Error("Player is not available for draft")
      }

      // Execute the draft pick
      await this.executeDraftPick(tournamentId, playerId, teamId, 0) // No cost for snake/linear drafts

      // Update draft state
      const newState = this.calculateNextDraftState(currentState)
      await this.saveDraftState(tournamentId, newState)

      // Create pick record
      const userData: any = player.users
      const pick: DraftPick = {
        pick_number: currentState.current_pick,
        team_id: teamId,
        player_id: playerId,
        player_name: Array.isArray(userData) ? userData[0]?.username : userData?.username || "Unknown",
        cost: 0,
        timestamp: new Date().toISOString(),
      }

      newState.pick_history.push(pick)

      await this.broadcastDraftUpdate(tournamentId, newState, "player_drafted", { pick })

      return newState
    } catch (error) {
      console.error("Error drafting player:", error)
      throw error
    }
  },

  async placeBid(
    tournamentId: string,
    playerId: string,
    teamId: string,
    bidAmount: number,
    userId: string,
  ): Promise<DraftState> {
    try {
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState || currentState.status !== "active" || !currentState.auction_state) {
        throw new Error("Auction is not active")
      }

      // Verify user is captain of the team
      const { data: team } = await supabase
        .from("tournament_teams")
        .select("team_captain, budget_remaining, team_name")
        .eq("id", teamId)
        .single()

      if (team?.team_captain !== userId) {
        throw new Error("Only team captain can place bids")
      }

      // Verify team has sufficient budget
      if (bidAmount > team.budget_remaining) {
        throw new Error("Insufficient budget for this bid")
      }

      // Verify bid is higher than current bid
      if (bidAmount <= currentState.auction_state.current_bid) {
        throw new Error("Bid must be higher than current bid")
      }

      // Update auction state
      const newAuctionState: AuctionState = {
        ...currentState.auction_state,
        current_bid: bidAmount,
        highest_bidder_team_id: teamId,
        auction_time_remaining: 30, // Reset timer to 30 seconds on new bid
        bid_history: [
          ...currentState.auction_state.bid_history,
          {
            team_id: teamId,
            team_name: team.team_name,
            bid_amount: bidAmount,
            timestamp: new Date().toISOString(),
          },
        ],
      }

      const newState: DraftState = {
        ...currentState,
        auction_state: newAuctionState,
        time_remaining: 30, // Reset main timer too
      }

      await this.saveDraftState(tournamentId, newState)
      await this.broadcastDraftUpdate(tournamentId, newState, "bid_placed", {
        teamId,
        bidAmount,
        playerId,
      })

      return newState
    } catch (error) {
      console.error("Error placing bid:", error)
      throw error
    }
  },

  async startPlayerAuction(tournamentId: string, playerId: string): Promise<DraftState> {
    try {
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState || !currentState.auction_state) {
        throw new Error("Auction draft not initialized")
      }

      const newAuctionState: AuctionState = {
        ...currentState.auction_state,
        current_player_id: playerId,
        current_bid: 1, // Starting bid of $1
        highest_bidder_team_id: null,
        bid_history: [],
        auction_time_remaining: 60,
      }

      const newState: DraftState = {
        ...currentState,
        auction_state: newAuctionState,
        time_remaining: 60,
      }

      await this.saveDraftState(tournamentId, newState)
      await this.broadcastDraftUpdate(tournamentId, newState, "auction_started", { playerId })

      return newState
    } catch (error) {
      console.error("Error starting player auction:", error)
      throw error
    }
  },

  async completeAuction(tournamentId: string): Promise<DraftState> {
    try {
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState || !currentState.auction_state) {
        throw new Error("No active auction")
      }

      const { auction_state } = currentState
      if (!auction_state.current_player_id || !auction_state.highest_bidder_team_id) {
        throw new Error("No valid auction to complete")
      }

      // Award player to highest bidder
      await this.executeDraftPick(
        tournamentId,
        auction_state.current_player_id,
        auction_state.highest_bidder_team_id,
        auction_state.current_bid,
      )

      // Create pick record
      const { data: player } = await supabase
        .from("tournament_player_pool")
        .select("users(username)")
        .eq("user_id", auction_state.current_player_id)
        .single()

      const { data: team } = await supabase
        .from("tournament_teams")
        .select("team_name")
        .eq("id", auction_state.highest_bidder_team_id)
        .single()

      const pick: DraftPick = {
        pick_number: currentState.current_pick,
        team_id: auction_state.highest_bidder_team_id,
        player_id: auction_state.current_player_id,
        player_name: player?.users?.username || "Unknown",
        cost: auction_state.current_bid,
        timestamp: new Date().toISOString(),
      }

      // Reset auction state and advance draft
      const newState = this.calculateNextDraftState(currentState)
      newState.pick_history.push(pick)

      if (newState.auction_state) {
        newState.auction_state = {
          current_player_id: null,
          current_bid: 0,
          highest_bidder_team_id: null,
          bid_history: [],
          auction_time_remaining: 60,
        }
      }

      await this.saveDraftState(tournamentId, newState)
      await this.broadcastDraftUpdate(tournamentId, newState, "auction_completed", { pick })

      return newState
    } catch (error) {
      console.error("Error completing auction:", error)
      throw error
    }
  },

  async executeDraftPick(tournamentId: string, playerId: string, teamId: string, cost: number): Promise<void> {
    try {
      // Add player to team
      await supabase.from("tournament_team_members").insert({
        team_id: teamId,
        user_id: playerId,
        draft_cost: cost,
        joined_at: new Date().toISOString(),
      })

      // Update player status to drafted
      await supabase
        .from("tournament_player_pool")
        .update({ status: "drafted" })
        .eq("tournament_id", tournamentId)
        .eq("user_id", playerId)

      // Update team budget if cost > 0
      if (cost > 0) {
        const { data: team } = await supabase
            .from("tournament_teams")
            .select("budget_remaining")
            .eq("id", teamId)
            .single()
        
        if (team) {
            await supabase
              .from("tournament_teams")
              .update({
                budget_remaining: team.budget_remaining - cost,
              })
              .eq("id", teamId)
        }
      }
    } catch (error) {
      console.error("Error executing draft pick:", error)
      throw error
    }
  },

  calculateNextDraftState(currentState: DraftState): DraftState {
    const nextPick = currentState.current_pick + 1

    const teamsCount = Math.floor(currentState.draft_order.length / (currentState.current_round || 1))
    const playersPerTeam = Math.ceil(currentState.draft_order.length / teamsCount)
    const totalPicks = teamsCount * playersPerTeam

    if (nextPick > totalPicks) {
      return {
        ...currentState,
        status: "completed",
        current_pick: nextPick,
        current_team_id: null,
        current_team_index: -1,
        time_remaining: 0,
      }
    }

    const nextTeamIndex = nextPick - 1 // Array is 0-indexed, picks are 1-indexed
    const nextTeamId = currentState.draft_order[nextTeamIndex]

    const nextRound = Math.ceil(nextPick / teamsCount)

    return {
      ...currentState,
      current_pick: nextPick,
      current_round: nextRound,
      current_team_index: nextTeamIndex,
      current_team_id: nextTeamId,
      time_remaining: currentState.auction_state ? 60 : 120,
    }
  },

  async saveDraftState(tournamentId: string, draftState: DraftState): Promise<void> {
    try {
      await supabase.from("tournament_settings").upsert({
        tournament_id: tournamentId,
        setting_key: "draft_state",
        setting_value: JSON.stringify(draftState),
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error saving draft state:", error)
      throw error
    }
  },

  async getDraftState(tournamentId: string): Promise<DraftState | null> {
    try {
      const { data } = await supabase
        .from("tournament_settings")
        .select("setting_value")
        .eq("tournament_id", tournamentId)
        .eq("setting_key", "draft_state")
        .single()

      return data ? JSON.parse(data.setting_value) : null
    } catch (error) {
      console.error("Error loading draft state:", error)
      return null
    }
  },

  async broadcastDraftUpdate(tournamentId: string, draftState: DraftState, event: string, data?: any): Promise<void> {
    try {
      await supabase.channel(`tournament-draft-${tournamentId}`).send({
        type: "broadcast",
        event: event,
        draft_state: draftState,
        data: data,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error broadcasting draft update:", error)
    }
  },

  startDraftTimer(tournamentId: string): void {
    const timer = setInterval(async () => {
      try {
        const currentState = await this.getDraftState(tournamentId)
        if (!currentState || currentState.status !== "active") {
          clearInterval(timer)
          return
        }

        const newTimeRemaining = Math.max(0, currentState.time_remaining - 1)

        if (newTimeRemaining === 0) {
          // Time expired - handle auto-progression
          if (currentState.auction_state?.current_player_id) {
            // Complete auction
            await this.completeAuction(tournamentId)
          } else {
            // Auto-pass turn for snake/linear drafts
            const newState = this.calculateNextDraftState(currentState)
            await this.saveDraftState(tournamentId, newState)
            await this.broadcastDraftUpdate(tournamentId, newState, "turn_skipped")
          }
        } else {
          // Update timer
          const updatedState = { ...currentState, time_remaining: newTimeRemaining }
          await this.saveDraftState(tournamentId, updatedState)

          // Broadcast timer updates every 10 seconds or when < 10 seconds
          if (newTimeRemaining % 10 === 0 || newTimeRemaining <= 10) {
            await this.broadcastDraftUpdate(tournamentId, updatedState, "timer_update")
          }
        }

        // Stop timer if draft is completed or no longer active
        if ((currentState.status as any) === "completed" || currentState.status !== "active") {
          clearInterval(timer)
        }
      } catch (error) {
        console.error("Error in draft timer:", error)
        clearInterval(timer)
      }
    }, 1000) // Update every second
  },

  async getAvailablePlayers(tournamentId: string): Promise<Player[]> {
    try {
      const { data } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating),
          player_analytics(goals, assists, saves, games_played)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")

      if (!data) return []

      return data
        .map((entry: any) => {
          const stats = entry.player_analytics?.[0] || entry.player_analytics || { goals: 0, assists: 0, saves: 0, games_played: 0 }
          const totalScore = (stats.goals || 0) + (stats.assists || 0) + Math.abs(stats.saves || 0)

          const userData = entry.users
          return {
            id: entry.user_id,
            username: Array.isArray(userData) ? userData[0]?.username : userData?.username || "Unknown",
            elo_rating: Array.isArray(userData) ? userData[0]?.elo_rating : userData?.elo_rating || 1000,
            csv_stats: stats,
            total_score: totalScore,
            status: entry.status as "available" | "drafted",
          } as Player
        })
        .sort((a, b) => b.total_score - a.total_score)
    } catch (error) {
      console.error("Error loading available players:", error)
      return []
    }
  },

  async getTeamsWithRosters(tournamentId: string): Promise<Team[]> {
    try {
      const { data: teams } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          budget_remaining,
          draft_order,
          users!tournament_teams_team_captain_fkey(username),
          team_members:tournament_team_members(
            user_id,
            draft_cost,
            users(username, elo_rating)
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("draft_order")

      if (!teams) return []

      return teams.map((team) => ({
        id: team.id,
        name: team.team_name,
        captain_id: team.team_captain || "",
        captain_name: Array.isArray(team.users) ? (team.users[0] as any)?.username : (team.users as any)?.username || "TBD",
        budget_remaining: team.budget_remaining || 0,
        draft_order: team.draft_order || 0,
        players:
          team.team_members?.map((member: any) => {
            const userData = member.users
            return {
              id: member.user_id,
              username: Array.isArray(userData) ? userData[0]?.username : userData?.username || "Unknown",
              elo_rating: Array.isArray(userData) ? userData[0]?.elo_rating : userData?.elo_rating || 1000,
              csv_stats: { goals: 0, assists: 0, saves: 0, games_played: 0 }, // Would need to join with analytics
              total_score: 0,
              status: "drafted" as const,
              draft_cost: member.draft_cost,
              team_id: team.id,
            }
          }) || [],
      }))
    } catch (error) {
      console.error("Error loading teams with rosters:", error)
      return []
    }
  },

  async pauseDraft(tournamentId: string, userId: string): Promise<DraftState> {
    try {
      const currentState = await this.getDraftState(tournamentId)
      if (!currentState) {
        throw new Error("Draft not found")
      }

      const newState: DraftState = {
        ...currentState,
        status: currentState.status === "active" ? "paused" : "active",
      }

      await this.saveDraftState(tournamentId, newState)
      await this.broadcastDraftUpdate(tournamentId, newState, "draft_paused")

      return newState
    } catch (error) {
      console.error("Error pausing draft:", error)
      throw error
    }
  },

  async getDraftHistory(tournamentId: string): Promise<DraftPick[]> {
    try {
      const draftState = await this.getDraftState(tournamentId)
      return draftState?.pick_history || []
    } catch (error) {
      console.error("Error loading draft history:", error)
      return []
    }
  },
}
