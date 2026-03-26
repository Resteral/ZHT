"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { submitTournamentScore } from "@/lib/actions/tournament"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, CircleDashed, AlertCircle } from "lucide-react"

export function ScoreScreen({ tournamentId }: { tournamentId: string }) {
    const [team1Score, setTeam1Score] = useState("")
    const [team2Score, setTeam2Score] = useState("")
    const [csvCode, setCsvCode] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [result, setResult] = useState<{ elo1: number, elo2: number } | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data: parts } = await supabase
                .from("tournament_participants")
                .select("*, profile:users(username)")
                .eq("tournament_id", tournamentId)

            setParticipants(parts || [])
        }
        load()

        const channel = supabase.channel(`score:${tournamentId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournament_participants',
                filter: `tournament_id=eq.${tournamentId}`
            }, async () => {
                const { data: parts } = await supabase
                    .from("tournament_participants")
                    .select("*, profile:users(username)")
                    .eq("tournament_id", tournamentId)
                setParticipants(parts || [])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [tournamentId, currentUser])

    const playWinSound = async (res: any) => {
        if (!currentUser) return

        // Fetch team membership
        const { data: member } = await supabase
            .from("tournament_team_members")
            .select("team_id, tournament_teams(draft_order)")
            .eq("user_id", currentUser.id)
            .eq("tournament_teams.tournament_id", tournamentId)
            .maybeSingle()

        if (member?.tournament_teams) {
            const teamNum = (member.tournament_teams as any).draft_order // 1 or 2
            const userWon = (teamNum === 1 && res.elo_change_team1 > 0) ||
                          (teamNum === 2 && res.elo_change_team2 > 0)

            if (userWon) {
                const winAudio = new Audio("/sounds/winning_lobby.mp3")
                winAudio.play().catch(e => console.error("Sound play failed", e))
            }
        }
    }

    const submitScore = async () => {
        setSubmitting(true)
        try {
            const res = await submitTournamentScore(
                tournamentId,
                parseInt(team1Score),
                parseInt(team2Score),
                csvCode
            )

            if (res.error) {
                toast.error(res.error)
            } else if (res.consensus) {
                setResult({ elo1: res.elo_change_team1, elo2: res.elo_change_team2 })
                playWinSound(res)
                toast.success("Consensus reached! Match completed and prizes distributed.")
            } else {
                toast.success("Score submitted! Awaiting other players.")
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to submit score")
        } finally {
            setSubmitting(false)
        }
    }

    const allReported = participants.length > 0 && participants.every(p => p.reported_team1_score !== null)

    // Check if there is consensus among those who reported
    const distinctReports = new Set(participants
        .filter(p => p.reported_team1_score !== null)
        .map(p => `${p.reported_team1_score}-${p.reported_team2_score}`)
    )
    const hasConflict = distinctReports.size > 1

    return (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Submit Final Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Team 1 Score</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={team1Score}
                                onChange={e => setTeam1Score(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-lg py-6"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Team 2 Score</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={team2Score}
                                onChange={e => setTeam2Score(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-lg py-6"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Zealot Hockey CSV Stats (Optional)</label>
                            <textarea
                                placeholder="Paste CSV match stats here..."
                                value={csvCode}
                                onChange={e => setCsvCode(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm font-mono focus:ring-1 focus:ring-primary h-24"
                            />
                        </div>
                    </div>

                    {hasConflict && (
                        <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-md flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Scores do not match! Everyone must report the same result.</span>
                        </div>
                    )}

                    <Button
                        onClick={submitScore}
                        disabled={submitting || !team1Score || !team2Score || !!result}
                        className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all"
                    >
                        {submitting ? "Submitting..." : result ? "Results Finalized" : "Report Score"}
                    </Button>

                    {result && (
                        <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
                            <h3 className="text-center font-bold text-lg text-primary">ELO Adjustments</h3>
                            <div className="flex justify-around text-center">
                                <div>
                                    <div className="text-zinc-400 text-xs">Team 1</div>
                                    <div className={`text-xl font-mono ${result.elo1 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.elo1 >= 0 ? '+' : ''}{result.elo1}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-zinc-400 text-xs">Team 2</div>
                                    <div className={`text-xl font-mono ${result.elo2 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.elo2 >= 0 ? '+' : ''}{result.elo2}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Consensus Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {participants.map(p => {
                            const hasReported = p.reported_team1_score !== null
                            return (
                                <div key={p.user_id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className={hasReported ? "text-green-500" : "text-zinc-600"}>
                                            {hasReported ? <CheckCircle2 className="w-5 h-5" /> : <CircleDashed className="w-5 h-5 animate-pulse" />}
                                        </div>
                                        <span className="font-medium">
                                            {p.profile?.username || 'Anonymous'}
                                            {p.user_id === currentUser?.id && <span className="ml-2 text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">YOU</span>}
                                        </span>
                                    </div>
                                    {hasReported && (
                                        <span className="text-sm text-zinc-400">
                                            Reported: {p.reported_team1_score} - {p.reported_team2_score}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {!allReported && (
                        <div className="mt-6 text-center text-sm text-zinc-500">
                            Waiting for all players to report...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
