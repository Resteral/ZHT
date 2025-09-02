import { type NextRequest, NextResponse } from "next/server"
import { automaticSeasonalTournamentService } from "@/lib/services/automatic-seasonal-tournament-service"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to add auth)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Cron job triggered for seasonal tournament management")

    await automaticSeasonalTournamentService.runAutomaticSeasonManagement()

    return NextResponse.json({
      success: true,
      message: "Seasonal tournament management completed",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in seasonal tournament cron job:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  // Allow manual triggering via POST
  return GET(request)
}
