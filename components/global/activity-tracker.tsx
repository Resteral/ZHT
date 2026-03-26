"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

export function ActivityTracker() {
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const trackActivity = async (activityType: string, details: any) => {
      try {
        await supabase.from("user_activity").insert({
          user_id: user.id,
          activity_type: activityType,
          details,
          created_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[v0] Error tracking activity:", error)
      }
    }

    // Track page views
    const handlePageView = () => {
      trackActivity("page_view", {
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      })
    }

    // Track draft joins
    const handleDraftJoin = (draftId: string) => {
      trackActivity("draft_join", {
        draft_id: draftId,
        timestamp: new Date().toISOString(),
      })
    }

    // Track match completions
    const handleMatchComplete = (matchId: string, result: string) => {
      trackActivity("match_complete", {
        match_id: matchId,
        result,
        timestamp: new Date().toISOString(),
      })
    }

    // Set up event listeners
    window.addEventListener("load", handlePageView)
    window.addEventListener("popstate", handlePageView)

    // Expose tracking functions globally
    ;(window as any).trackActivity = {
      pageView: handlePageView,
      draftJoin: handleDraftJoin,
      matchComplete: handleMatchComplete,
    }

    return () => {
      window.removeEventListener("load", handlePageView)
      window.removeEventListener("popstate", handlePageView)
    }
  }, [user])

  return null
}
