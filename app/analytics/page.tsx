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
  team1_name?: string
  team2_name?: string
  team1_score?: number
  team2_score?: number
  winning_team?: string
  duration?: number
  total_goals?: number
  total_assists?: number
  total_saves?: number
  avg_elo?: number
  all_players?: any[]
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
  const [autoProcessing, setAutoProcessing] = useState(false)
  const [cumulativeStats, setCumulativeStats] = useState<Map<string, any>>(new Map())

  const supabase = createClient()

  useEffect(() => {
    fetchMatches()
    loadAnalyticsData()
    loadEloStats()
    processCompletedMatches()
  }, [])

  const processCompletedMatches = async () => {
    setAutoProcessing(true)
    try {
      console.log("[v0] Processing completed matches for hockey stats...")

      // Get all completed matches with results
      const { data: completedMatches } = await supabase
        .from("match_results")
        .select(`
          match_id,
          team1_score,
          team2_score,
          winning_team,
          csv_code,
          validated_at,
          matches!inner(name, status, created_at)
        `)
        .not("csv_code", "is", null)
        .order("validated_at", { ascending: false })

      if (completedMatches && completedMatches.length > 0) {
        console.log(`[v0] Found ${completedMatches.length} completed matches with CSV data`)

        // Process each match's CSV data and combine statistics
        const allStats = new Map<string, any>()

        for (const match of completedMatches) {
          if (match.csv_code) {
            const result = await csvCoordinationService.processAndCoordinateCSV(match.csv_code, match.match_id)

            // Combine stats for each player across all matches
            result.processedStats.forEach((stat) => {
              if (stat.userFound && stat.userId) {
                const existing = allStats.get(stat.userId) || {
                  playerId: stat.userId,
                  playerName: stat.actualUsername || `Player ${stat.playerId}`,
                  totalGames: 0,
                  totalGoals: 0,
                  totalAssists: 0,
                  totalSaves: 0,
                  totalShots: 0,
                  totalSteals: 0,
                  totalMinutes: 0,
                  avgSavePercent: 0,
                  team: stat.team,
                  matches: [],
                }

                existing.totalGames += 1
                existing.totalGoals += stat.goals
                existing.totalAssists += stat.assists
                existing.totalSaves += stat.saves
                existing.totalShots += stat.shots
                existing.totalSteals += stat.stealsPlus
                existing.totalMinutes += stat.goaltenderMinutes + stat.skaterMinutes
                existing.avgSavePercent =
                  existing.totalSaves > 0 ? (existing.totalSaves / existing.totalShots) * 100 : 0
                existing.matches.push({
                  matchId: match.match_id,
                  matchName: match.matches.name,
                  date: match.validated_at,
                  goals: stat.goals,
                  assists: stat.assists,
                  saves: stat.saves,
                })

                allStats.set(stat.userId, existing)
              }
            })
          }
        }

        // Convert to hockey stats format for display
        const combinedHockeyStats: HockeyStat[] = Array.from(allStats.values()).map((stat) => ({
          playerId: stat.playerId,
          playerName: stat.playerName,
          team: stat.team,
          steals: stat.totalSteals,
          goals: stat.totalGoals,
          assists: stat.totalAssists,
          saves: stat.totalSaves,
          shotsOnGoal: stat.totalShots,
          shotsBlocked: 0,
          checks: 0,
          faceoffWinPercentage: 0,
          interceptions: stat.totalSteals,
          passes: 0,
          faceoffs: 0,
          goalieMinutes: Math.floor(stat.totalMinutes * 0.3), // Estimate goalie time
          skaterMinutes: Math.floor(stat.totalMinutes * 0.7), // Estimate skater time
        }))

        setHockeyStats(combinedHockeyStats)
        setCumulativeStats(allStats)
        console.log(`[v0] Successfully processed ${combinedHockeyStats.length} players' cumulative stats`)
      }
    } catch (error) {
      console.error("Error processing completed matches:", error)
    } finally {
      setAutoProcessing(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, name, match_type, status, created_at, max_participants, team1_name, team2_name, team1_score, team2_score, winning_team, duration, total_goals, total_assists, total_saves, avg_elo, all_players",
        )
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

  const filteredMatchStats = matchesWithAnalytics.filter(
    (match) =>
      match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.match_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.team1_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.team2_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.all_players.some(
        (player) =>
          player.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.username.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
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

        await loadEloStats()
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

  const exportMatchStats = () => {
    if (matchesWithAnalytics.length === 0) return

    const csvContent = [
      "Match,Date,Type,Status,Team 1,Team 2,Score,Winner,Duration,Total Goals,Total Assists,Total Saves,Avg ELO,Players",
      ...matchesWithAnalytics.map(
        (match) =>
          `${match.name},${new Date(match.created_at).toLocaleDateString()},${match.match_type},${match.status},${match.team1_name},${match.team2_name},${match.team1_score}-${match.team2_score},${match.winning_team},${match.duration ? `${Math.round(match.duration / 60)}m` : "N/A"},${match.total_goals},${match.total_assists},${match.total_saves},${match.avg_elo},${match.all_players.map((player: any) => player.display_name || player.username).join(",")}`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `match-stats-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportSingleMatch = (match: Match) => {
    const csvContent = [
      "Match,Date,Type,Status,Team 1,Team 2,Score,Winner,Duration,Total Goals,Total Assists,Total Saves,Avg ELO,Players",
      `${match.name},${new Date(match.created_at).toLocaleDateString()},${match.match_type},${match.status},${match.team1_name},${match.team2_name},${match.team1_score}-${match.team2_score},${match.winning_team},${match.duration ? `${Math.round(match.duration / 60)}m` : "N/A"},${match.total_goals},${match.total_assists},${match.total_saves},${match.avg_elo},${match.all_players.map((player: any) => player.display_name || player.username).join(",")}`,
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `match-${match.name}-${new Date().toISOString().split("T")[0]}.csv`
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-slate-600 text-lg mt-2">Comprehensive match analytics and performance insights</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                {matches.length} Matches
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="match-analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-1">
            <TabsTrigger
              value="match-analytics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
            >
              Match Analytics
            </TabsTrigger>
            <TabsTrigger
              value="hockey-stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
            >
              Hockey Stats
            </TabsTrigger>
            <TabsTrigger
              value="elo-stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
            >
              ELO Stats
            </TabsTrigger>
            <TabsTrigger
              value="player-performance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="team-comparison"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
            >
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match-analytics" className="space-y-8">
            <div className="space-y-8">
              <Card className="bg-white/90 backdrop-blur-sm border-emerald-200 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <TrendingUp className="h-6 w-6" />
                    Match Analytics Overview
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-4">
                    <Input
                      placeholder="Search matches..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm bg-white/20 border-white/30 placeholder:text-white/70 text-white focus:bg-white/30 focus:border-white/50"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl border border-blue-300 shadow-lg">
                      <div className="text-3xl font-bold text-blue-700 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_goals || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-blue-600">Total Goals</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 via-green-100 to-green-200 rounded-2xl border border-green-300 shadow-lg">
                      <div className="text-3xl font-bold text-green-700 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_assists || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-green-600">Total Assists</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-2xl border border-purple-300 shadow-lg">
                      <div className="text-3xl font-bold text-purple-700 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_saves || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-purple-600">Total Saves</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 rounded-2xl border border-orange-300 shadow-lg">
                      <div className="text-3xl font-bold text-orange-700 mb-2">{matchesWithAnalytics.length}</div>
                      <div className="text-sm font-semibold text-orange-600">Completed Matches</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredMatchStats.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No matches found</h3>
                        <p>Try adjusting your search criteria</p>
                      </div>
                    ) : (
                      filteredMatchStats.slice(0, 10).map((match) => (
                        <div
                          key={match.id}
                          className="p-6 bg-gradient-to-r from-white via-slate-50 to-white border border-slate-200 rounded-xl hover:shadow-lg hover:border-emerald-300 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-slate-800 mb-2 text-lg">{match.name}</div>
                              <div className="flex items-center gap-6 text-sm text-slate-600">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-300 text-emerald-700 bg-emerald-50 font-semibold"
                                >
                                  {match.match_type}
                                </Badge>
                                <span className="font-medium">{new Date(match.created_at).toLocaleDateString()}</span>
                                <span className="font-bold text-lg text-slate-800">
                                  {match.team1_score || 0} - {match.team2_score || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                onClick={() => handleMatchChange(match.id)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Match Viewer */}
              <div className="grid gap-8 md:grid-cols-3">
                <Card className="md:col-span-1 bg-white/90 backdrop-blur-sm border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
                    <CardTitle className="flex items-center gap-3 text-slate-800 text-lg">
                      <Search className="h-5 w-5 text-slate-600" />
                      Quick Match Selector
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredMatches.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          No matches found
                        </div>
                      ) : (
                        filteredMatches.slice(0, 10).map((match) => (
                          <Button
                            key={match.id}
                            variant={selectedMatch === match.id ? "default" : "outline"}
                            className={`w-full justify-start text-left h-auto p-4 rounded-xl transition-all duration-200 ${
                              selectedMatch === match.id
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                : "border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => setSelectedMatch(match.id)}
                          >
                            <div className="space-y-2">
                              <div className="font-medium truncate text-slate-800">{match.name}</div>
                              <div className="flex items-center gap-3 text-xs opacity-75">
                                <Badge variant="outline" className="text-xs border-current font-medium">
                                  {match.match_type}
                                </Badge>
                                <Users className="h-3 w-3" />
                                <span>{match.max_participants}</span>
                              </div>
                              <div className="text-xs opacity-75">
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
                    <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                      <CardContent className="p-16">
                        <div className="text-center space-y-6">
                          <Target className="h-16 w-16 mx-auto text-slate-400" />
                          <div>
                            <h3 className="text-2xl font-bold text-slate-800">Select a Match</h3>
                            <p className="text-slate-600 text-lg">
                              Choose a completed match to view detailed analytics
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hockey-stats" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm border-blue-200 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Upload className="h-6 w-6" />
                    CSV Input & Coordination
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
                  <Textarea
                    placeholder="Paste your hockey CSV data here...&#10;Format: ID,steals,goals,assists,shots,pickups,passes,passes_received,save_%,shots_on_goalie,shots_saved,goalie_minutes,skater_minutes"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    rows={10}
                    className="font-mono text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={processHockeyCSV}
                      disabled={!csvInput.trim() || csvProcessing}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md"
                    >
                      {csvProcessing ? "Processing..." : "Process & Coordinate CSV"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportHockeyStats}
                      disabled={hockeyStats.length === 0}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-white/80 shadow-md"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={processCompletedMatches}
                      disabled={autoProcessing}
                      className="flex-1 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 shadow-md"
                    >
                      {autoProcessing ? "Auto-Processing..." : "Refresh from Completed Matches"}
                    </Button>
                  </div>
                  <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    CSV data will be automatically coordinated across analytics, betting odds, and leaderboards.
                    {hockeyStats.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium">
                        ✓ Showing combined stats from {cumulativeStats.size} players across multiple completed matches
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                {hockeyStats.length > 0 ? (
                  <div className="space-y-6">
                    <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-xl rounded-2xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-500 via-teal-500 to-cyan-500 text-white">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <TrendingUp className="h-6 w-6" />
                          Cumulative Hockey Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="grid grid-cols-4 gap-6 mb-6">
                          <div className="text-center p-6 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl border border-blue-300 shadow-lg">
                            <div className="text-3xl font-bold text-blue-700 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.goals, 0)}
                            </div>
                            <div className="text-sm font-semibold text-blue-600">Total Goals</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-green-50 via-green-100 to-green-200 rounded-2xl border border-green-300 shadow-lg">
                            <div className="text-3xl font-bold text-green-700 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.assists, 0)}
                            </div>
                            <div className="text-sm font-semibold text-green-600">Total Assists</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-2xl border border-purple-300 shadow-lg">
                            <div className="text-3xl font-bold text-purple-700 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.saves, 0)}
                            </div>
                            <div className="text-sm font-semibold text-purple-600">Total Saves</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 rounded-2xl border border-orange-300 shadow-lg">
                            <div className="text-3xl font-bold text-orange-700 mb-2">
                              {Array.from(cumulativeStats.values()).reduce(
                                (sum: number, s: any) => sum + s.totalGames,
                                0,
                              )}
                            </div>
                            <div className="text-sm font-semibold text-orange-600">Games Played</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <HockeyStatsTable stats={hockeyStats} />
                  </div>
                ) : (
                  <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-xl rounded-2xl">
                    <CardContent className="p-16">
                      <div className="text-center space-y-6">
                        <Upload className="h-16 w-16 mx-auto text-blue-400" />
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-2">No Hockey Stats</h3>
                          <p className="text-slate-600 text-lg">
                            Process CSV data manually or click "Refresh from Completed Matches" to automatically load
                            statistics from all completed games
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="elo-stats" className="space-y-8">
            <Card className="bg-white/90 backdrop-blur-sm border-purple-200 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Trophy className="h-6 w-6" />
                  ELO Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {loadingEloStats ? (
                  <div className="text-center py-12 text-slate-500">
                    <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-lg">Loading ELO statistics...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eloStats.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-6 bg-gradient-to-r from-white via-purple-50 to-white border border-purple-200 rounded-xl hover:shadow-lg hover:border-purple-300 transition-all duration-300"
                      >
                        <div className="flex items-center gap-6">
                          <Badge
                            variant="outline"
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-800 shadow-lg"
                                : index === 1
                                  ? "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400 text-gray-800 shadow-lg"
                                  : index === 2
                                    ? "bg-gradient-to-r from-orange-100 to-orange-200 border-orange-400 text-orange-800 shadow-lg"
                                    : "bg-gradient-to-r from-slate-100 to-slate-200 border-slate-400 text-slate-700 shadow-md"
                            }`}
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <div className="font-bold text-slate-800 text-lg">
                              {player.display_name || player.username}
                            </div>
                            <div className="text-sm text-slate-600 font-medium">
                              {player.wins}W - {player.losses}L ({player.total_games} games)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-purple-700 mb-1">{player.elo_rating}</div>
                          <div className="text-sm font-semibold text-purple-600">ELO</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="player-performance" className="space-y-8">
            {/* Placeholder for Player Performance tab content */}
          </TabsContent>

          <TabsContent value="team-comparison" className="space-y-8">
            {/* Placeholder for Team Comparison tab content */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
