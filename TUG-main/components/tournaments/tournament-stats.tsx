"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, TrendingUp, Target, Clock, DollarSign, BarChart3, Crown, Award, Activity } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createClient } from "@/lib/supabase/client"

interface TournamentStatsProps {
  tournamentId: string
}

interface PlayerStats {
  id: string
  team_name: string
  user_id: string
  wins: number
  losses: number
  total_score: number
  avg_score: number
  matches_played: number
  win_rate: number
  earnings: number
}

interface MatchStats {
  total_matches: number
  completed_matches: number
  avg_match_duration: number
  highest_score: number
  total_prize_distributed: number
  total_earnings: number
}

export function TournamentStats({ tournamentId }: TournamentStatsProps) {
  const [tournament, setTournament] = useState<any>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTournamentStats()
  }, [tournamentId])

  const loadTournamentStats = async () => {
    try {
      // Load tournament details
      const tournamentData = await tournamentService.getTournament(tournamentId)
      setTournament(tournamentData)

      // Load player statistics
      const { data: participants } = await supabase
        .from("tournament_participants")
        .select(`
          *,
          user:users(username, avatar_url)
        `)
        .eq("tournament_id", tournamentId)

      // Load match data for statistics
      const { data: matches } = await supabase.from("tournament_matches").select("*").eq("tournament_id", tournamentId)

      if (participants && matches) {
        // Calculate player stats
        const stats = participants.map((participant: any) => {
          const playerMatches = matches.filter(
            (match: any) => match.participant1_id === participant.id || match.participant2_id === participant.id,
          )

          const wins = playerMatches.filter((match: any) => match.winner_id === participant.id).length
          const losses = playerMatches.filter(
            (match: any) =>
              match.status === "completed" &&
              match.winner_id !== participant.id &&
              (match.participant1_id === participant.id || match.participant2_id === participant.id),
          ).length

          const totalScore = playerMatches.reduce((sum: number, match: any) => {
            if (match.participant1_id === participant.id) return sum + (match.score1 || 0)
            if (match.participant2_id === participant.id) return sum + (match.score2 || 0)
            return sum
          }, 0)

          const matchesPlayed = playerMatches.filter((match: any) => match.status === "completed").length
          const avgScore = matchesPlayed > 0 ? totalScore / matchesPlayed : 0
          const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0
          const earnings = matchesPlayed * 10 + wins * 25 // $10 per game + $25 per win

          return {
            id: participant.id,
            team_name: participant.team_name || participant.user.username,
            user_id: participant.user_id,
            wins,
            losses,
            total_score: totalScore,
            avg_score: avgScore,
            matches_played: matchesPlayed,
            win_rate: winRate,
            earnings,
          }
        })

        setPlayerStats(stats.sort((a, b) => b.win_rate - a.win_rate))

        // Calculate match statistics
        const completedMatches = matches.filter((match: any) => match.status === "completed")
        const totalPrizeDistributed = stats.reduce((sum, player) => sum + player.earnings, 0)
        const highestScore = Math.max(...matches.map((match: any) => Math.max(match.score1 || 0, match.score2 || 0)))

        setMatchStats({
          total_matches: matches.length,
          completed_matches: completedMatches.length,
          avg_match_duration: 25, // Placeholder - would calculate from actual match data
          highest_score: highestScore,
          total_prize_distributed: totalPrizeDistributed,
          total_earnings: totalPrizeDistributed,
        })
      }
    } catch (error) {
      console.error("Error loading tournament stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!tournament) {
    return <div className="text-center py-8">Tournament not found</div>
  }

  const topPerformer = playerStats[0]
  const tournamentProgress = matchStats ? (matchStats.completed_matches / matchStats.total_matches) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Tournament Statistics
          </h1>
          <p className="text-muted-foreground">{tournament.name} • Performance Analytics & Insights</p>
        </div>
        <Button onClick={loadTournamentStats} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Tournament Progress</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{tournamentProgress.toFixed(0)}%</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={tournamentProgress} className="mt-3" />
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {matchStats?.completed_matches}/{matchStats?.total_matches} matches completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earnings</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${matchStats?.total_earnings.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Distributed to {playerStats.length} participants
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Highest Score</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {matchStats?.highest_score || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Record performance this tournament</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Match Time</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {matchStats?.avg_match_duration || 0}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Average game duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">Tournament Leader</h3>
                  <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">{topPerformer.team_name}</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    {topPerformer.win_rate.toFixed(1)}% win rate • {topPerformer.wins} wins • ${topPerformer.earnings}{" "}
                    earned
                  </p>
                </div>
              </div>
              <div className="text-right space-y-2">
                <Badge className="bg-yellow-500 text-white">
                  <Award className="h-3 w-3 mr-1" />
                  Top Performer
                </Badge>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {topPerformer.avg_score.toFixed(1)} avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Statistics */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Tournament Leaderboard
              </CardTitle>
              <CardDescription>Ranked by win rate and overall performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerStats.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800"
                        : index === 1
                          ? "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/30 border-gray-200 dark:border-gray-700"
                          : index === 2
                            ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800"
                            : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{player.team_name}</h4>
                          {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{player.matches_played} games</span>
                          <span>
                            {player.wins}W-{player.losses}L
                          </span>
                          <span>{player.avg_score.toFixed(1)} avg score</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-primary">{player.win_rate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">win rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Performance Analytics
              </CardTitle>
              <CardDescription>Detailed performance metrics for all participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerStats.map((player) => (
                  <div key={player.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{player.team_name}</h4>
                      <Badge variant="outline">{player.matches_played} games played</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Win Rate</p>
                        <div className="flex items-center gap-2">
                          <Progress value={player.win_rate} className="flex-1" />
                          <span className="font-medium">{player.win_rate.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-muted-foreground">Avg Score</p>
                        <p className="font-bold text-lg">{player.avg_score.toFixed(1)}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-muted-foreground">Total Score</p>
                        <p className="font-bold text-lg">{player.total_score}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-muted-foreground">Record</p>
                        <p className="font-medium">
                          {player.wins}W - {player.losses}L
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Tournament Earnings
              </CardTitle>
              <CardDescription>Prize distribution and player earnings breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerStats
                  .sort((a, b) => b.earnings - a.earnings)
                  .map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold">
                          {index + 1}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold">{player.team_name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {player.matches_played} games • {player.wins} wins
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">${player.earnings}</div>
                        <div className="text-xs text-muted-foreground">
                          ${player.matches_played * 10} games + ${player.wins * 25} wins
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Total Tournament Payout</h4>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      $10 per game played + $25 per win bonus
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${matchStats?.total_earnings.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
