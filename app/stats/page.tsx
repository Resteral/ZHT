"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  analyticsService,
  type PlayerAnalytics,
  type TeamAnalytics,
  type CSVPlayerStats,
} from "@/lib/services/analytics-service"
import { CSVHockeyParser, type HockeyStats } from "@/lib/services/csv-hockey-parser"
import { HockeyStatsTable } from "@/components/stats/hockey-stats-table"
import { csvIdMapping } from "@/lib/services/csv-id-mapping"
import {
  Trophy,
  Target,
  Download,
  Filter,
  Users,
  Award,
  GamepadIcon,
  TrendingUp,
  BarChart3,
  Upload,
} from "lucide-react"

export default function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerAnalytics[]>([])
  const [teamStats, setTeamStats] = useState<TeamAnalytics[]>([])
  const [matchesWithAnalytics, setMatchesWithAnalytics] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [stackedCSVStats, setStackedCSVStats] = useState<CSVPlayerStats[]>([])
  const [csvLeaderboards, setCSVLeaderboards] = useState<any>({})
  const [selectedMatch, setSelectedMatch] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [hockeyStats, setHockeyStats] = useState<HockeyStats[]>([])
  const [csvInput, setCsvInput] = useState("")

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const [matches, performers, stackedStats, leaderboards] = await Promise.all([
        analyticsService.getMatchesWithAnalytics(20),
        analyticsService.getTopPerformersWithUsers(10),
        analyticsService.getStackedCSVStats(),
        analyticsService.getCSVLeaderboards(),
      ])

      setMatchesWithAnalytics(matches)
      setTopPerformers(performers)
      setStackedCSVStats(stackedStats)
      setCSVLeaderboards(leaderboards)

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

  const exportToCSV = () => {
    if (stackedCSVStats.length === 0) {
      return
    }

    const headers = [
      "CSV_ID",
      "Name",
      "ELO",
      "Steals",
      "Goals",
      "Assists",
      "Points",
      "Shots",
      "Shooting %",
      "Pickups",
      "Passes",
      "Pass Received",
      "Save %",
      "Shots On Goalie",
      "Shots Saved",
      "Goalie Minutes",
      "Skater Minutes",
      "Games Played",
    ]

    const csvContent = [
      headers.join(","),
      ...stackedCSVStats.map((stat) =>
        [
          stat.id,
          stat.user?.username || "Unknown",
          stat.user?.elo_rating || "N/A",
          stat.steals,
          stat.goals,
          stat.assists,
          stat.points,
          stat.shots,
          stat.shootingPercentage.toFixed(1),
          stat.pickups,
          stat.passes,
          stat.passesReceived,
          stat.savePercentage.toFixed(1),
          stat.shotsOnGoalie,
          stat.shotsSaved,
          stat.goalieMinutes,
          stat.skaterMinutes,
          stat.gamesPlayed,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "stacked-csv-statistics.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const processHockeyCSV = async () => {
    if (!csvInput.trim()) return

    try {
      const parsedStats = CSVHockeyParser.parseCSVData(csvInput)

      // Map CSV IDs to actual users
      const mappedStats = await Promise.all(
        parsedStats.map(async (stat) => {
          const userId = csvIdMapping.getActualUserId(stat.playerId)
          if (userId) {
            // Fetch user data from database
            const userData = await csvIdMapping.getUserData(userId)
            return {
              ...stat,
              username: userData?.username,
              eloRating: userData?.elo_rating,
            }
          }
          return stat
        }),
      )

      setHockeyStats(mappedStats)
    } catch (error) {
      console.error("Error processing hockey CSV:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading CSV analytics data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CSV Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Statistics from CSV code submissions mapped to account IDs (Cerv: 823531, Rush: 1358995, David: 8283067)
          </p>
        </div>
        {stackedCSVStats.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {stackedCSVStats.length} Players with CSV Data
            </Badge>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Stacked CSV
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CSV Account IDs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stackedCSVStats.length}</div>
            <p className="text-xs text-muted-foreground">Mapped to user accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stackedCSVStats.length}</div>
            <p className="text-xs text-muted-foreground">With CSV submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stackedCSVStats.reduce((sum, player) => sum + player.goals, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assists</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stackedCSVStats.reduce((sum, player) => sum + player.assists, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stackedCSVStats.reduce((sum, player) => sum + player.gamesPlayed, 0)}
            </div>
            <p className="text-xs text-muted-foreground">CSV submissions</p>
          </CardContent>
        </Card>
      </div>

      {stackedCSVStats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No CSV Analytics Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Complete matches and submit CSV codes with account IDs (like 823531 for Cerv, 1358995 for Rush, 8283067
              for David) to see detailed statistics and analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {matchesWithAnalytics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Match Selection
                </CardTitle>
                <CardDescription>Choose a match with CSV data to view detailed analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedMatch} onValueChange={handleMatchChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a match with CSV data" />
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
          )}

          <Tabs defaultValue="hockey-stats" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="hockey-stats">Hockey Stats</TabsTrigger>
              <TabsTrigger value="stacked-csv">Stacked CSV Stats</TabsTrigger>
              <TabsTrigger value="csv-leaderboards">Leaderboards</TabsTrigger>
              <TabsTrigger value="csv-stats">Match CSV Data</TabsTrigger>
              <TabsTrigger value="player-performance">Player Performance</TabsTrigger>
              <TabsTrigger value="team-comparison">Team Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="hockey-stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Process Hockey CSV Data
                  </CardTitle>
                  <CardDescription>
                    Paste your hockey CSV data to see it formatted in the statistics table
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste your CSV data here (Team, Match-ID, Player-ID, Steals/+-, Goals, Assists, Shots, Pickups, Passes, Pass Received, Save %, Saves, Allowed, Possession, Total Points)"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <Button onClick={processHockeyCSV} disabled={!csvInput.trim()}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Process Hockey CSV
                  </Button>
                </CardContent>
              </Card>

              {hockeyStats.length > 0 && <HockeyStatsTable stats={hockeyStats} title="Hockey Match Statistics" />}
            </TabsContent>

            <TabsContent value="stacked-csv" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Stacked CSV Statistics
                  </CardTitle>
                  <CardDescription>
                    Cumulative hockey statistics from CSV account IDs mapped to user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-900 hover:bg-blue-900">
                          <TableHead className="text-white font-bold">CSV ID</TableHead>
                          <TableHead className="text-white font-bold">Name</TableHead>
                          <TableHead className="text-white font-bold">ELO</TableHead>
                          <TableHead className="text-white font-bold">Steals</TableHead>
                          <TableHead className="text-white font-bold">Points (Goals + Assists)</TableHead>
                          <TableHead className="text-white font-bold">Goals</TableHead>
                          <TableHead className="text-white font-bold">Assists</TableHead>
                          <TableHead className="text-white font-bold">Shots</TableHead>
                          <TableHead className="text-white font-bold">Shooting %</TableHead>
                          <TableHead className="text-white font-bold">Pickups</TableHead>
                          <TableHead className="text-white font-bold">Passes</TableHead>
                          <TableHead className="text-white font-bold">Pass Received</TableHead>
                          <TableHead className="text-white font-bold">Save %</TableHead>
                          <TableHead className="text-white font-bold">Shots On Goalie</TableHead>
                          <TableHead className="text-white font-bold">Shots Saved</TableHead>
                          <TableHead className="text-white font-bold">Goalie (Minutes)</TableHead>
                          <TableHead className="text-white font-bold">Skater (Minutes)</TableHead>
                          <TableHead className="text-white font-bold">Games</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stackedCSVStats.map((stat, index) => (
                          <TableRow key={stat.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <TableCell className="font-medium text-blue-600">{stat.id}</TableCell>
                            <TableCell className="font-medium">
                              {stat.user?.username || "Unknown User"}
                              {!stat.user && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Unmapped
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.user?.elo_rating ? (
                                <Badge variant="outline">{stat.user.elo_rating}</Badge>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{stat.steals}</TableCell>
                            <TableCell className="text-center font-bold text-blue-600">{stat.points}</TableCell>
                            <TableCell className="text-center">{stat.goals}</TableCell>
                            <TableCell className="text-center">{stat.assists}</TableCell>
                            <TableCell className="text-center">{stat.shots}</TableCell>
                            <TableCell className="text-center">{stat.shootingPercentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-center">{stat.pickups}</TableCell>
                            <TableCell className="text-center">{stat.passes}</TableCell>
                            <TableCell className="text-center">{stat.passesReceived}</TableCell>
                            <TableCell className="text-center">{stat.savePercentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-center">{stat.shotsOnGoalie}</TableCell>
                            <TableCell className="text-center">{stat.shotsSaved}</TableCell>
                            <TableCell className="text-center">{stat.goalieMinutes}</TableCell>
                            <TableCell className="text-center">{stat.skaterMinutes}</TableCell>
                            <TableCell className="text-center font-semibold">{stat.gamesPlayed}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="csv-leaderboards" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top Scorers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.topScorers?.slice(0, 5).map((player: CSVPlayerStats, index: number) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{index + 1} {player.user?.username || `ID: ${player.id}`}
                        </span>
                        <Badge variant="outline">{player.points} pts</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-500" />
                      Goal Leaders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.topGoalScorers?.slice(0, 5).map((player: CSVPlayerStats, index: number) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{index + 1} {player.user?.username || `ID: ${player.id}`}
                        </span>
                        <Badge variant="outline">{player.goals} goals</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-500" />
                      Assist Leaders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.topAssists?.slice(0, 5).map((player: CSVPlayerStats, index: number) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{index + 1} {player.user?.username || `ID: ${player.id}`}
                        </span>
                        <Badge variant="outline">{player.assists} assists</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GamepadIcon className="h-5 w-5 text-green-500" />
                      Most Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.mostGamesPlayed?.slice(0, 5).map((player: CSVPlayerStats, index: number) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{index + 1} {player.user?.username || `ID: ${player.id}`}
                        </span>
                        <Badge variant="outline">{player.gamesPlayed} games</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      Best Shooting %
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.bestShootingPercentage
                      ?.slice(0, 5)
                      .map((player: CSVPlayerStats, index: number) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <span className="text-sm">
                            #{index + 1} {player.user?.username || `ID: ${player.id}`}
                          </span>
                          <Badge variant="outline">{player.shootingPercentage.toFixed(1)}%</Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-orange-500" />
                      Most Steals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {csvLeaderboards.mostSteals?.slice(0, 5).map((player: CSVPlayerStats, index: number) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{index + 1} {player.user?.username || `ID: ${player.id}`}
                        </span>
                        <Badge variant="outline">{player.steals} steals</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="csv-stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    CSV Data Statistics
                  </CardTitle>
                  <CardDescription>Raw statistics from CSV code submissions attached to account IDs</CardDescription>
                </CardHeader>
                <CardContent>
                  {playerStats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No CSV data available for this match. Players need to submit CSV codes to see statistics.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-blue-900 hover:bg-blue-900">
                            <TableHead className="text-white font-bold">Account ID</TableHead>
                            <TableHead className="text-white font-bold">Kills</TableHead>
                            <TableHead className="text-white font-bold">Deaths</TableHead>
                            <TableHead className="text-white font-bold">Assists</TableHead>
                            <TableHead className="text-white font-bold">Damage Dealt</TableHead>
                            <TableHead className="text-white font-bold">Damage Taken</TableHead>
                            <TableHead className="text-white font-bold">Healing Done</TableHead>
                            <TableHead className="text-white font-bold">Accuracy %</TableHead>
                            <TableHead className="text-white font-bold">Score</TableHead>
                            <TableHead className="text-white font-bold">Submitted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playerStats.map((stat, index) => (
                            <TableRow key={stat.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="font-medium">{stat.user_id.slice(-8)}</TableCell>
                              <TableCell className="text-center">{stat.kills}</TableCell>
                              <TableCell className="text-center">{stat.deaths}</TableCell>
                              <TableCell className="text-center">{stat.assists}</TableCell>
                              <TableCell className="text-center">{stat.damage_dealt}</TableCell>
                              <TableCell className="text-center">{stat.damage_taken}</TableCell>
                              <TableCell className="text-center">{stat.healing_done}</TableCell>
                              <TableCell className="text-center">{stat.accuracy}%</TableCell>
                              <TableCell className="text-center font-semibold">{stat.score}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">
                                {new Date(stat.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="player-performance" className="space-y-6">
              {playerStats.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <GamepadIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Player Performance Data</h3>
                    <p className="text-muted-foreground text-center">
                      CSV submissions are required to generate performance charts and analytics.
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
                              name: `ID: ${player.user_id.slice(-6)}`,
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
                              name: `ID: ${player.user_id.slice(-6)}`,
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
                      Team statistics will appear here when CSV data includes team information.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Team Performance from CSV Data</CardTitle>
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
