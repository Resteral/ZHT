"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trophy, Play, Clock, Crown, Zap, Users } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"

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

  useEffect(() => {
    loadBracket()
  }, [tournamentId])

  const loadBracket = async () => {
    try {
      const data = await tournamentService.getBracket(tournamentId)
      setMatches(data)
    } catch (error) {
      console.error("Error loading bracket:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBracket = async () => {
    try {
      await tournamentService.generateBracket(tournamentId)
      loadBracket()
    } catch (error) {
      console.error("Error generating bracket:", error)
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
    } catch (error) {
      console.error("Error updating score:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tournament bracket...</p>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">No Bracket Generated</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {tournament.status === "registration"
                ? "The tournament bracket will be automatically generated when registration closes and the tournament begins."
                : "Generate the tournament bracket to start matches and track progress."}
            </p>
          </div>
          {tournament.status !== "registration" && (
            <Button onClick={handleGenerateBracket} size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Generate Bracket
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Group matches by round
  const rounds = matches.reduce(
    (acc, match) => {
      if (!acc[match.round_number]) {
        acc[match.round_number] = []
      }
      acc[match.round_number].push(match)
      return acc
    },
    {} as Record<number, Match[]>,
  )

  const maxRound = Math.max(...Object.keys(rounds).map(Number))

  const getRoundName = (roundNumber: number) => {
    const totalRounds = maxRound
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
        return "bg-yellow-500 text-black"
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
          </h3>
          <p className="text-sm text-muted-foreground">
            {tournament.tournament_type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} •{" "}
            {matches.length} matches
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tournament.status === "in_progress" && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Users className="h-3 w-3 mr-1" />
              Live Tournament
            </Badge>
          )}
          <Button onClick={loadBracket} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-gradient-to-r from-background to-muted/20 rounded-lg border">
        <div className="flex gap-8 min-w-max p-6">
          {Object.entries(rounds)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([roundNumber, roundMatches]) => (
              <div key={roundNumber} className="space-y-6 min-w-[300px]">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                    {Number(roundNumber) === maxRound && <Crown className="h-4 w-4 text-yellow-500" />}
                    <h4 className="font-bold text-sm">{getRoundName(Number(roundNumber))}</h4>
                  </div>
                </div>

                <div className="space-y-4">
                  {roundMatches
                    .sort((a, b) => a.match_number - b.match_number)
                    .map((match) => (
                      <Card key={match.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Match {match.match_number}</CardTitle>
                            <Badge className={getStatusColor(getMatchStatus(match))}>{getMatchStatus(match)}</Badge>
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
                            {match.status === "completed" && <span className="font-bold text-lg">{match.score1}</span>}
                          </div>

                          {/* VS Divider */}
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
                            {match.status === "completed" && <span className="font-bold text-lg">{match.score2}</span>}
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
    </div>
  )
}
