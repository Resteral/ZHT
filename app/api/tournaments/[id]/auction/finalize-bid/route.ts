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
    const { data: auctionSession, error: sessionError } = await supabase
      .from("tournament_auction_sessions")
      .select("*")
      .eq("tournament_id", params.id)
      .eq("status", "active")
      .single()

    if (sessionError) throw sessionError

    if (!auctionSession.current_bidder_id || !auctionSession.current_player_id) {
      return NextResponse.json({ error: "No active bid to finalize" }, { status: 400 })
    }

    console.log(
      `[v0] Finalizing bid: ${auctionSession.current_bid_amount} for player ${auctionSession.current_player_id}`,
    )

    const { error: bidUpdateError } = await supabase
      .from("tournament_auction_bids")
      .update({ is_winning_bid: true })
      .eq("auction_session_id", auctionSession.id)
      .eq("team_id", auctionSession.current_bidder_id)
      .eq("player_id", auctionSession.current_player_id)
      .eq("bid_amount", auctionSession.current_bid_amount)

    if (bidUpdateError) throw bidUpdateError

    const { error: memberError } = await supabase.from("tournament_team_members").insert({
      team_id: auctionSession.current_bidder_id,
      user_id: auctionSession.current_player_id,
      draft_cost: auctionSession.current_bid_amount,
    })

    if (memberError) throw memberError

    await supabase.rpc("update_team_budget_after_bid", {
      tournament_id_param: params.id,
      team_id_param: auctionSession.current_bidder_id,
      bid_amount_param: auctionSession.current_bid_amount,
    })

    const { error: playerUpdateError } = await supabase
      .from("tournament_player_pool")
      .update({ status: "drafted" })
      .eq("id", auctionSession.current_player_id)

    if (playerUpdateError) throw playerUpdateError

    const { data: nextPlayer } = await supabase
      .from("tournament_player_pool")
      .select("id")
      .eq("tournament_id", params.id)
      .eq("status", "available")
      .limit(1)
      .single()

    if (nextPlayer) {
      const { error: sessionUpdateError } = await supabase
        .from("tournament_auction_sessions")
        .update({
          current_player_id: nextPlayer.id,
          current_bid_amount: 0,
          current_bidder_id: null,
          bid_deadline: null,
        })
        .eq("id", auctionSession.id)

      if (sessionUpdateError) throw sessionUpdateError
    } else {
      // No more players - complete auction
      const { error: completeError } = await supabase
        .from("tournament_auction_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          current_player_id: null,
          current_bid_amount: 0,
          current_bidder_id: null,
        })
        .eq("id", auctionSession.id)

      if (completeError) throw completeError
    }

    console.log(`[v0] Bid finalized successfully`)

    return NextResponse.json({
      success: true,
      nextPlayer: nextPlayer?.id || null,
      auctionComplete: !nextPlayer,
    })
  } catch (error) {
    console.error("[v0] Error finalizing bid:", error)
    return NextResponse.json({ error: "Failed to finalize bid" }, { status: 500 })
  }
}
