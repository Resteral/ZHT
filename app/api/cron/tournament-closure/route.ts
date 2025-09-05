import { type NextRequest, NextResponse } from "next/server"
import { tournamentAutoClosureService } from "@/lib/services/tournament-auto-closure-service"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Tournament closure cron job triggered")

    // Run automatic tournament closure
    await tournamentAutoClosureService.runAutomaticClosure()

    return NextResponse.json({
      success: true,
      message: "Tournament closure check completed",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in tournament closure cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
