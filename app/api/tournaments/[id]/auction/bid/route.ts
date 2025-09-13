import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
        })
      },
    },
  })

  try {
    const { teamId, playerId, bidAmount, userId } = await request.json()

    console.log(`[v0] Processing bid: ${bidAmount} from team ${teamId} for player ${playerId}`)

    const { data: teamBudget, error: budgetError } = await supabase
      .from("tournament_team_budgets")
      .select("current_budget, players_acquired, max_players")
      .eq("tournament_id", params.id)
      .eq("team_id", teamId)
      .single()

    if (budgetError) throw budgetError

    if (bidAmount > teamBudget.current_budget) {
      return NextResponse.json({ error: "Insufficient budget" }, { status: 400 })
    }

    if (teamBudget.players_acquired >= teamBudget.max_players) {
      return NextResponse.json({ error: "Team roster is full" }, { status: 400 })
    }

    const { data: auctionSession, error: sessionError } = await supabase
      .from("tournament_auction_sessions")
      .select("*")
      .eq("tournament_id", params.id)
      .eq("status", "active")
      .single()

    if (sessionError) throw sessionError

    if (bidAmount <= auctionSession.current_bid_amount) {
      return NextResponse.json({ error: "Bid must be higher than current bid" }, { status: 400 })
    }

    const { error: bidError } = await supabase.from("tournament_auction_bids").insert({
      auction_session_id: auctionSession.id,
      tournament_id: params.id,
      team_id: teamId,
      player_id: playerId,
      bid_amount: bidAmount,
      auction_round: auctionSession.auction_round,
    })

    if (bidError) throw bidError

    const { error: updateError } = await supabase
      .from("tournament_auction_sessions")
      .update({
        current_bid_amount: bidAmount,
        current_bidder_id: teamId,
        bid_deadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
      })
      .eq("id", auctionSession.id)

    if (updateError) throw updateError

    console.log(`[v0] Bid processed successfully: ${bidAmount}`)

    return NextResponse.json({
      success: true,
      newBidAmount: bidAmount,
      timeRemaining: 30,
    })
  } catch (error) {
    console.error("[v0] Error processing bid:", error)
    return NextResponse.json({ error: "Failed to process bid" }, { status: 500 })
  }
}
