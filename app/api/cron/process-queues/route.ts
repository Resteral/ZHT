import { NextResponse } from "next/server"
import { processQueue } from "@/lib/queue-processor"

export const dynamic = "force-dynamic"

export async function GET() {
    const games = ["Omega Strikers", "Deadlock"]
    const queueConfigs = [
        // Standard Maxed Queues
        { type: "maxed" as const, format: "snake_draft", count: 4, fee: 0 },
        { type: "maxed" as const, format: "auction_draft", count: 4, fee: 0 },
        { type: "maxed" as const, format: "snake_draft", count: 4, fee: 10 },
        { type: "maxed" as const, format: "auction_draft", count: 4, fee: 10 },
        { type: "maxed" as const, format: "snake_draft", count: 4, fee: 25 },

        // Quick Play (Unmaxed) Queues
        { type: "unmaxed" as const, format: "snake_draft", count: 4, fee: 0 },
    ]

    const results = []

    for (const game of games) {
        for (const config of queueConfigs) {
            try {
                const matchId = await processQueue(
                    game,
                    config.type,
                    config.format,
                    config.count,
                    config.fee
                )
                if (matchId) {
                    results.push({ game, ...config, matchId })
                }
            } catch (error) {
                console.error(`Error processing queue ${game} ${config.format}:`, error)
            }
        }
    }

    return NextResponse.json({ processed: true, matches_created: results })
}
