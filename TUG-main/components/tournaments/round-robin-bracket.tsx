"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trophy, Play, Clock, Crown, Users, Wifi, WifiOff, RefreshCw, Target } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

interface RoundRobinMatch {
  id: string
  tournament_id: string
  round_number: number
  match_number: number
  team1_id: string
  team2_id: string
  team1_name: string
  team2_name: string
  team1_score: number
  team2_score: number
  winner_id: string | null
  status: "waiting" | "ready" | "live" | "completed"
  scheduled_time?: string
  started_at?: string
  completed_at?: string
  spectator_count: number
}

interface TeamStanding {
  team_id: string
  team_name: string
  matches_played: number
  wins: number
  losses: number
  draws: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

interface RoundRobinBracketProps {
  tournamentId: string
  tournament: any
}

export function RoundRobinBracket({ tournamentId, tournament }: RoundRobinBracketProps) {
  const [matches, setMatches] = useState<RoundRobinMatch[]>([])
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<RoundRobinMatch | null>(null)
  const [score1, setScore1] = useState("")
  const [score2, setScore2] = useState("")
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [currentRound, setCurrentRound] = useState(1)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadRoundRobinData = useCallback(async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("match_number", { ascending: true })

      if (matchError) throw matchError

      const { data: tournamentTeamsData, error: tournamentTeamsError } = await supabase
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournamentId)

      if (tournamentTeamsError) throw tournamentTeamsError

      const captainIds = (tournamentTeamsData || []).map((team) => team.team_captain).filter(Boolean)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username, display_name")
        .in("id", captainIds)

      if (usersError) throw usersError

      const teamLookup = (tournamentTeamsData || []).reduce((acc: Record<string, string>, tournamentTeam: any) => {
        const captain = (usersData || []).find((user) => user.id === tournamentTeam.team_captain)
        acc[tournamentTeam.team_captain] =
          tournamentTeam.team_name || captain?.display_name || captain?.username || "Unknown Team"
        return acc
      }, {})

      const formattedMatches: RoundRobinMatch[] = (matchData || []).map((match: any) => ({
        id: match.id,
        tournament_id: match.tournament_id,
        round_number: Math.ceil(match.match_number / 2) || 1,
        match_number: match.match_number,
        team1_id: match.team1_captain_id,
        team2_id: match.team2_captain_id,
        team1_name: teamLookup[match.team1_captain_id] || "TBD",
        team2_name: teamLookup[match.team2_captain_id] || "TBD",
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        winner_id: match.winner_captain_id,
        status: match.status || "ready",
        scheduled_time: match.scheduled_time,
        started_at: match.started_at,
        completed_at: match.completed_at,
        spectator_count: match.spectator_count || 0,
      }))

      setMatches(formattedMatches)

      calculateStandings(formattedMatches)
      setLastUpdate(new Date())

      console.log("[v0] Loaded round robin data:", formattedMatches.length, "matches")
    } catch (error) {
      console.error("Error loading round robin data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }, [tournamentId, supabase])

  const calculateStandings = (matchData: RoundRobinMatch[]) => {
    const teamStats: Record<string, TeamStanding> = {}

    matchData.forEach((match) => {
      if (!teamStats[match.team1_id]) {
        teamStats[match.team1_id] = {
          team_id: match.team1_id,
          team_name: match.team1_name,
          matches_played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        }
      }
      if (!teamStats[match.team2_id]) {
        teamStats[match.team2_id] = {
          team_id: match.team2_id,
          team_name: match.team2_name,
          matches_played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        }
      }
    })

    matchData
      .filter((match) => match.status === "completed")
      .forEach((match) => {
        const team1Stats = teamStats[match.team1_id]
        const team2Stats = teamStats[match.team2_id]

        team1Stats.matches_played++
        team2Stats.matches_played++
        team1Stats.goals_for += match.team1_score
        team1Stats.goals_against += match.team2_score
        team2Stats.goals_for += match.team2_score
        team2Stats.goals_against += match.team1_score

        if (match.team1_score > match.team2_score) {
          team1Stats.wins++
          team1Stats.points += 3
          team2Stats.losses++
        } else if (match.team2_score > match.team1_score) {
          team2Stats.wins++
          team2Stats.points += 3
          team1Stats.losses++
        } else {
          team1Stats.draws++
          team2Stats.draws++
          team1Stats.points += 1
          team2Stats.points += 1
        }

        team1Stats.goal_difference = team1Stats.goals_for - team1Stats.goals_against
        team2Stats.goal_difference = team2Stats.goals_for - team2Stats.goals_against
      })

    const sortedStandings = Object.values(teamStats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      return b.goals_for - a.goals_for
    })

    setStandings(sortedStandings)
  }

  const generateRoundRobinBracket = async () => {
    try {
      const { data: tournamentTeamsData, error: teamsError } = await supabase
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournamentId)

      if (teamsError) throw teamsError
      if (!tournamentTeamsData || tournamentTeamsData.length < 2) {
        toast.error("Need at least 2 teams to generate round robin bracket")
        return
      }

      const roundRobinMatches = []
      let matchNumber = 1

      // Generate all possible matchups
      for (let i = 0; i < tournamentTeamsData.length; i++) {
        for (let j = i + 1; j < tournamentTeamsData.length; j++) {
          roundRobinMatches.push({
            id: `${tournamentId}-rr-${matchNumber}`,
            tournament_id: tournamentId,
            match_number: matchNumber,
            team1_captain_id: tournamentTeamsData[i].team_captain,
            team2_captain_id: tournamentTeamsData[j].team_captain,
            team1_score: 0,
            team2_score: 0,
            winner_captain_id: null,
            status: "ready",
            created_at: new Date().toISOString(),
          })
          matchNumber++
        }
      }

      // Save matches to database
      const { error: insertError } = await supabase.from("tournament_matches").insert(roundRobinMatches)

      if (insertError) throw insertError

      // Update tournament status
      await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)

      loadRoundRobinData()
      toast.success(`Generated round robin bracket with ${roundRobinMatches.length} matches!`)
    } catch (error) {
      console.error("Error generating round robin bracket:", error)
      toast.error("Failed to generate round robin bracket")
    }
  }

  const updateMatchScore = async () => {
    if (!selectedMatch) return

    try {
      const team1Score = Number.parseInt(score1) || 0
      const team2Score = Number.parseInt(score2) || 0
      let winnerId = null

      if (team1Score > team2Score) {
        winnerId = selectedMatch.team1_id
      } else if (team2Score > team1Score) {
        winnerId = selectedMatch.team2_id
      }

      const { error } = await supabase
        .from("tournament_matches")
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          winner_captain_id: winnerId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedMatch.id)

      if (error) throw error

      loadRoundRobinData()
      setSelectedMatch(null)
      setScore1("")
      setScore2("")
      toast.success("Match score updated successfully!")
    } catch (error) {
      console.error("Error updating match score:", error)
      toast.error("Failed to update match score")
    }
  }

  useEffect(() => {
    loadRoundRobinData()

    const channel = supabase
      .channel(`round-robin-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Real-time round robin update:", payload)
          loadRoundRobinData()
          setLastUpdate(new Date())
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, loadRoundRobinData, supabase])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      const hasLiveMatches = matches.some((m) => m.status === "live")
      if (tournament?.status === "in_progress" && hasLiveMatches) {
        loadRoundRobinData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, matches, tournament?.status, loadRoundRobinData])

  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Round Robin Tournament
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" title="Live updates connected" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Connection lost" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Every team plays every other team • {matches.length} total matches
            <span className="ml-2 text-xs">• Updated {lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tournament?.status === "in_progress" && (
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
          <Button onClick={loadRoundRobinData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {matches.length === 0 && tournament?.participant_count > 0 && tournament?.status === "registration" && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Ready to Generate Round Robin Bracket</h3>
            <p className="text-muted-foreground mb-6">
              {tournament?.participant_count || 0} players registered. Generate the round robin bracket where every team
              plays every other team.
            </p>
            <Button
              onClick={generateRoundRobinBracket}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              <Target className="h-4 w-4 mr-2" />
              Generate Round Robin Bracket
            </Button>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Current Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pos</th>
                      <th className="text-left p-2">Team</th>
                      <th className="text-center p-2">MP</th>
                      <th className="text-center p-2">W</th>
                      <th className="text-center p-2">D</th>
                      <th className="text-center p-2">L</th>
                      <th className="text-center p-2">GF</th>
                      <th className="text-center p-2">GA</th>
                      <th className="text-center p-2">GD</th>
                      <th className="text-center p-2 font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr
                        key={team.team_id}
                        className={`border-b ${index === 0 ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                      >
                        <td className="p-2 font-medium">
                          {index + 1}
                          {index === 0 && <Crown className="inline h-4 w-4 ml-1 text-yellow-500" />}
                        </td>
                        <td className="p-2 font-medium">{team.team_name}</td>
                        <td className="text-center p-2">{team.matches_played}</td>
                        <td className="text-center p-2 text-green-600">{team.wins}</td>
                        <td className="text-center p-2 text-yellow-600">{team.draws}</td>
                        <td className="text-center p-2 text-red-600">{team.losses}</td>
                        <td className="text-center p-2">{team.goals_for}</td>
                        <td className="text-center p-2">{team.goals_against}</td>
                        <td className="text-center p-2 font-medium">
                          {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                        </td>
                        <td className="text-center p-2 font-bold text-lg">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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
                  {matches.filter((m) => m.status === "live").length}
                </div>
                <div className="text-sm text-muted-foreground">Live Now</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {matches.filter((m) => m.status === "ready").length}
                </div>
                <div className="text-sm text-muted-foreground">Ready</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((matches.filter((m) => m.status === "completed").length / matches.length) * 100) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </CardContent>
            </Card>
          </div>

          {rounds.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {rounds.map((round) => (
                <Button
                  key={round}
                  variant={currentRound === round ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentRound(round)}
                >
                  Round {round}
                </Button>
              ))}
              <Button variant={currentRound === 0 ? "default" : "outline"} size="sm" onClick={() => setCurrentRound(0)}>
                All Matches
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches
              .filter((match) => currentRound === 0 || match.round_number === currentRound)
              .map((match) => (
                <Card
                  key={match.id}
                  className={`relative overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                    match.status === "live" ? "ring-2 ring-red-500 ring-opacity-50 shadow-lg shadow-red-500/20" : ""
                  }`}
                >
                  {match.status === "live" && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Round {match.round_number} - Match {match.match_number}
                      </CardTitle>
                      <Badge
                        className={`${
                          match.status === "completed"
                            ? "bg-green-500 text-white"
                            : match.status === "live"
                              ? "bg-red-500 text-white animate-pulse"
                              : match.status === "ready"
                                ? "bg-yellow-500 text-gray-900"
                                : "bg-gray-500 text-white"
                        }`}
                      >
                        {match.status === "completed"
                          ? "Final"
                          : match.status === "live"
                            ? "Live"
                            : match.status === "ready"
                              ? "Ready"
                              : "Waiting"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        match.winner_id === match.team1_id
                          ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {match.winner_id === match.team1_id && <Crown className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium text-sm">{match.team1_name}</span>
                      </div>
                      {match.status === "completed" && <span className="font-bold text-lg">{match.team1_score}</span>}
                    </div>

                    <div className="text-center">
                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">VS</span>
                    </div>

                    <div
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        match.winner_id === match.team2_id
                          ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {match.winner_id === match.team2_id && <Crown className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium text-sm">{match.team2_name}</span>
                      </div>
                      {match.status === "completed" && <span className="font-bold text-lg">{match.team2_score}</span>}
                    </div>

                    {match.status !== "completed" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="w-full mt-3"
                            variant={match.status === "live" ? "default" : "outline"}
                            onClick={() => {
                              setSelectedMatch(match)
                              setScore1(match.team1_score.toString())
                              setScore2(match.team2_score.toString())
                            }}
                          >
                            {match.status === "live" ? (
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
                              <Target className="h-5 w-5" />
                              Update Match Score
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">{match.team1_name}</label>
                                <Input
                                  type="number"
                                  value={score1}
                                  onChange={(e) => setScore1(e.target.value)}
                                  placeholder="Score"
                                  className="text-center text-lg font-bold"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">{match.team2_name}</label>
                                <Input
                                  type="number"
                                  value={score2}
                                  onChange={(e) => setScore2(e.target.value)}
                                  placeholder="Score"
                                  className="text-center text-lg font-bold"
                                />
                              </div>
                            </div>

                            <Button onClick={updateMatchScore} className="w-full" size="lg">
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
        </>
      )}
    </div>
  )
}
