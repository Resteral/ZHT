"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { ReadyCheckModal } from "@/components/match/ready-check-modal"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function GlobalLobbyListener() {
    const { user } = useAuth()
    const supabase = createClient()

    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel(`global-queue-listener-${user.id}`)
            .on("postgres_changes", 
                { event: "UPDATE", schema: "public", table: "lobby_queue", filter: `user_id=eq.${user.id}` }, 
                (payload) => {
                    if (payload.new.status === 'matched' && payload.old.status === 'waiting') {
                        // Play lobby start sound
                        const audio = new Audio("/sounds/lobby_start.mp3")
                        audio.play().catch(e => console.error("Failed to play sound:", e))
                        toast.success("Match Found! Deployment imminent.")
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    if (!user) return null

    return <ReadyCheckModal userId={user.id} />
}
