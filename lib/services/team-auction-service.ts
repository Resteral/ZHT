import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface TeamAuction {
  id: string
  tournament_id: string
  team_id: string
  team_name: string
  captain_name: string
  player_count: number
  avg_elo: number
  current_bid: number
  highest_bidder_id?: string
  highest_bidder_name?: string
  auction_end_time: string
  status: "available" | "bidding" | "sold"
  bid_history: TeamBid[]
}

export interface TeamBid {
  id: string
  team_auction_id: string
  bidder_id: string
  bidder_name: string
  bid_amount: number
  timestamp: string
}

export interface TournamentExtension {
  id: string
  tournament_id: string
  original_end_date: string
  new_end_date: string
  extension_reason: string
  approved_by: string
  created_at: string
}

export const teamAuctionService = {
  async createTeamAuction(tournamentId: string, teamId: string, startingBid = 100): Promise<TeamAuction> {
    try {
      // Get team details
      const { data: team } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          users!tournament_teams_team_captain_fkey(username),
          team_members:tournament_team_members(
            user_id,
            users(elo_rating)
          )
        `)
        .eq("id", teamId)
        .single()

      if (!team) throw new Error("Team not found")

      const playerCount = team.team_members?.length || 0
      const avgElo = team.team_members?.length
        ? Math.round(
            team.team_members.reduce((sum: number, member: any) => sum + (member.users?.elo_rating || 1000), 0) /
              team.team_members.length,
          )
        : 1000

      // Create team auction
      const { data: auction, error } = await supabase
        .from("team_auctions")
        .insert({
          tournament_id: tournamentId,
          team_id: teamId,
          team_name: team.team_name,
          captain_name: team.users?.username || "Unknown",
          player_count: playerCount,
          avg_elo: avgElo,
          current_bid: startingBid,
          auction_end_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          status: "bidding",
        })
        .select()
        .single()

      if (error) throw error

      return {
        ...auction,
        bid_history: [],
      }
    } catch (error) {
      console.error("Error creating team auction:", error)
      throw error
    }
  },

  async placeBid(auctionId: string, bidderId: string, bidAmount: number): Promise<TeamBid> {
    try {
      // Verify auction is active
      const { data: auction } = await supabase
        .from("team_auctions")
        .select("current_bid, status, auction_end_time")
        .eq("id", auctionId)
        .single()

      if (!auction || auction.status !== "bidding") {
        throw new Error("Auction is not active")
      }

      if (bidAmount <= auction.current_bid) {
        throw new Error("Bid must be higher than current bid")
      }

      if (new Date() > new Date(auction.auction_end_time)) {
        throw new Error("Auction has ended")
      }

      // Get bidder info
      const { data: bidder } = await supabase.from("users").select("username").eq("id", bidderId).single()

      // Place bid
      const { data: bid, error } = await supabase
        .from("team_auction_bids")
        .insert({
          team_auction_id: auctionId,
          bidder_id: bidderId,
          bidder_name: bidder?.username || "Unknown",
          bid_amount: bidAmount,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Update auction with new highest bid
      await supabase
        .from("team_auctions")
        .update({
          current_bid: bidAmount,
          highest_bidder_id: bidderId,
          highest_bidder_name: bidder?.username || "Unknown",
          // Extend auction by 30 seconds if bid placed in last minute
          auction_end_time:
            new Date(auction.auction_end_time).getTime() - Date.now() < 60000
              ? new Date(Date.now() + 30 * 1000).toISOString()
              : auction.auction_end_time,
        })
        .eq("id", auctionId)

      // Broadcast bid update
      await this.broadcastAuctionUpdate(auctionId, "bid_placed", { bid })

      return bid
    } catch (error) {
      console.error("Error placing bid:", error)
      throw error
    }
  },

  async requestTournamentExtension(
    tournamentId: string,
    newEndDate: string,
    reason: string,
    requesterId: string,
  ): Promise<TournamentExtension> {
    try {
      // Get current tournament details
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("end_date, created_by")
        .eq("id", tournamentId)
        .single()

      if (!tournament) throw new Error("Tournament not found")

      // Create extension request
      const { data: extension, error } = await supabase
        .from("tournament_extensions")
        .insert({
          tournament_id: tournamentId,
          original_end_date: tournament.end_date,
          new_end_date: newEndDate,
          extension_reason: reason,
          approved_by: requesterId,
          status: tournament.created_by === requesterId ? "approved" : "pending",
        })
        .select()
        .single()

      if (error) throw error

      // If auto-approved (tournament creator), update tournament
      if (tournament.created_by === requesterId) {
        await supabase.from("tournaments").update({ end_date: newEndDate }).eq("id", tournamentId)

        await this.broadcastTournamentUpdate(tournamentId, "tournament_extended", {
          newEndDate,
          reason,
        })
      }

      return extension
    } catch (error) {
      console.error("Error requesting tournament extension:", error)
      throw error
    }
  },

  async getActiveTeamAuctions(tournamentId: string): Promise<TeamAuction[]> {
    try {
      const { data: auctions } = await supabase
        .from("team_auctions")
        .select(`
          *,
          bid_history:team_auction_bids(
            id,
            bidder_name,
            bid_amount,
            timestamp
          )
        `)
        .eq("tournament_id", tournamentId)
        .in("status", ["available", "bidding"])
        .order("created_at", { ascending: false })

      return auctions || []
    } catch (error) {
      console.error("Error loading team auctions:", error)
      return []
    }
  },

  async completeAuction(auctionId: string): Promise<void> {
    try {
      const { data: auction } = await supabase.from("team_auctions").select("*").eq("id", auctionId).single()

      if (!auction) throw new Error("Auction not found")

      // Mark auction as sold
      await supabase.from("team_auctions").update({ status: "sold" }).eq("id", auctionId)

      // If there was a winning bidder, transfer team ownership
      if (auction.highest_bidder_id) {
        await supabase
          .from("tournament_teams")
          .update({
            team_captain: auction.highest_bidder_id,
            auction_price: auction.current_bid,
          })
          .eq("id", auction.team_id)
      }

      await this.broadcastAuctionUpdate(auctionId, "auction_completed", {
        winnerId: auction.highest_bidder_id,
        finalPrice: auction.current_bid,
      })
    } catch (error) {
      console.error("Error completing auction:", error)
      throw error
    }
  },

  async broadcastAuctionUpdate(auctionId: string, event: string, data?: any): Promise<void> {
    try {
      await supabase.channel(`team-auction-${auctionId}`).send({
        type: "broadcast",
        event: event,
        data: data,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error broadcasting auction update:", error)
    }
  },

  async broadcastTournamentUpdate(tournamentId: string, event: string, data?: any): Promise<void> {
    try {
      await supabase.channel(`tournament-${tournamentId}`).send({
        type: "broadcast",
        event: event,
        data: data,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error broadcasting tournament update:", error)
    }
  },
}
