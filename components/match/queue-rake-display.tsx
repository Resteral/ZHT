"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { TrendingUp } from "lucide-react"

export function QueueRakeDisplay() {
    const [rakePercentage, setRakePercentage] = useState<number>(0.10)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchRake() {
            try {
                const { data } = await supabase
                    .from("platform_settings")
                    .select("value")
                    .eq("key", "rake_percentage")
                    .single()

                if (data && data.value) {
                    setRakePercentage(parseFloat(data.value))
                }
            } catch (e) {
                console.error("Failed to fetch rake setting:", e)
            } finally {
                setLoading(false)
            }
        }

        fetchRake()
    }, [])

    if (loading) {
        return <div className="h-12 w-full animate-pulse bg-muted/50 rounded-xl mb-6" />
    }

    const displayPercentage = (rakePercentage * 100).toFixed(0)

    return (
        <div className="bg-gradient-to-r from-blue-500/10 via-primary/10 to-indigo-500/10 border-2 border-primary/30 py-3 px-6 rounded-xl flex items-center justify-between shadow-md mb-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-full">
                    <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider">Service Fee</span>
                    <span className="block text-xs text-muted-foreground">Transparent platform fee per entry to support prize hosting</span>
                </div>
            </div>
            <div className="text-3xl font-black bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                {displayPercentage}%
            </div>
        </div>
    )
}
