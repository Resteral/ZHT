import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ScoreScreen } from "@/components/draft/score-screen" // We will create this component

export default async function ScoreRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single()

    if (!tournament) {
        return <div>Tournament not found</div>
    }

    if (tournament.status === "completed") {
        return (
            <div className="container mx-auto p-4 max-w-4xl text-center">
                <h1 className="text-3xl font-bold mb-4">Match Completed</h1>
                <p>The results for this match have been finalized.</p>
                {/* Could show final score here */}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-8">
            <h1 className="text-3xl font-bold text-center">Report Match Score</h1>
            <p className="text-center text-muted-foreground">{tournament.name}</p>
            <p className="text-center text-sm font-semibold bg-primary/10 p-2 rounded-md">
                All players must report the exact same score for the match to complete and payouts to be distributed.
            </p>
            <ScoreScreen tournamentId={id} />
        </div>
    )
}
