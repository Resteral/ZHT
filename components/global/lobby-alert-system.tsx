"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Trophy, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface LobbyAlert {
  id: string
  name: string
  match_type: string
  max_participants: number
  current_participants: number
  prize_pool: number
  timeUntilStart: number
}

export function LobbyAlertSystem() {
  const [alerts, setAlerts] = useState<LobbyAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [isDisabled, setIsDisabled] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.log("[v0] Supabase not configured, skipping lobby checking")
      return
    }

    const supabase = createClient()

    const checkAndCleanupLobbies = async () => {
      if (isDisabled) {
        return
      }

      try {
        console.log("[v0] Checking for active lobbies...")

        const { data: matches, error } = await supabase
          .from("matches")
          .select(`
            id,
            name,
            match_type,
            max_participants,
            prize_pool,
            status,
            created_at
          `)
          .eq("status", "waiting")
          .limit(10)

        if (error) {
          if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
            console.log("[v0] Network error - will retry later")
            setConsecutiveErrors((prev) => prev + 1)
            return
          }
          throw error
        }

        setConsecutiveErrors(0)

        if (!matches || matches.length === 0) {
          setAlerts([])
          return
        }

        const now = new Date()
        const fullLobbies = []
        const staleLobbyIds = []

        for (const match of matches) {
          const createdAt = new Date(match.created_at)
          const ageInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

          if (ageInMinutes > 5) {
            staleLobbyIds.push(match.id)
            continue
          }

          try {
            const { data: participants, error: participantError } = await supabase
              .from("match_participants")
              .select("user_id")
              .eq("match_id", match.id)

            if (participantError || !participants) continue

            const participantCount = participants.length

            if (participantCount >= match.max_participants && !dismissed.has(match.id)) {
              fullLobbies.push({
                id: match.id,
                name: match.name,
                match_type: match.match_type,
                max_participants: match.max_participants,
                current_participants: participantCount,
                prize_pool: match.prize_pool,
                timeUntilStart: 10,
              })
            }
          } catch (error) {
            continue
          }
        }

        if (staleLobbyIds.length > 0) {
          cleanupStaleLobbies(supabase, staleLobbyIds).catch(() => {
            // Ignore cleanup errors
          })
        }

        setAlerts(fullLobbies)

        for (const lobby of fullLobbies) {
          setTimeout(() => {
            autoStartLobby(supabase, lobby.id, lobby.name)
          }, 10000)
        }
      } catch (error) {
        console.error("[v0] Error checking lobbies:", error)

        setConsecutiveErrors((prev) => {
          const newCount = prev + 1
          if (newCount >= 5) {
            console.log("[v0] Too many consecutive errors, disabling lobby checking temporarily")
            setIsDisabled(true)
            setTimeout(
              () => {
                setIsDisabled(false)
                setConsecutiveErrors(0)
              },
              5 * 60 * 1000,
            )
          }
          return newCount
        })
      }
    }

    const cleanupStaleLobbies = async (supabase: any, lobbyIds: string[]) => {
      await supabase.from("match_participants").delete().in("match_id", lobbyIds)
      await supabase.from("matches").delete().in("id", lobbyIds)
    }

    const autoStartLobby = async (supabase: any, lobbyId: string, lobbyName: string) => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({
            status: "active",
            start_date: new Date().toISOString(),
          })
          .eq("id", lobbyId)

        if (error) throw error

        toast.success(`🎮 ${lobbyName} has started!`, {
          duration: 5000,
          action: {
            label: "View Match",
            onClick: () => router.push(`/leagues/match/${lobbyId}`),
          },
        })

        setAlerts((prev) => prev.filter((alert) => alert.id !== lobbyId))
      } catch (error) {
        // Silently handle auto-start errors
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    checkAndCleanupLobbies()
    intervalRef.current = setInterval(checkAndCleanupLobbies, 120000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [dismissed, isDisabled, router])

  const dismissAlert = (alertId: string) => {
    setDismissed((prev) => new Set([...prev, alertId]))
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const joinLobby = (alertId: string) => {
    router.push(`/leagues/lobby/${alertId}`)
  }

  if (alerts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map((alert) => (
        <Card key={alert.id} className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">Lobby Full!</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{alert.name}</div>

              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className="text-xs">
                  {alert.match_type}
                </Badge>
                <div className="flex items-center gap-1 text-green-600">
                  <Trophy className="h-3 w-3" />${alert.prize_pool}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Starting in 10 seconds...</span>
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => joinLobby(alert.id)} className="flex-1 text-xs h-7">
                  Join Now
                </Button>
                <Button variant="outline" size="sm" onClick={() => dismissAlert(alert.id)} className="text-xs h-7">
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
