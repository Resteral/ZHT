
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { joinMatch } from "@/lib/actions/match"

export function MatchLobby() {
    const [matches, setMatches] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from("matches")
                .select("*, creator:users(username)")
                .eq("status", "open")
                .order("created_at", { ascending: false })

            setMatches(data || [])
        }
        load()

        const channel = supabase.channel('lobby')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                load()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    if (matches.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                No active matches. Be the first to create one!
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {matches.map(match => (
                <Card key={match.id} className="bg-gray-900/40 border-gray-800">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-white">${match.wager_amount}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-400 border border-blue-800">
                                    {match.team_size}v{match.team_size}
                                </span>
                            </div>
                            <div className="text-sm text-gray-400">
                                Created by {match.creator?.username || 'Unknown'}
                            </div>
                        </div>
                        <form action={async () => {
                            await joinMatch(match.id, 2)
                        }}>
                            <Button variant="outline" className="border-green-800 text-green-400 hover:bg-green-900/50 hover:text-green-300">
                                Accept Challenge
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
