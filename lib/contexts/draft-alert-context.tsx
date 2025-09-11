"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface DraftAlert {
  id: string
  league_name: string
  team_size: number
  captain_name: string
  started_at: string
  status: "starting" | "active" | "completed"
}

interface DraftAlertContextType {
  activeDrafts: DraftAlert[]
  showDraftScreen: boolean
  dismissDraftScreen: () => void
  playAlertSound: () => void
}

const DraftAlertContext = createContext<DraftAlertContextType | undefined>(undefined)

export function DraftAlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeDrafts, setActiveDrafts] = useState<DraftAlert[]>([])
  const [showDraftScreen, setShowDraftScreen] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(ctx)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const draftSubscription = supabase
      .channel("global-draft-alerts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "captain_draft_leagues",
          filter: "status=eq.drafting",
        },
        (payload) => {
          console.log("[v0] Draft status changed:", payload)
          handleDraftStatusChange(payload.new)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "captain_draft_state",
        },
        (payload) => {
          console.log("[v0] New draft state created:", payload)
          handleNewDraftState(payload.new)
        },
      )
      .subscribe()

    return () => {
      draftSubscription.unsubscribe()
    }
  }, [user])

  const handleDraftStatusChange = async (draftData: any) => {
    if (draftData.status === "drafting") {
      const supabase = createClient()
      // Fetch additional draft details
      const { data: leagueData } = await supabase
        .from("captain_draft_leagues")
        .select(`
          *,
          captain_draft_participants!inner(
            users!captain_draft_participants_user_id_fkey(username)
          )
        `)
        .eq("id", draftData.id)
        .eq("captain_draft_participants.is_captain", true)
        .single()

      if (leagueData) {
        const newAlert: DraftAlert = {
          id: draftData.id,
          league_name: leagueData.name,
          team_size: leagueData.team_size,
          captain_name: leagueData.captain_draft_participants[0]?.users?.username || "Unknown",
          started_at: new Date().toISOString(),
          status: "starting",
        }

        setActiveDrafts((prev) => [...prev.filter((d) => d.id !== draftData.id), newAlert])
        setShowDraftScreen(true)
        playAlertSound()
      }
    }
  }

  const handleNewDraftState = async (stateData: any) => {
    // Update existing draft alert to active status
    setActiveDrafts((prev) =>
      prev.map((draft) => (draft.id === stateData.league_id ? { ...draft, status: "active" as const } : draft)),
    )
  }

  const playAlertSound = () => {
    if (!audioContext) return

    try {
      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        audioContext.resume()
      }

      // Create a more complex alert sound
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      // Connect nodes
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Configure sound
      oscillator1.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

      // Create alert pattern
      oscillator1.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1)
      oscillator1.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

      oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime)
      oscillator2.frequency.setValueAtTime(1400, audioContext.currentTime + 0.1)
      oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2)

      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      // Start and stop
      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.5)
      oscillator2.stop(audioContext.currentTime + 0.5)

      console.log("[v0] Draft alert sound played")
    } catch (error) {
      console.error("[v0] Error playing alert sound:", error)
    }
  }

  const dismissDraftScreen = () => {
    setShowDraftScreen(false)
  }

  return (
    <DraftAlertContext.Provider
      value={{
        activeDrafts,
        showDraftScreen,
        dismissDraftScreen,
        playAlertSound,
      }}
    >
      {children}
    </DraftAlertContext.Provider>
  )
}

export function useDraftAlert() {
  const context = useContext(DraftAlertContext)
  if (context === undefined) {
    throw new Error("useDraftAlert must be used within a DraftAlertProvider")
  }
  return context
}
