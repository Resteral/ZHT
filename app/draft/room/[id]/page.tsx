import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DraftRoomClient } from "./draft-room-client" // We'll create a client wrapper for the hook

export default async function DraftRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single()

    if (!tournament) {
        return <div>Tournament not found</div>
    }

    // 'drafting' is the correct status for the draft room
    // Redirect to score page only once the draft is done (active = in-game, completed = done)
    if (tournament.status === "active" || tournament.status === "completed") {
        redirect(`/draft/score/${id}`)
    }

    // If still in ready_check somehow, show holding page
    if (tournament.status === "ready_check") {
        return (
            <div className="container mx-auto p-4 max-w-6xl flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="text-4xl animate-pulse">⚔️</div>
                <h1 className="text-2xl font-bold">Waiting for all players to ready up...</h1>
                <p className="text-muted-foreground">The draft will begin once everyone accepts.</p>
            </div>
        )
    }

    const { data: { user } } = await supabase.auth.getUser()

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-8">
            <h1 className="text-3xl font-bold text-center">Draft Room</h1>
            <p className="text-center text-muted-foreground">{tournament.name}</p>
            <DraftRoomClient tournamentId={id} userId={user?.id} />
        </div>
    )
}
