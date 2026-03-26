"use client"

import { useTournamentDraft } from "@/lib/hooks/use-tournament-draft"
import { DraftSheet } from "@/components/draft/draft-sheet"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function DraftRoomClient({ tournamentId, userId }: { tournamentId: string; userId?: string }) {
    const { draftState, draftSettings, teams, availablePlayers, draftPlayer } = useTournamentDraft(tournamentId, userId)
    const router = useRouter()

    useEffect(() => {
        if (draftState?.status === "completed" || draftState?.status === "active") {
            router.push(`/draft/score/${tournamentId}`)
        }
    }, [draftState?.status, router, tournamentId])

    if (!draftState || !draftSettings) {
        return (
            <div className="flex justify-center items-center py-12 text-muted-foreground">
                Loading draft state...
            </div>
        )
    }

    const draftType = draftSettings.draft_type === "auction" ? "auction"
        : draftSettings.draft_type === "linear" ? "linear"
            : "snake"

    return (
        <DraftSheet
            draftType={draftType}
            teams={teams.map(t => ({
                id: t.id,
                name: t.name,
                owner: t.captain_name,
                ownerId: t.captain_id,
                budget: t.budget_remaining,
                budgetRemaining: t.budget_remaining,
                players: (t.players || []).map(p => ({
                    id: p.id,
                    username: p.username,
                    elo_rating: p.elo_rating,
                    csvStats: p.csv_stats || { goals: 0, assists: 0, saves: 0 },
                    draftCost: p.draft_cost,
                    draftPosition: undefined
                }))
            }))}
            playerPool={availablePlayers.map(p => ({
                id: p.id,
                username: p.username,
                elo_rating: p.elo_rating,
                csvStats: p.csv_stats || { goals: 0, assists: 0, saves: 0 },
                totalScore: p.total_score || 0
            }))}
            currentTurn={draftState.status === "active" ? {
                teamIndex: draftState.current_team_index,
                timeRemaining: draftState.time_remaining
            } : undefined}
            onPlayerDraft={async (playerId, teamId) => {
                await draftPlayer(playerId, teamId)
            }}
            isUserTurn={teams[draftState.current_team_index]?.captain_id === userId}
            userTeamId={teams.find(t => t.captain_id === userId)?.id}
        />
    )
}
