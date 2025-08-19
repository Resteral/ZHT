"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MatchStatsViewer } from "@/components/analytics/match-stats-viewer"
import { HockeyStatsTable } from "@/components/stats/hockey-stats-table"
import { createClient } from "@/lib/supabase/client"
import {
  analyticsService,
  type PlayerAnalytics,
  type TeamAnalytics,
  type CSVPlayerStats,
} from "@/lib/services/analytics-service"
import { CSVHockeyParser, type HockeyStats } from "@/lib/services/csv-hockey-parser"
import { csvIdMapping } from "@/lib/services/csv-id-mapping"
import { Search, TrendingUp, Users, Target, BarChart3, Download, Award, GamepadIcon, Upload } from "lucide-react"

interface Match {
  id: string
  name: string
  match_type: string
  status: string
  created_at: string
  max_participants: number
}

export default function AnalyticsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  const [playerStats, setPlayerStats] = useState<PlayerAnalytics[]>([])
  const [teamStats, setTeamStats] = useState<TeamAnalytics[]>([])
  const [matchesWithAnalytics, setMatchesWithAnalytics] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [stackedCSVStats, setStackedCSVStats] = useState<CSVPlayerStats[]>([])
  const [csvLeaderboards, setCSVLeaderboards] = useState<any>({})
  const [hockeyStats, setHockeyStats] = useState<HockeyStats[]>([])
  const [csvInput, setCsvInput] = useState(
    "1,1-S2-1-6820063,8,2,0,7,35,17,16,1.32,0,0,0,719\n1,1-S2-1-10300134,1,1,1,4,33,16,22,1.13,0,0,0,719\n1,1-S2-1-4122701,5,1,0,1,28,12,11,0.45,0,0,0,719\n1,1-S2-1-1520631,0,0,1,1,8,9,5,0.42,9,7,696,23\n2,1-S2-1-6347815,2,0,0,2,34,19,11,0.63,0,0,0,719\n2,1-S2-1-4964615,0,0,0,0,12,7,4,0.75,12,8,672,42\n2,1-S2-1-4096795,-6,1,0,4,31,12,20,1.55,1,1,35,680\n2,1-S2-1-6218367,-10,1,1,3,34,14,17,1.17,0,0,0,715",
  )

  const supabase = createClient()

  useEffect(() => {
    fetchMatches()
    loadAnalyticsData()
    processHockeyCSV()
  }, [])

  const fetchMatches = async () => {
    try {
      const { data } = await supabase
        .from("matches")
        .select("id, name, match_type, status, created_at, max_participants")
        .in("status", ["completed", "finished"])
        .order("created_at", { ascending: false })
        .limit(50)

      setMatches(data || [])
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      const [matchesAnalytics, performers, stackedStats, leaderboards] = await Promise.all([
        analyticsService.getMatchesWithAnalytics(20),
        analyticsService.getTopPerformersWithUsers(10),
        analyticsService.getStackedCSVStats(),
        analyticsService.getCSVLeaderboards(),
      ])

      setMatchesWithAnalytics(matchesAnalytics)
      setTopPerformers(performers)
      setStackedCSVStats(stackedStats)
      setCSVLeaderboards(leaderboards)

      if (matchesAnalytics.length > 0 && !selectedMatch) {
        setSelectedMatch(matchesAnalytics[0].id)
        await loadMatchData(matchesAnalytics[0].id)
      }
    } catch (error) {
      console.error("Error loading analytics data:", error)
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
    if (stackedCSVStats.length === 0) return

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
      const mappedStats = await Promise.all(
        parsedStats.map(async (stat) => {
          const userId = await csvIdMapping.mapCSVIdToUserId(stat.playerId)
          if (userId) {
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

  const filteredMatches = matches.filter(
    (match) =>
      match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.match_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <p className="text-muted-foreground">Comprehensive match analytics and CSV statistics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <Badge variant="secondary">{matches.length} Matches</Badge>
          </div>
          {stackedCSVStats.length > 0 && (
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV Stats
            </Button>
          )}
        </div>
      </div>

      {stackedCSVStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CSV Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stackedCSVStats.length}</div>
              <p className="text-xs text-muted-foreground">With submissions</p>
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
              <div className="text-2xl font-bold">
                {stackedCSVStats.reduce((sum, player) => sum + player.assists, 0)}
              </div>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Matches</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matches.length}</div>
              <p className="text-xs text-muted-foreground">Available for analysis</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="match-analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="match-analytics">Match Analytics</TabsTrigger>
          <TabsTrigger value="hockey-stats">Hockey Stats</TabsTrigger>
          <TabsTrigger value="stacked-csv">Stacked CSV</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="csv-data">CSV Data</TabsTrigger>
          <TabsTrigger value="player-performance">Performance</TabsTrigger>
          <TabsTrigger value="team-comparison">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="match-analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Select Match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search matches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMatches.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">No matches found</div>
                  ) : (
                    filteredMatches.map((match) => (
                      <Button
                        key={match.id}
                        variant={selectedMatch === match.id ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => setSelectedMatch(match.id)}
                      >
                        <div className="space-y-1">
                          <div className="font-medium truncate">{match.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {match.match_type}
                            </Badge>
                            <Users className="h-3 w-3" />
                            <span>{match.max_participants}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(match.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              {selectedMatch ? (
                <MatchStatsViewer matchId={selectedMatch} />
              ) : (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center space-y-4">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold">Select a Match</h3>
                        <p className="text-muted-foreground">Choose a completed match to view detailed analytics</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hockey-stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Process Hockey CSV Data
              </CardTitle>
              <CardDescription>Paste your hockey CSV data to see it formatted in the statistics table</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your CSV data here (Team, Match-ID, Player-ID, Steals/+-, Goals, Assists, Shots, Pickups, Passes, Pass Received, Save %, Saves, Allowed, Goalie Time, Skater Time)"
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

          {hockeyStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Match CSV Analytics
                </CardTitle>
                <CardDescription>Detailed analytics derived from the processed CSV match data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Team 1 Performance</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {hockeyStats.filter((s) => s.team === 1).reduce((sum, s) => sum + s.goals, 0)} Goals
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {hockeyStats.filter((s) => s.team === 1).reduce((sum, s) => sum + s.assists, 0)} Assists
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4 rounded-lg">
                    <div className="text-sm font-medium text-red-700 dark:text-red-300">Team 2 Performance</div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                      {hockeyStats.filter((s) => s.team === 2).reduce((sum, s) => sum + s.goals, 0)} Goals
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {hockeyStats.filter((s) => s.team === 2).reduce((sum, s) => sum + s.assists, 0)} Assists
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Match Summary</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {hockeyStats.reduce((sum, s) => sum + s.goals, 0)} Total Goals
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">{hockeyStats.length} Players</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stacked-csv" className="space-y-6">
          {/* Placeholder for Stacked CSV tab content */}
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-6">
          {/* Placeholder for Leaderboards tab content */}
        </TabsContent>

        <TabsContent value="csv-data" className="space-y-6">
          {/* Placeholder for CSV Data tab content */}
        </TabsContent>

        <TabsContent value="player-performance" className="space-y-6">
          {/* Placeholder for Player Performance tab content */}
        </TabsContent>

        <TabsContent value="team-comparison" className="space-y-6">
          {/* Placeholder for Team Comparison tab content */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
