"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Pause, Square } from "lucide-react"
import Link from "next/link"
import { useRealtimeGame } from "@/lib/hooks/use-realtime"

export default function LiveGameManagement({ params }: { params: { id: string } }) {
  const { gameState, events } = useRealtimeGame(params.id)
  const [localGameState, setLocalGameState] = useState({
    team1Score: 0,
    team2Score: 0,
    currentRound: 1,
    totalRounds: 30,
    timeRemaining: "45:30",
    status: "live",
    events: [] as Array<{ time: string; event: string; team?: string }>,
  })

  useEffect(() => {
    if (gameState) {
      setLocalGameState((prev) => ({
        ...prev,
        team1Score: gameState.team1_score || 0,
        team2Score: gameState.team2_score || 0,
        currentRound: gameState.current_round || 1,
        status: gameState.status || "live",
        timeRemaining: gameState.time_remaining || "45:30",
      }))
    }
  }, [gameState])

  useEffect(() => {
    if (events.length > 0) {
      setLocalGameState((prev) => ({
        ...prev,
        events: events.map((event) => ({
          time: new Date(event.created_at).toLocaleTimeString(),
          event: event.event_type,
          team: event.team_name,
        })),
      }))
    }
  }, [events])

  // Mock game data
  const gameData = {
    id: params.id,
    title: "CS Championship Finals",
    game: "Counter Strike",
    team1: "Team Alpha",
    team2: "Team Beta",
    tournament: "Winter Championship",
    venue: "Arena 1",
  }

  const addEvent = async (event: string, team?: string) => {
    try {
      const response = await fetch(`/api/games/${params.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: event,
          team_name: team,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        // Real-time subscription will handle the update
        console.log("Event added successfully")
      }
    } catch (error) {
      console.error("Failed to add event:", error)
    }
  }

  const updateScore = async (team: "team1" | "team2", increment: number) => {
    const newScore = Math.max(0, localGameState[team === "team1" ? "team1Score" : "team2Score"] + increment)

    try {
      const response = await fetch(`/api/games/${params.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [team === "team1" ? "team1_score" : "team2_score"]: newScore,
        }),
      })

      if (response.ok) {
        // Real-time subscription will handle the update
        console.log("Score updated successfully")
      }
    } catch (error) {
      console.error("Failed to update score:", error)
      // Fallback to local update
      setLocalGameState((prev) => ({
        ...prev,
        [team === "team1" ? "team1Score" : "team2Score"]: newScore,
      }))
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/games">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Game Management</h1>
          <p className="text-muted-foreground">
            {gameData.title} - {gameData.tournament}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Badge variant="destructive">LIVE</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score & Game Control</CardTitle>
            <CardDescription>Manage live game scores and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="flex items-center justify-center gap-8 p-6 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">{gameData.team1}</div>
                <div className="text-4xl font-bold">{localGameState.team1Score}</div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => updateScore("team1", 1)}>
                    +1
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateScore("team1", -1)}>
                    -1
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Round {localGameState.currentRound}/{localGameState.totalRounds}
                </div>
                <div className="text-xs text-muted-foreground">{localGameState.timeRemaining}</div>
              </div>

              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">{gameData.team2}</div>
                <div className="text-4xl font-bold">{localGameState.team2Score}</div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => updateScore("team2", 1)}>
                    +1
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateScore("team2", -1)}>
                    -1
                  </Button>
                </div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex justify-center gap-4">
              <Button className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                End Game
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quick Events - {gameData.team1}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => addEvent("Kill", gameData.team1)}>
                    Kill
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addEvent("Assist", gameData.team1)}>
                    Assist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addEvent("Objective", gameData.team1)}>
                    Objective
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Events - {gameData.team2}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => addEvent("Kill", gameData.team2)}>
                    Kill
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addEvent("Assist", gameData.team2)}>
                    Assist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addEvent("Objective", gameData.team2)}>
                    Objective
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Events */}
        <Card>
          <CardHeader>
            <CardTitle>Live Events</CardTitle>
            <CardDescription>Real-time game events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {localGameState.events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
              ) : (
                localGameState.events.map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <div className="text-xs text-muted-foreground">{event.time}</div>
                    <div className="text-sm">
                      {event.team && (
                        <Badge variant="outline" className="mr-2">
                          {event.team}
                        </Badge>
                      )}
                      {event.event}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
