"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { analyticsService, type PlayerAnalytics, type TeamAnalytics } from "@/lib/services/analytics-service"
import { Trophy, Target, Users, Award, GamepadIcon } from "lucide-react"

export default function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerAnalytics[]>([])
  const [teamStats, setTeamStats] = useState<TeamAnalytics[]>([])
  const [matchesWithAnalytics, setMatchesWithAnalytics] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const [matches, performers] = await Promise.all([
        analyticsService.getMatchesWithAnalytics(20),
        analyticsService.getTopPerformersWithUsers(10),
      ])

      setMatchesWithAnalytics(matches)
      setTopPerformers(performers)

      if (matches.length > 0) {
        setSelectedMatch(matches[0].id)
        await loadMatchData(matches[0].id)
      }
    } catch (error) {
      console.error("Error loading analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMatchData = async (matchId: string) => {
    try {
      const [players, teams] = await Promise.all([
        analyticsService.getPlayerAnalytics(matchId),
        analyticsService.getTeamAnalytics(matchId),
      ])

      setPlayerStats(players)
      setTeamStats(teams)
    } catch (error) {
      console.error("Error loading match data:", error)
    }
  }

  const handleMatchChange = (matchId: string) => {
    setSelectedMatch(matchId)
    loadMatchData(matchId)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Match statistics and player performance analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchesWithAnalytics.length}</div>
            <p className="text-xs text-muted-foreground">With analytics data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformers.length}</div>
            <p className="text-xs text-muted-foreground">Active players</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Match</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playerStats.length}</div>
            <p className="text-xs text-muted-foreground">Players analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.length}</div>
            <p className="text-xs text-muted-foreground">In current match</p>
          </CardContent>
        </Card>
      </div>

      {matchesWithAnalytics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Complete matches to see detailed statistics and analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Match Selection
              </CardTitle>
              <CardDescription>Choose a match to view detailed analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedMatch} onValueChange={handleMatchChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a match" />
                </SelectTrigger>
                <SelectContent>
                  {matchesWithAnalytics.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.name || `${match.match_type} - ${new Date(match.created_at).toLocaleDateString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Tabs defaultValue="player-performance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="player-performance">Player Performance</TabsTrigger>
              <TabsTrigger value="team-comparison">Team Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="player-performance" className="space-y-6">
              {playerStats.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <GamepadIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Player Performance Data</h3>
                    <p className="text-muted-foreground text-center">
                      Player performance data will appear here when matches are completed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Kills vs Deaths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          kills: { label: "Kills", color: "hsl(var(--chart-1))" },
                          deaths: { label: "Deaths", color: "hsl(var(--chart-2))" },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={playerStats.map((player) => ({
                              name: `Player ${player.user_id.slice(-6)}`,
                              kills: player.kills,
                              deaths: player.deaths,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="kills" fill="var(--color-kills)" />
                            <Bar dataKey="deaths" fill="var(--color-deaths)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Damage & Healing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          damage: { label: "Damage", color: "hsl(var(--chart-3))" },
                          healing: { label: "Healing", color: "hsl(var(--chart-4))" },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={playerStats.map((player) => ({
                              name: `Player ${player.user_id.slice(-6)}`,
                              damage: player.damage_dealt,
                              healing: player.healing_done,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="damage" fill="var(--color-damage)" />
                            <Bar dataKey="healing" fill="var(--color-healing)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="team-comparison" className="space-y-6">
              {teamStats.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Team Analytics Data</h3>
                    <p className="text-muted-foreground text-center">
                      Team statistics will appear here when matches are completed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Team Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        kills: { label: "Kills", color: "hsl(var(--chart-1))" },
                        damage: { label: "Damage", color: "hsl(var(--chart-3))" },
                        score: { label: "Score", color: "hsl(var(--chart-5))" },
                      }}
                      className="h-[400px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={teamStats.map((team) => ({
                            name: team.team_name,
                            kills: team.total_kills,
                            damage: team.total_damage,
                            score: team.team_score,
                          }))}
                          layout="horizontal"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="kills" fill="var(--color-kills)" />
                          <Bar dataKey="damage" fill="var(--color-damage)" />
                          <Bar dataKey="score" fill="var(--color-score)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
