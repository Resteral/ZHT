import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
      .maybeSingle()

    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("[v0] Error fetching auction session:", sessionError)
    }

    let currentPlayer = null
    if (auctionSession?.current_player_id) {
      const { data: playerData } = await supabase
        .from("tournament_player_pool")
        .select(`
          id,
          user_id,
          users(username, elo_rating)
        `)
        .eq("id", auctionSession.current_player_id)
        .single()

      currentPlayer = playerData
    }

    const { data: teamBudgets, error: budgetError } = await supabase
      .from("tournament_teams")
      .select(`
        id,
        team_name,
        team_captain,
        budget_remaining,
        users!tournament_teams_team_captain_fkey(username)
      `)
      .eq("tournament_id", params.id)

    if (budgetError) {
      console.error("[v0] Error fetching team budgets:", budgetError)
    }

    const { data: playerPool, error: poolError } = await supabase
      .from("tournament_player_pool")
      .select(`
        id,
        user_id,
        status,
        users(username, elo_rating)
      `)
      .eq("tournament_id", params.id)
      .eq("status", "available")

    if (poolError) {
      console.error("[v0] Error fetching player pool:", poolError)
    }

    return NextResponse.json({
      auctionSession: auctionSession ? { ...auctionSession, current_player: currentPlayer } : null,
      teamBudgets: teamBudgets || [],
      playerPool: playerPool || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching auction data:", error)
    return NextResponse.json({ error: "Failed to fetch auction data" }, { status: 500 })
  }
}

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
    const { action } = await request.json()

    if (action === "start_auction") {
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("player_pool_settings")
        .eq("id", params.id)
        .single()

      if (tournamentError) throw tournamentError

      const settings = tournament.player_pool_settings || {}
      const auctionBudget = settings.auction_budget || 500
      const playersPerTeam = settings.players_per_team || 4

      const { error: budgetError } = await supabase
        .from("tournament_teams")
        .update({ budget_remaining: auctionBudget })
        .eq("tournament_id", params.id)

      if (budgetError) {
        console.error("[v0] Error initializing team budgets:", budgetError)
      }

      // Get first available player
      const { data: firstPlayer } = await supabase
        .from("tournament_player_pool")
        .select("id")
        .eq("tournament_id", params.id)
        .eq("status", "available")
        .limit(1)
        .single()

      const { data: session, error: sessionError } = await supabase
        .from("tournament_auction_sessions")
        .insert({
          tournament_id: params.id,
          status: "active",
          current_player_id: firstPlayer?.id,
          bid_deadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
          started_at: new Date().toISOString(),
          auction_round: 1,
          bid_timer_seconds: 30,
        })
        .select()
        .single()

      if (sessionError) {
        console.error("[v0] Error creating auction session:", sessionError)
        throw sessionError
      }

      return NextResponse.json({ success: true, session })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error in auction action:", error)
    return NextResponse.json({ error: "Failed to process auction action" }, { status: 500 })
  }
}
