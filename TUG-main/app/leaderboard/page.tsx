"use client"

import { Leaderboards } from "@/components/leagues/leaderboards"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function LeaderboardPage() {
    const router = useRouter()

    return (
        <div className="container mx-auto p-4 max-w-7xl space-y-8 min-h-screen pt-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                        Arena Leaderboards
                    </h1>
                    <p className="text-muted-foreground mt-2">The hall of fame for TUG Arena's top strategic competitors.</p>
                </div>
                <Button variant="outline" onClick={() => router.push("/")}>Back to Lobby</Button>
            </header>

            <Leaderboards />
        </div>
    )
}
