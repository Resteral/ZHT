"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useLobbyStats() {
    const [stats, setStats] = useState({
        activeCommandos: 0,
        bountyPool: 0,
        loading: true
    })
    const supabase = createClient()

    useEffect(() => {
        async function fetchStats() {
            try {
                // Fetch active user count
                const { count: userCount } = await supabase
                    .from("users")
                    .select("*", { count: "exact", head: true })

                // Fetch total bounty pool (sum of entry fees in active/completed matches)
                const { data: matchData } = await supabase
                    .from("matches")
                    .select("entry_fee")
                    .neq("status", "cancelled")

                const totalBounty = matchData?.reduce((acc, match) => acc + (match.entry_fee || 0), 0) || 0

                setStats({
                    activeCommandos: userCount || 0,
                    bountyPool: totalBounty,
                    loading: false
                })
            } catch (error) {
                console.error("Error fetching lobby stats:", error)
            }
        }

        fetchStats()

        // Subscribe to changes in matches to update bounty pool
        const matchSubscription = supabase
            .channel("lobby-stats-matches")
            .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
                fetchStats()
            })
            .subscribe()

        // Subscribe to changes in users to update active count
        const userSubscription = supabase
            .channel("lobby-stats-users")
            .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
                fetchStats()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(matchSubscription)
            supabase.removeChannel(userSubscription)
        }
    }, [])

    return stats
}
