"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { joinMatch, reportResult } from "@/lib/actions/match"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Gamepad2, ExternalLink, Copy, Trophy, Users, Timer, ShieldCheck, ChevronLeft } from "lucide-react"
import { SteamIcon } from "@/components/icons/steam-icon"

export function MatchRoom({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<any>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data: matchData } = await supabase.from("matches")
                .select("*, creator:users(username)")
                .eq("id", matchId)
                .single()

            setMatch(matchData)

            if (matchData) {
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username, avatar_url, steam_id, epic_games_id, elo_rating)")
                    .eq("match_id", matchId)
                setParticipants(parts || [])
            }
        }
        load()

        const channel = supabase.channel(`match:${matchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
                setMatch(payload.new)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${matchId}` }, async () => {
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username, avatar_url, steam_id, epic_games_id, elo_rating)")
                    .eq("match_id", matchId)
                setParticipants(parts || [])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [matchId, supabase])

    if (!match) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-primary font-bold">Initializing Arena...</div>
        </div>
    )

    const team1 = participants.filter(p => p.team_id === 1)
    const team2 = participants.filter(p => p.team_id === 2)
    const userParticipant = participants.find(p => p.user_id === currentUser?.id)

    const prizePool = match.prize_pool || (match.entry_fee * match.team_size * 2 * 0.9).toFixed(2)

    const handleJoin = async (teamId: number) => {
        const res = await joinMatch(matchId, teamId)
        if (res?.error) {
            toast.error(res.error)
        } else {
            // Play join sound
            const audio = new Audio("/sounds/join.mp3")
            audio.play().catch(e => console.error("Failed to play sound:", e))
            
            toast.success(`Entry Confirmed: Team ${teamId}`)
        }
    }

    const handleReport = async (winnerTeam: number) => {
        if (!confirm(`Confirm Result: Team ${winnerTeam} Victory?`)) return
        const res = await reportResult(matchId, winnerTeam)
        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Result Logged: Team ${winnerTeam} Wins`)
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-8 pb-20">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => router.push("/")} 
                        className="p-0 hover:bg-transparent text-muted-foreground hover:text-white transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                        Return to Lobby
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Gamepad2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">The Arena</h1>
                            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Match Instance ID: {matchId.slice(0, 8)}...</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`px-4 py-1.5 rounded-full border-2 font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.05)] ${
                        match.status === 'open' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 
                        match.status === 'in_progress' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                        'border-purple-500/50 text-purple-400 bg-purple-500/10'
                    }`}>
                        {match.status.replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            {/* Prize Pool Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="size-32 text-yellow-500" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Escrowed Prize Pool</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">${prizePool}</span>
                            <span className="text-xl font-bold text-muted-foreground uppercase italic">Credits</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center min-w-[120px]">
                            <Users className="size-5 text-muted-foreground mb-1" />
                            <span className="text-lg font-bold text-white">{participants.length}/{match.team_size * 2}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">Players</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center min-w-[120px]">
                            <Timer className="size-5 text-muted-foreground mb-1" />
                            <span className="text-lg font-bold text-white">${match.entry_fee}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">Buy-In</span>
                        </div>
                    </div>
                </div>
                {/* Glow Effects */}
                <div className="absolute -bottom-20 -left-20 size-64 bg-primary/20 blur-[100px]" />
                <div className="absolute -top-20 -right-20 size-64 bg-purple-500/20 blur-[100px]" />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Team Alpha (1) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-blue-400 uppercase italic tracking-wider flex items-center gap-2">
                                <ShieldCheck className="size-5" /> Team Alpha
                            </h2>
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{team1.length} / {match.team_size} Joined</span>
                    </div>
                    <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm shadow-xl overflow-hidden">
                        <CardContent className="p-2 space-y-1">
                            {team1.map((p, idx) => (
                                <div key={p.user_id} className="group relative flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar className="size-10 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                <AvatarImage src={p.profile?.avatar_url} />
                                                <AvatarFallback className="bg-blue-900/50 text-blue-200">{p.profile?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-[8px] font-black text-white">{idx+1}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{p.profile?.username}</span>
                                                {p.user_id === currentUser?.id && <Badge className="bg-blue-500 hover:bg-blue-600 text-[8px] h-4 px-1 rounded font-black italic">ELITE</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Badge variant="secondary" className="bg-white/5 text-[9px] h-4 rounded px-1.5 border-white/5">{p.profile?.elo_rating} ELO</Badge>
                                                {p.profile?.steam_id && (
                                                    <a href={`https://steamcommunity.com/profiles/${p.profile.steam_id}`} target="_blank" className="text-muted-foreground hover:text-white transition-colors">
                                                        <SteamIcon className="size-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {p.profile?.epic_games_id && (
                                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                            navigator.clipboard.writeText(p.profile.epic_games_id);
                                            toast.success("Epic ID Copied");
                                        }}>
                                            <Copy className="size-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {team1.length < match.team_size && !userParticipant && match.status === 'open' && (
                                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest italic rounded-xl border-t border-white/20 shadow-lg shadow-blue-500/20" onClick={() => handleJoin(1)}>
                                    Join Entry
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Team Omega (2) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-rose-400 uppercase italic tracking-wider flex items-center gap-2">
                            <ShieldCheck className="size-5" /> Team Omega
                        </h2>
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{team2.length} / {match.team_size} Joined</span>
                    </div>
                    <Card className="border-rose-500/20 bg-rose-500/5 backdrop-blur-sm shadow-xl overflow-hidden">
                        <CardContent className="p-2 space-y-1">
                            {team2.map((p, idx) => (
                                <div key={p.user_id} className="group relative flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar className="size-10 border border-white/10 group-hover:border-rose-500/50 transition-colors">
                                                <AvatarImage src={p.profile?.avatar_url} />
                                                <AvatarFallback className="bg-rose-900/50 text-rose-200">{p.profile?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-rose-500 border-2 border-black flex items-center justify-center text-[8px] font-black text-white">{idx+1}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white group-hover:text-rose-400 transition-colors">{p.profile?.username}</span>
                                                {p.user_id === currentUser?.id && <Badge className="bg-rose-500 hover:bg-rose-600 text-[8px] h-4 px-1 rounded font-black italic">ELITE</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Badge variant="secondary" className="bg-white/5 text-[9px] h-4 rounded px-1.5 border-white/5">{p.profile?.elo_rating} ELO</Badge>
                                                {p.profile?.steam_id && (
                                                    <a href={`https://steamcommunity.com/profiles/${p.profile.steam_id}`} target="_blank" className="text-muted-foreground hover:text-white transition-colors">
                                                        <SteamIcon className="size-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {p.profile?.epic_games_id && (
                                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                            navigator.clipboard.writeText(p.profile.epic_games_id);
                                            toast.success("Epic ID Copied");
                                        }}>
                                            <Copy className="size-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {team2.length < match.team_size && !userParticipant && match.status === 'open' && (
                                <Button className="w-full h-14 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest italic rounded-xl border-t border-white/20 shadow-lg shadow-rose-500/20" onClick={() => handleJoin(2)}>
                                    Join Entry
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Winner Announcement */}
            {match.status === 'completed' && (
                <div className="rounded-3xl border-2 border-purple-500/30 bg-purple-500/10 p-12 text-center space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                    <Trophy className="size-16 text-yellow-500 mx-auto drop-shadow-glow" />
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Combat Concluded</h3>
                        <p className="text-purple-300 font-bold uppercase tracking-widest">Victory Awarded to Team {match.winner_team_id === 1 ? 'Alpha' : 'Omega'}</p>
                    </div>
                </div>
            )}

            {/* Operator Controls (Participants Only) */}
            {userParticipant && (match.status === 'open' || match.status === 'in_progress') && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2 px-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Operator Protocol</h3>
                    </div>
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="font-bold text-white">Finalize Results</p>
                                    <p className="text-xs text-muted-foreground">Select the victorious team to distribute the prize pool.</p>
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <Button variant="outline" className="flex-1 md:flex-none border-blue-500/30 hover:bg-blue-500/10 font-bold uppercase italic rounded-xl h-12 px-8" onClick={() => handleReport(1)}>
                                        Alpha Victory
                                    </Button>
                                    <Button variant="outline" className="flex-1 md:flex-none border-rose-500/30 hover:bg-rose-500/10 font-bold uppercase italic rounded-xl h-12 px-8" onClick={() => handleReport(2)}>
                                        Omega Victory
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
