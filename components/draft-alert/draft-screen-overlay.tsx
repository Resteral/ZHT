"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Users, Clock, X, ArrowRight } from "lucide-react"
import { useDraftAlert } from "@/lib/contexts/draft-alert-context"
import Link from "next/link"

export default function DraftScreenOverlay() {
  const { activeDrafts, showDraftScreen, dismissDraftScreen } = useDraftAlert()
  const [timeElapsed, setTimeElapsed] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const updated = { ...prev }
        activeDrafts.forEach((draft) => {
          const startTime = new Date(draft.started_at).getTime()
          const now = new Date().getTime()
          updated[draft.id] = Math.floor((now - startTime) / 1000)
        })
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeDrafts])

  if (!showDraftScreen || activeDrafts.length === 0) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-primary shadow-2xl">
        <CardHeader className="relative">
          <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={dismissDraftScreen}>
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">🚨 Draft Alert!</CardTitle>
              <p className="text-muted-foreground">Captain drafts are starting now</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeDrafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 border rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{draft.league_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {draft.team_size}v{draft.team_size} Snake Draft
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={draft.status === "starting" ? "default" : "secondary"} className="animate-pulse">
                    {draft.status === "starting" ? "Starting" : "Active"}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(timeElapsed[draft.id] || 0)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>Captain: {draft.captain_name}</span>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/captain-draft/${draft.id}`}>Watch Draft</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/captain-draft/${draft.id}`}>
                      <Crown className="h-4 w-4 mr-2" />
                      Join Draft
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Don't miss out on the action! Join now to earn $100 per ELO game.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={dismissDraftScreen} variant="outline">
                Dismiss Alert
              </Button>
              <Button asChild>
                <Link href="/captain-draft">View All Drafts</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
