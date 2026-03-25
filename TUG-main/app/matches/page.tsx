"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Gamepad2, Trophy, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function MyMatchesPage() {
    const [activeMatches, setActiveMatches] = useState<any[]>([])
    const [completedMatches, setCompletedMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function loadMatches() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/auth/login")
                return
            }

            // Fetch matches where user is a participant
            const { data: participations, error } = await supabase
                .from("match_participants")
                .select(`
                    match_id,
                    team,
                    matches (
                        id,
                        game_mode,
                        entry_fee,
                        status,
                        winner_team_id,
                        created_at,
                        team_size
                    )
                `)
                .eq("user_id", user.id)
                .order("joined_at", { ascending: false })

            if (participations) {
                const matches = participations.map((p: any) => ({
                    ...p.matches,
                    user_team: p.team
                }))

                setActiveMatches(matches.filter(m => m.status === 'open' || m.status === 'in_progress' || m.status === 'starting'))
                setCompletedMatches(matches.filter(m => m.status === 'completed' || m.status === 'disputed' || m.status === 'cancelled'))
            }
            setLoading(false)
        }

        loadMatches()
    }, [supabase, router])

    if (loading) {
        return <div className="container mx-auto p-8 text-center">Loading your arena history...</div>
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-12">
            <header className="flex flex-col gap-2">
                <Button variant="ghost" className="w-fit -ml-4 mb-2 text-gray-500 hover:text-white" onClick={() => router.push("/")}>
                    <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                    Back to Lobby
                </Button>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">My Arena History</h1>
                <p className="text-gray-400">Track your active competitions and review past performance.</p>
            </header>

            <section className="space-y-6">
                <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-sm">
                    <Clock className="w-4 h-4" />
                    Active Arenas
                </div>
                {activeMatches.length === 0 ? (
                    <Card className="border-dashed border-gray-800 bg-transparent">
                        <CardContent className="p-12 text-center">
                            <Gamepad2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No active matches. Join a queue to start!</p>
                            <Button asChild variant="outline" className="mt-6 border-blue-500/50 hover:bg-blue-500/10 text-blue-400">
                                <Link href="/">Browse Lobby</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {activeMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-widest text-sm">
                    <Trophy className="w-4 h-4" />
                    Completed & Past
                </div>
                {completedMatches.length === 0 ? (
                    <p className="text-gray-600 italic">No completed matches found.</p>
                ) : (
                    <div className="grid gap-4">
                        {completedMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

function MatchCard({ match }: { match: any }) {
    const isWinner = match.status === 'completed' && match.winner_team_id === match.user_team
    const isCancelled = match.status === 'cancelled'

    return (
        <Link href={`/match/${match.id}`}>
            <Card className={`border-l-4 hover:translate-x-1 transition-all cursor-pointer ${match.status === 'completed'
                ? (isWinner ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-800 bg-red-950/10')
                : 'border-l-blue-500 bg-blue-950/10'
                }`}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center font-bold text-xl text-gray-400 italic">
                            {match.game_mode?.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-white capitalize">{match.game_mode} Arena</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${match.status === 'completed' ? 'bg-gray-800 text-gray-400' : 'bg-blue-500 text-white animate-pulse'
                                    }`}>
                                    {match.status}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                                <span>{match.team_size}v{match.team_size}</span>
                                <span>•</span>
                                <span>${match.entry_fee} Entry</span>
                                <span>•</span>
                                <span>{new Date(match.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {match.status === 'completed' && (
                            <div className={`text-right ${isWinner ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                                {isWinner ? 'VICTORY' : 'DEFEAT'}
                            </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
