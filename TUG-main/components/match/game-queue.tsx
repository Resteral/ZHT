"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { joinMatch } from "@/lib/actions/match"
import { GameConfig, GameMode, getAllowedModesForGame } from "@/lib/game-config"
import { Users, Trophy, Clock, PlayCircle, Loader2, XCircle, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { readyCheckService } from "@/lib/services/ready-check-service"
import { ReadyCheckModal } from "@/components/match/ready-check-modal"
import { useAuth } from "@/lib/auth-context"
import { lobbyQueueService } from "@/lib/services/lobby-queue-service"
import { toast } from "sonner"

interface GameQueueProps {
    game: GameConfig
}

export function GameQueue({ game }: GameQueueProps) {
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [queueCount, setQueueCount] = useState(0)
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            setLoading(true)
            
            // Load active matches
            const { data: matchData } = await supabase
                .from("matches")
                .select("*, creator:users(username)")
                .eq("status", "open")
                .eq("game", game.id)
                .order("created_at", { ascending: false })

            setMatches(matchData || [])
            
            // Load queue count for this game
            const defaultMode = getAllowedModesForGame(game.id)[0]
            const teamSize = defaultMode?.teamSize || 4
            const { count: qCount } = await supabase
                .from("lobby_queue")
                .select("*", { count: "exact", head: true })
                .eq("status", "waiting")
                .eq("player_count", teamSize)

            setQueueCount(qCount || 0)
            setLoading(false)
        }
        load()

        const channel = supabase
            .channel(`${game.id}-lobby-sync`)
            .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
                load()
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "lobby_queue" }, () => {
                load()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [game.id])

    const router = useRouter()
    const { user } = useAuth()
    const [inQueue, setInQueue] = useState(false)
    const [queueLoading, setQueueLoading] = useState(false)

    useEffect(() => {
        if (!user) return
        
        const checkQueue = async () => {
            const { data } = await supabase
                .from("lobby_queue")
                .select("*")
                .eq("user_id", user.id)
                .eq("status", "waiting")
                .single()
            setInQueue(!!data)
        }
        checkQueue()

        // Subscribe to user's queue status changes
        const queueStatusChannel = supabase
            .channel(`user-queue-${user.id}`)
            .on("postgres_changes", 
                { event: "UPDATE", schema: "public", table: "lobby_queue", filter: `user_id=eq.${user.id}` }, 
                (payload) => {
                    if (payload.new.status === 'matched' && payload.old.status === 'waiting') {
                        // Play lobby start sound
                        const audio = new Audio("/sounds/lobby_start.mp3")
                        audio.play().catch(e => console.error("Failed to play sound:", e))
                        toast.success("Match Found! Deployment imminent.")
                        setInQueue(false)
                    } else if (payload.new.status === 'waiting') {
                        setInQueue(true)
                    } else {
                        setInQueue(false)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(queueStatusChannel)
        }
    }, [user])

    const [currentEntryFee, setCurrentEntryFee] = useState<number>(5)

    const handleQueueAction = async (entryFee?: number) => {
        if (!user) return
        setQueueLoading(true)
        try {
            if (inQueue) {
                await lobbyQueueService.leaveQueue(user.id, currentEntryFee)
                setInQueue(false)
                toast.info("Left queue")
            } else {
                const fee = entryFee || 5
                setCurrentEntryFee(fee)
                const defaultMode = getAllowedModesForGame(game.id)[0]
                const teamSize = defaultMode?.teamSize || 4
                
                await lobbyQueueService.joinQueue(user.id, "unmaxed", "snake_draft", teamSize, fee)
                setInQueue(true)
                
                // Play join sound
                const audio = new Audio("/sounds/join.mp3")
                audio.play().catch(e => console.error("Failed to play sound:", e))
                
                toast.success(`Joined ${fee === 5 ? 'Standard' : 'Premier'} Arena ($${fee})!`)
            }
        } catch (error: any) {
            console.error(error)
            const msg = error?.message || "Failed to update queue status"
            toast.error(msg)
        } finally {
            setQueueLoading(false)
        }
    }

    const allowedModes = getAllowedModesForGame(game.id)

    if (loading) {
        return (
            <Card className={`${game.color} bg-opacity-10 border-2`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{game.icon}</span>
                        {game.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="group border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden relative shadow-2xl transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.04]">
            {/* Background Accent Glow */}
            <div className={`absolute -top-20 -right-20 size-64 bg-primary/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
            
            <CardHeader className="relative z-10 border-b border-white/5 pb-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform bg-gradient-to-br from-white/10 to-transparent">
                            {game.icon}
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                {game.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-medium">{game.description}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                            {allowedModes.map((mode) => (
                                <Badge 
                                    key={mode.id} 
                                    className={`bg-white/5 border-white/10 text-white font-black italic tracking-widest text-[10px] uppercase px-3 py-1 rounded-lg ${mode.color.replace('bg-', 'text-')}`}
                                >
                                    {mode.name}
                                </Badge>
                            ))}
                        </div>
                        {inQueue && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse font-bold italic tracking-tighter">
                                DEPLOYED IN QUEUE
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 relative z-10 space-y-6">
                {/* Battle Stations (Queue Actions) */}
                {user && (
                    <div className="bg-black/40 rounded-2xl border border-white/5 p-4 space-y-4 shadow-inner">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground italic flex items-center gap-2">
                                <Zap className="size-3 text-primary" />
                                Select Entry Protocol
                            </span>
                            <span className="text-[11px] uppercase font-black tracking-[0.1em] text-cyan-400 font-mono flex items-center gap-2 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                                <Users className="size-3" />
                                <span className="animate-pulse">{queueCount}</span> OPERATIVES QUEUED
                            </span>
                        </div>
                        
                        {!inQueue ? (
                            <div className="grid grid-cols-5 gap-2">
                                {[5, 10, 25, 50, 100].map((fee) => (
                                    <Button
                                        key={fee}
                                        onClick={() => handleQueueAction(fee)}
                                        disabled={queueLoading}
                                        variant="outline"
                                        className={`h-14 flex flex-col items-center justify-center border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group/btn rounded-xl overflow-hidden relative`}
                                    >
                                        <span className="text-xs text-muted-foreground font-mono group-hover/btn:text-primary transition-colors">Entry</span>
                                        <span className="text-sm font-black text-white italic tracking-tighter">${fee}</span>
                                        {fee >= 50 && (
                                            <div className="absolute top-0 right-0 p-1">
                                                <div className="size-1 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                                            </div>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <Button
                                onClick={() => handleQueueAction()}
                                disabled={queueLoading}
                                variant="destructive"
                                className="w-full h-14 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-black uppercase italic tracking-widest rounded-xl transition-all"
                            >
                                {queueLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <XCircle className="size-5 mr-2" />
                                        Abort Mission (Leave Queue)
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}

                {/* Active Skirmishes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground italic flex items-center gap-2">
                            <Trophy className="size-3 text-amber-500" />
                            Active Arenas
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono opacity-50">{matches.length} Lobbies</Badge>
                    </div>

                    {matches.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                            <PlayCircle className="size-10 mx-auto mb-3 opacity-20" />
                            <p className="font-bold text-sm italic tracking-widest uppercase">Waiting for hostiles...</p>
                            <p className="text-xs opacity-50 font-medium">Join queue to initiate a new match</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {matches.map((match) => (
                                <div 
                                    key={match.id} 
                                    className="group/match bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer shadow-lg"
                                    onClick={() => router.push(`/match/${match.id}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center font-black text-primary italic tracking-tighter">
                                            ${match.entry_fee}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-white uppercase italic tracking-tighter">{game.name} Arena</h4>
                                                <Badge variant="outline" className="text-[10px] px-2 py-0 h-4 border-white/10 font-mono text-muted-foreground">
                                                    {match.team_size}v{match.team_size}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5">
                                                    <Users className="size-3 text-primary" />
                                                    {match.creator?.username || "Ghost"}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="size-3" />
                                                    {new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            size="sm"
                                            className="bg-white/5 hover:bg-primary hover:text-white text-muted-foreground border-white/5 font-black uppercase italic tracking-widest rounded-lg px-4 transition-all"
                                        >
                                            Infiltrate
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
