"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { MatchStatsViewer } from "@/components/analytics/match-stats-viewer"
import { HockeyStatsTable } from "@/components/stats/hockey-stats-table"
import { createClient } from "@/lib/supabase/client"
import { analyticsService, type PlayerAnalytics, type TeamAnalytics } from "@/lib/services/analytics-service"
import { csvCoordinationService } from "@/lib/services/csv-coordination-service"
import { Search, TrendingUp, Users, Target, Upload, Download, Trophy } from "lucide-react"

interface Match {
  id: string
  name: string
  match_type: string
  status: string
  created_at: string
  max_participants: number
}

interface HockeyStat {
  playerId: string
  playerName: string
  team: number
  steals: number
  goals: number
  assists: number
  saves: number
  shotsOnGoal: number
  shotsBlocked: number
  checks: number
  faceoffWinPercentage: number
  interceptions: number
  passes: number
  faceoffs: number
  goalieMinutes: number
  skaterMinutes: number
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

  const [csvInput, setCsvInput] = useState("")
  const [hockeyStats, setHockeyStats] = useState<HockeyStat[]>([])
  const [csvProcessing, setCsvProcessing] = useState(false)
  const [eloStats, setEloStats] = useState<any[]>([])
  const [loadingEloStats, setLoadingEloStats] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchMatches()
    loadAnalyticsData()
    loadEloStats()
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
      const [matchesAnalytics, performers] = await Promise.all([
        analyticsService.getMatchesWithAnalytics(20),
        analyticsService.getTopPerformersWithUsers(10),
      ])

      setMatchesWithAnalytics(matchesAnalytics)
      setTopPerformers(performers)

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

  const filteredMatches = matches.filter(
    (match) =>
      match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.match_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const processHockeyCSV = async () => {
    if (!csvInput.trim()) return

    setCsvProcessing(true)
    try {
      const result = await csvCoordinationService.processAndCoordinateCSV(csvInput, selectedMatch || undefined)

      if (result.success) {
        console.log(`[v0] Successfully coordinated ${result.processedStats.length} hockey stats across all systems`)
        setHockeyStats(
          result.processedStats.map((stat) => ({
            playerId: stat.playerId,
            playerName: stat.actualUsername || `Player ${stat.playerId}`,
            team: stat.team,
            steals: stat.stealsPlus,
            goals: stat.goals,
            assists: stat.assists,
            saves: stat.saves,
            shotsOnGoal: stat.shots,
            shotsBlocked: 0,
            checks: 0,
            faceoffWinPercentage: 0,
            interceptions: stat.pickups,
            passes: stat.passes,
            faceoffs: 0,
            goalieMinutes: stat.goaltenderMinutes,
            skaterMinutes: stat.skaterMinutes,
          })),
        )
      } else {
        console.error("CSV coordination errors:", result.errors)
      }
    } catch (error) {
      console.error("Error processing hockey CSV:", error)
    } finally {
      setCsvProcessing(false)
    }
  }

  const loadEloStats = async () => {
    setLoadingEloStats(true)
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, display_name, elo_rating, wins, losses, total_games")
        .not("elo_rating", "is", null)
        .order("elo_rating", { ascending: false })
        .limit(50)

      setEloStats(users || [])
    } catch (error) {
      console.error("Error loading ELO stats:", error)
    } finally {
      setLoadingEloStats(false)
    }
  }

  const exportHockeyStats = () => {
    if (hockeyStats.length === 0) return

    const csvContent = [
      "Player,Team,Steals,Goals,Assists,Saves,Shots on Goal,Shots Blocked,Checks,Faceoff Win %,Interceptions,Passes,Faceoffs,Goalie Minutes,Skater Minutes",
      ...hockeyStats.map(
        (stat) =>
          `${stat.playerName},${stat.team},${stat.steals},${stat.goals},${stat.assists},${stat.saves},${stat.shotsOnGoal},${stat.shotsBlocked},${stat.checks},${stat.faceoffWinPercentage},${stat.interceptions},${stat.passes},${stat.faceoffs},${stat.goalieMinutes},${stat.skaterMinutes}`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hockey-stats-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
          <p className="text-muted-foreground">Comprehensive match analytics and performance insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <Badge variant="secondary">{matches.length} Matches</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="match-analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="match-analytics">Match Analytics</TabsTrigger>
          <TabsTrigger value="hockey-stats">Hockey Stats</TabsTrigger>
          <TabsTrigger value="elo-stats">ELO Stats</TabsTrigger>
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
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  CSV Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your hockey CSV data here..."
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={processHockeyCSV} disabled={!csvInput.trim() || csvProcessing} className="flex-1">
                    {csvProcessing ? "Processing..." : "Process CSV"}
                  </Button>
                  <Button variant="outline" onClick={exportHockeyStats} disabled={hockeyStats.length === 0}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {hockeyStats.length > 0 ? (
                <HockeyStatsTable stats={hockeyStats} />
              ) : (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold">No Hockey Stats</h3>
                        <p className="text-muted-foreground">Process CSV data to view hockey statistics</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="elo-stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                ELO Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEloStats ? (
                <div className="text-center py-8">Loading ELO statistics...</div>
              ) : (
                <div className="space-y-4">
                  {eloStats.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="font-semibold">{player.display_name || player.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.wins}W - {player.losses}L ({player.total_games} games)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{player.elo_rating}</div>
                        <div className="text-sm text-muted-foreground">ELO</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
