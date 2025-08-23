import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { tournamentDraftSchedulerService } from "@/lib/services/tournament-draft-scheduler-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is tournament organizer
    const { data: tournament } = await supabase.from("tournaments").select("created_by").eq("id", params.id).single()

    if (!tournament || tournament.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const scheduleData = await request.json()
    const schedule = await tournamentDraftSchedulerService.createDraftSchedule(params.id, scheduleData)

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error("Schedule API error:", error)
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

    const schedules = await tournamentDraftSchedulerService.getTournamentDraftSchedules(params.id)
    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Schedule API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { scheduleId } = await request.json()

    // Verify user is tournament organizer
    const { data: tournament } = await supabase.from("tournaments").select("created_by").eq("id", params.id).single()

    if (!tournament || tournament.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await tournamentDraftSchedulerService.cancelDraftSchedule(scheduleId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Schedule API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
