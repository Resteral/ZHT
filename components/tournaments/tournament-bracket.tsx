"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trophy, Play, Clock, Crown, Users, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

interface Match {
  id: string
  round_number: number
  match_number: number
  participant1: { id: string; team_name: string; user_id: string } | null
  participant2: { id: string; team_name: string; user_id: string } | null
  winner: { id: string; team_name: string; user_id: string } | null
  score1: number
  score2: number
  status: string
  updated_at?: string
}

interface TournamentBracketProps {
  tournamentId: string
  tournament: any
}

export function TournamentBracket({ tournamentId, tournament }: TournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState("")
  const [score2, setScore2] = useState("")
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadBracket = useCallback(async () => {
    try {
      const data = await tournamentService.getBracket(tournamentId)
      setMatches(data)
      setLastUpdate(new Date())

      console.log("[v0] Loaded bracket data:", data)

      // If no matches exist but tournament has participants, suggest bracket generation
      if (data.length === 0 && tournament?.participant_count > 0) {
        console.log("[v0] No bracket found but participants exist, bracket generation available")
      }
    } catch (error) {
      console.error("Error loading bracket:", error)
      toast.error("Failed to load tournament bracket")
    } finally {
      setLoading(false)
    }
  }, [tournamentId, tournament])

  useEffect(() => {
    loadBracket()

    const channel = supabase
      .channel(`tournament-bracket-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_brackets",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Real-time bracket update:", payload)

          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setMatches((prev) => {
              const updated = prev.map((match) => (match.id === payload.new.id ? { ...match, ...payload.new } : match))

              if (payload.eventType === "INSERT" && !prev.find((m) => m.id === payload.new.id)) {
                updated.push(payload.new as Match)
              }

              return updated
            })

            if (payload.eventType === "UPDATE" && payload.new.status === "completed") {
              const match = payload.new as Match
              toast.success(`Match completed: ${match.participant1?.team_name} vs ${match.participant2?.team_name}`)
            }

            setLastUpdate(new Date())
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true)
      })
      .on("presence", { event: "leave" }, () => {
        setIsConnected(false)
      })
      .subscribe((status) => {
        console.log("[v0] Subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, loadBracket, supabase])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      const hasLiveMatches = matches.some((m) => m.status === "in_progress")
      if (tournament.status === "in_progress" && hasLiveMatches) {
        loadBracket()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, matches, tournament.status, loadBracket])

  const handleGenerateBracket = async () => {
    try {
      await tournamentService.generateBracket(tournamentId)
      loadBracket()
      toast.success("Tournament bracket generated successfully!")
    } catch (error) {
      console.error("Error generating bracket:", error)
      toast.error("Failed to generate tournament bracket")
    }
  }

  const handleUpdateScore = async () => {
    if (!selectedMatch) return

    try {
      await tournamentService.updateMatchScore(selectedMatch.id, {
        score1: Number.parseInt(score1) || 0,
        score2: Number.parseInt(score2) || 0,
      })
      loadBracket()
      setSelectedMatch(null)
      setScore1("")
      setScore2("")
      toast.success("Match score updated successfully!")
    } catch (error) {
      console.error("Error updating score:", error)
      toast.error("Failed to update match score")
    }
  }

  const getRoundName = (roundNumber: number) => {
    const totalRounds = Math.max(...matches.map((match) => match.round_number))
    if (roundNumber === totalRounds) return "Final"
    if (roundNumber === totalRounds - 1) return "Semi-Final"
    if (roundNumber === totalRounds - 2) return "Quarter-Final"
    return `Round ${roundNumber}`
  }

  const getMatchStatus = (match: Match) => {
    if (match.status === "completed") return "Completed"
    if (match.status === "in_progress") return "Live"
    if (!match.participant1 || !match.participant2) return "Waiting"
    return "Ready"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500 text-white"
      case "Live":
        return "bg-red-500 text-white animate-pulse"
      case "Ready":
        return "bg-yellow-500 text-gray-900"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament Bracket
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" title="Live updates connected" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Connection lost" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tournament.tournament_type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} •{" "}
            {matches.length} matches
            <span className="ml-2 text-xs">• Updated {lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tournament.status === "in_progress" && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 animate-pulse">
              <Users className="h-3 w-3 mr-1" />
              Live Tournament
            </Badge>
          )}
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto-refresh
          </Button>
          <Button onClick={loadBracket} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {matches.length === 0 && tournament?.participant_count > 0 && tournament.status === "registration" && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Ready to Generate Bracket</h3>
            <p className="text-muted-foreground mb-6">
              {tournament.participant_count} players registered. Generate the tournament bracket to begin matches.
            </p>
            <Button onClick={handleGenerateBracket} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Trophy className="h-4 w-4 mr-2" />
              Generate Tournament Bracket
            </Button>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && tournament?.participant_count === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Waiting for Players</h3>
            <p className="text-muted-foreground">
              The tournament bracket will be available once players register for the tournament.
            </p>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {matches.filter((m) => m.status === "completed").length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600 animate-pulse">
                  {matches.filter((m) => m.status === "in_progress").length}
                </div>
                <div className="text-sm text-muted-foreground">Live Now</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {matches.filter((m) => m.status === "ready" && m.participant1 && m.participant2).length}
                </div>
                <div className="text-sm text-muted-foreground">Ready</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {matches.filter((m) => !m.participant1 || !m.participant2).length}
                </div>
                <div className="text-sm text-muted-foreground">Waiting</div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto bg-gradient-to-r from-background to-muted/20 rounded-lg border">
            <div className="flex gap-8 min-w-max p-6">
              {Object.entries(
                matches.reduce(
                  (acc, match) => {
                    if (!acc[match.round_number]) {
                      acc[match.round_number] = []
                    }
                    acc[match.round_number].push(match)
                    return acc
                  },
                  {} as Record<number, Match[]>,
                ),
              ).map(([roundNumber, roundMatches]) => (
                <div key={roundNumber} className="space-y-6 min-w-[300px]">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                      {Number(roundNumber) === Math.max(...matches.map((match) => match.round_number)) && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <h4 className="font-bold text-sm">{getRoundName(Number(roundNumber))}</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {roundMatches
                      .sort((a, b) => a.match_number - b.match_number)
                      .map((match) => (
                        <Card
                          key={match.id}
                          className={`relative overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                            match.status === "in_progress"
                              ? "ring-2 ring-red-500 ring-opacity-50 shadow-lg shadow-red-500/20"
                              : ""
                          }`}
                        >
                          {match.status === "in_progress" && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />
                          )}

                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">Match {match.match_number}</CardTitle>
                              <Badge
                                className={`${getStatusColor(getMatchStatus(match))} ${
                                  match.status === "in_progress" ? "animate-pulse" : ""
                                }`}
                              >
                                {getMatchStatus(match)}
                                {match.status === "in_progress" && (
                                  <div className="ml-1 w-2 h-2 bg-white rounded-full animate-ping" />
                                )}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            <div
                              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                match.winner?.id === match.participant1?.id
                                  ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                                  : "bg-muted/30 hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {match.winner?.id === match.participant1?.id && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="font-medium text-sm">{match.participant1?.team_name || "TBD"}</span>
                              </div>
                              {match.status === "completed" && (
                                <span className="font-bold text-lg">{match.score1}</span>
                              )}
                            </div>

                            <div className="text-center">
                              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
                                VS
                              </span>
                            </div>

                            <div
                              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                match.winner?.id === match.participant2?.id
                                  ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                                  : "bg-muted/30 hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {match.winner?.id === match.participant2?.id && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="font-medium text-sm">{match.participant2?.team_name || "TBD"}</span>
                              </div>
                              {match.status === "completed" && (
                                <span className="font-bold text-lg">{match.score2}</span>
                              )}
                            </div>

                            {match.participant1 && match.participant2 && match.status !== "completed" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="w-full mt-3"
                                    variant={match.status === "in_progress" ? "default" : "outline"}
                                    onClick={() => {
                                      setSelectedMatch(match)
                                      setScore1(match.score1.toString())
                                      setScore2(match.score2.toString())
                                    }}
                                  >
                                    {match.status === "in_progress" ? (
                                      <>
                                        <Clock className="h-3 w-3 mr-2" />
                                        Update Score
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-2" />
                                        Start Match
                                      </>
                                    )}
                                  </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Trophy className="h-5 w-5" />
                                      Update Match Score
                                    </DialogTitle>
                                  </DialogHeader>

                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">{match.participant1?.team_name}</label>
                                        <Input
                                          type="number"
                                          value={score1}
                                          onChange={(e) => setScore1(e.target.value)}
                                          placeholder="Score"
                                          className="text-center text-lg font-bold"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">{match.participant2?.team_name}</label>
                                        <Input
                                          type="number"
                                          value={score2}
                                          onChange={(e) => setScore2(e.target.value)}
                                          placeholder="Score"
                                          className="text-center text-lg font-bold"
                                        />
                                      </div>
                                    </div>

                                    <Button onClick={handleUpdateScore} className="w-full" size="lg">
                                      <Trophy className="h-4 w-4 mr-2" />
                                      Update Score
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
