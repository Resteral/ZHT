import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { tournamentDraftService } from "@/lib/services/tournament-draft-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, ...data } = await request.json()
    const tournamentId = params.id

    switch (action) {
      case "start_draft":
        const startedState = await tournamentDraftService.startDraft(tournamentId, user.id)
        return NextResponse.json({ success: true, draftState: startedState })

      case "draft_player":
        const { playerId, teamId } = data
        const draftedState = await tournamentDraftService.draftPlayer(tournamentId, playerId, teamId, user.id)
        return NextResponse.json({ success: true, draftState: draftedState })

      case "place_bid":
        const { playerId: bidPlayerId, teamId: bidTeamId, bidAmount } = data
        const bidState = await tournamentDraftService.placeBid(tournamentId, bidPlayerId, bidTeamId, bidAmount, user.id)
        return NextResponse.json({ success: true, draftState: bidState })

      case "start_auction":
        const { playerId: auctionPlayerId } = data
        const auctionState = await tournamentDraftService.startPlayerAuction(tournamentId, auctionPlayerId)
        return NextResponse.json({ success: true, draftState: auctionState })

      case "pause_draft":
        const pausedState = await tournamentDraftService.pauseDraft(tournamentId, user.id)
        return NextResponse.json({ success: true, draftState: pausedState })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Draft API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tournamentId = params.id
    const url = new URL(request.url)
    const type = url.searchParams.get("type")

    switch (type) {
      case "state":
        const draftState = await tournamentDraftService.getDraftState(tournamentId)
        return NextResponse.json({ draftState })

      case "teams":
        const teams = await tournamentDraftService.getTeamsWithRosters(tournamentId)
        return NextResponse.json({ teams })

      case "players":
        const players = await tournamentDraftService.getAvailablePlayers(tournamentId)
        return NextResponse.json({ players })

      case "history":
        const history = await tournamentDraftService.getDraftHistory(tournamentId)
        return NextResponse.json({ history })

      default:
        const { draftState: state, settings } = await tournamentDraftService.initializeDraft(tournamentId)
        const allTeams = await tournamentDraftService.getTeamsWithRosters(tournamentId)
        const allPlayers = await tournamentDraftService.getAvailablePlayers(tournamentId)
        const allHistory = await tournamentDraftService.getDraftHistory(tournamentId)

        return NextResponse.json({
          draftState: state,
          settings,
          teams: allTeams,
          players: allPlayers,
          history: allHistory,
        })
    }
  } catch (error) {
    console.error("Draft API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
