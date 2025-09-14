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
    console.log("[v0] Fetching auction session for tournament:", params.id)

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("player_pool_settings")
      .eq("id", params.id)
      .single()

    if (tournamentError) {
      console.log("[v0] No tournament settings loaded, using fallback of 4 teams")
    } else {
      console.log("[v0] Loaded tournament settings:", tournament)
    }

    const { data: auctionSession, error: sessionError } = await supabase
      .from("tournament_auction_sessions")
      .select("*")
      .eq("tournament_id", params.id)
      .maybeSingle()

    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("[v0] Error fetching auction session:", sessionError)
      return NextResponse.json({ error: "Failed to fetch auction session" }, { status: 500 })
    }

    let currentPlayer = null
    if (auctionSession?.current_player_id) {
      const { data: playerData, error: playerError } = await supabase
        .from("tournament_player_pool")
        .select(`
          id,
          user_id,
          users(username, elo_rating)
        `)
        .eq("id", auctionSession.current_player_id)
        .maybeSingle()

      if (!playerError) {
        currentPlayer = playerData
      }
    }

    const { data: tournamentTeams, error: teamsError } = await supabase
      .from("tournament_teams")
      .select(`
        id,
        team_name,
        team_captain,
        budget_remaining,
        max_players,
        players_acquired,
        users!tournament_teams_team_captain_fkey(username)
      `)
      .eq("tournament_id", params.id)

    if (teamsError) {
      console.error("[v0] Error fetching tournament teams:", teamsError)
    }

    let teamBudgets = []
    if (tournamentTeams && tournamentTeams.length > 0) {
      teamBudgets = tournamentTeams.map((team) => ({
        team_id: team.id,
        team: {
          team_name: team.team_name,
          team_captain: team.team_captain,
          users: team.users,
        },
        current_budget: team.budget_remaining,
        max_players: team.max_players,
        players_acquired: team.players_acquired,
      }))
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
      tournamentSettings: tournament || null,
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
    const body = await request.json()
    const { action } = body

    if (action === "start_auction_with_captains") {
      const { captainIds, userId } = body

      console.log("[v0] Starting auction with captains:", captainIds)

      // Load tournament settings
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("player_pool_settings")
        .eq("id", params.id)
        .single()

      if (tournamentError) throw tournamentError

      const settings = tournament.player_pool_settings || {}
      const auctionBudget = settings.auction_budget || 500
      const playersPerTeam = settings.players_per_team || 4

      const teamPromises = captainIds.map(async (captainPlayerId: string, index: number) => {
        // Get captain player info from tournament_player_pool
        const { data: captainPlayer, error: playerError } = await supabase
          .from("tournament_player_pool")
          .select(`
            id,
            user_id,
            users(username)
          `)
          .eq("id", captainPlayerId)
          .eq("tournament_id", params.id)
          .single()

        if (playerError) {
          console.error("[v0] Error fetching captain player:", playerError)
          throw playerError
        }

        const teamName = `Team ${captainPlayer.users?.username || index + 1}`

        // Create team with the user_id as team_captain
        const { data: team, error: teamError } = await supabase
          .from("tournament_teams")
          .insert({
            tournament_id: params.id,
            team_name: teamName,
            team_captain: captainPlayer.user_id, // Use user_id for team_captain
            budget_remaining: auctionBudget,
            max_players: playersPerTeam,
            players_acquired: 1,
          })
          .select()
          .single()

        if (teamError) {
          console.error("[v0] Error creating team:", teamError)
          throw teamError
        }

        // Update player status to captain using the player pool ID
        const { error: statusError } = await supabase
          .from("tournament_player_pool")
          .update({
            status: "captain",
            captain_type: "selected",
          })
          .eq("id", captainPlayerId) // Use player pool ID
          .eq("tournament_id", params.id)

        if (statusError) {
          console.error("[v0] Error updating player status:", statusError)
          throw statusError
        }

        return team
      })

      const teams = await Promise.all(teamPromises)

      // Get first available non-captain player for auction
      const { data: firstPlayer } = await supabase
        .from("tournament_player_pool")
        .select("id")
        .eq("tournament_id", params.id)
        .eq("status", "available")
        .limit(1)
        .single()

      // Create auction session
      const { data: session, error: sessionError } = await supabase
        .from("tournament_auction_sessions")
        .insert({
          tournament_id: params.id,
          status: "active",
          current_player_id: firstPlayer?.id,
          bid_deadline: new Date(Date.now() + 30000).toISOString(),
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

      // Update tournament status to drafting
      const { error: statusError } = await supabase
        .from("tournaments")
        .update({ status: "drafting" })
        .eq("id", params.id)

      if (statusError) {
        console.error("[v0] Error updating tournament status:", statusError)
      }

      return NextResponse.json({ success: true, session, teams })
    }

    if (action === "start_auction" || action === "start_auction_direct") {
      const { skip_captain_selection } = body

      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("player_pool_settings")
        .eq("id", params.id)
        .single()

      if (tournamentError) throw tournamentError

      const settings = tournament.player_pool_settings || {}
      const auctionBudget = settings.auction_budget || 500
      const playersPerTeam = settings.players_per_team || 4

      if (action === "start_auction_direct" && skip_captain_selection) {
        console.log("[v0] Starting direct auction draft - captains will be selected in auction room")

        // Update tournament status to drafting
        const { error: statusError } = await supabase
          .from("tournaments")
          .update({ status: "drafting" })
          .eq("id", params.id)

        if (statusError) {
          console.error("[v0] Error updating tournament status:", statusError)
        }

        // Create auction session in waiting_for_captains state
        const { data: session, error: sessionError } = await supabase
          .from("tournament_auction_sessions")
          .insert({
            tournament_id: params.id,
            status: "waiting_for_captains",
            started_at: new Date().toISOString(),
            auction_round: 1,
            bid_timer_seconds: 30,
          })
          .select()
          .single()

        if (sessionError) {
          console.error("[v0] Error creating direct auction session:", sessionError)
          throw sessionError
        }

        return NextResponse.json({ success: true, session, direct_mode: true })
      }

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

    if (action === "select_captain") {
      const { player_id, team_name } = body

      console.log("[v0] Selecting captain for direct auction:", { player_id, team_name })

      // Create a new team with the selected captain
      const { data: team, error: teamError } = await supabase
        .from("tournament_teams")
        .insert({
          tournament_id: params.id,
          team_name: team_name || `Team ${Date.now()}`,
          team_captain: player_id,
          budget_remaining: 500,
          max_players: 4,
          players_acquired: 1,
        })
        .select()
        .single()

      if (teamError) {
        console.error("[v0] Error creating team:", teamError)
        throw teamError
      }

      // Update player status to captain
      const { error: playerError } = await supabase
        .from("tournament_player_pool")
        .update({
          status: "captain",
          captain_type: "selected",
        })
        .eq("user_id", player_id)
        .eq("tournament_id", params.id)

      if (playerError) {
        console.error("[v0] Error updating player status:", playerError)
        throw playerError
      }

      return NextResponse.json({ success: true, team })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error in auction action:", error)
    return NextResponse.json({ error: "Failed to process auction action" }, { status: 500 })
  }
}
