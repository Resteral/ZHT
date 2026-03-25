"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Zap, Trophy, Users } from "lucide-react"

export const ArenaTicker: React.FC = () => {
    const [events, setEvents] = useState<string[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchRecentMatches = async () => {
            const { count: userCount } = await supabase
                .from("users")
                .select("*", { count: "exact", head: true })

            const { data } = await supabase
                .from("matches")
                .select("entry_fee, team_size, creator:users(username)")
                .order("created_at", { ascending: false })
                .limit(5)

            const eventsList: string[] = []
            if (userCount) {
                eventsList.push(`${userCount.toLocaleString()} GLOBAL COMMANDOS ACTIVE IN THE ARENA PROTOCOL`)
            }

            if (data) {
                const matchEvents = data.map((m: any) => {
                    const creatorData = Array.isArray(m.creator) ? m.creator[0] : m.creator
                    const username = creatorData?.username || 'Unknown'
                    return `New ${m.team_size}v${m.team_size} Arena created by ${username} - $${m.entry_fee} Bounty`
                })
                eventsList.push(...matchEvents)
            }
            setEvents(eventsList)
        }

        fetchRecentMatches()

        const channel = supabase
            .channel("arena-ticker")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, (payload) => {
                fetchRecentMatches()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="w-full bg-white/[0.02] border-y border-white/5 py-3 overflow-hidden absolute bottom-0 left-0 z-20 backdrop-blur-md">
            <div className="flex animate-ticker whitespace-nowrap gap-12">
                {[...events, ...events].map((event, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Zap className="size-3 text-primary fill-primary animate-pulse" />
                            <span className="text-[10px] font-black italic uppercase tracking-[0.2em] text-white/40">Intel</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{event}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
