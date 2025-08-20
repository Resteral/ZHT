"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Users, Eye, Play } from "lucide-react"
import { useRouter } from "next/navigation"

interface ActiveMatch {
  id: string
  name: string
  status: "waiting" | "active" | "drafting" | "completed"
  current_participants: number
  max_participants: number
  participant_names: string
  is_user_in_match: boolean
}

export default function ActiveMatchNotification() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const checkActiveMatches = async () => {
      const supabase = createClient()

      try {
        // Check for active matches/lobbies
        const { data: matches, error } = await supabase
          .from("matches")
          .select(`
            id,
            name,
            status,
            max_participants,
            match_participants!inner(user_id),
            created_at
          `)
          .in("status", ["waiting", "active", "drafting"])
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) {
          console.error("[v0] Error fetching active matches:", error)
          return
        }

        if (matches && matches.length > 0) {
          // Find if user is in any active match
          const userMatch = matches.find((match) => match.match_participants.some((p: any) => p.user_id === user.id))

          if (userMatch) {
            // User is in an active match
            setActiveMatch({
              id: userMatch.id,
              name: userMatch.name || "Active Match",
              status: userMatch.status as any,
              current_participants: userMatch.match_participants.length,
              max_participants: userMatch.max_participants,
              participant_names: "",
              is_user_in_match: true,
            })
            setIsVisible(true)
          } else {
            // Check for spectatable matches
            const spectateMatch = matches[0]
            if (spectateMatch && spectateMatch.status === "active") {
              setActiveMatch({
                id: spectateMatch.id,
                name: spectateMatch.name || "Active Match",
                status: spectateMatch.status as any,
                current_participants: spectateMatch.match_participants.length,
                max_participants: spectateMatch.max_participants,
                participant_names: "",
                is_user_in_match: false,
              })
              setIsVisible(true)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error checking active matches:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkActiveMatches()

    // Set up real-time subscription for match updates
    const supabase = createClient()
    const subscription = supabase
      .channel("active_matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => checkActiveMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants" }, () => checkActiveMatches())
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const handleNavigate = () => {
    if (!activeMatch) return

    if (activeMatch.is_user_in_match) {
      // Navigate to their active match
      if (activeMatch.status === "waiting") {
        router.push(`/leagues/lobby/${activeMatch.id}`)
      } else if (activeMatch.status === "drafting") {
        router.push(`/draft/room/${activeMatch.id}`)
      } else if (activeMatch.status === "active") {
        router.push(`/draft/score/${activeMatch.id}`)
      }
    } else {
      // Navigate to spectate
      router.push(`/draft/room/${activeMatch.id}`)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (isLoading || !isVisible || !activeMatch) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500"
      case "active":
        return "bg-green-500"
      case "drafting":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "Waiting for Players"
      case "active":
        return "Match in Progress"
      case "drafting":
        return "Draft in Progress"
      default:
        return status
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <Card className="w-80 bg-gray-900 border-gray-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {activeMatch.is_user_in_match ? (
                <Play className="h-4 w-4 text-green-400" />
              ) : (
                <Eye className="h-4 w-4 text-blue-400" />
              )}
              <span className="text-sm font-medium text-white">
                {activeMatch.is_user_in_match ? "You're in a match!" : "Live Match Available"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{activeMatch.name}</span>
              <Badge className={`${getStatusColor(activeMatch.status)} text-white text-xs`}>
                {getStatusText(activeMatch.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Users className="h-3 w-3" />
              <span>
                {activeMatch.current_participants}/{activeMatch.max_participants} players
              </span>
            </div>
          </div>

          <Button onClick={handleNavigate} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
            {activeMatch.is_user_in_match ? "Return to Match" : "Spectate Match"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
