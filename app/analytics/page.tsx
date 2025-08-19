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
          <div className="space-y-6">
            {/* Match Statistics Spreadsheet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Match Statistics Spreadsheet
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Search matches, players, or teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button variant="outline" onClick={exportMatchStats} disabled={matchesWithAnalytics.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Match</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Date</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Type</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Status</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Team 1</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Team 2</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Score</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Winner</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Duration</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Total Goals</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Total Assists</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Total Saves</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Avg ELO</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Players</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatchStats.length === 0 ? (
                        <tr>
                          <td
                            colSpan={15}
                            className="border border-gray-200 px-4 py-8 text-center text-muted-foreground"
                          >
                            No match statistics found
                          </td>
                        </tr>
                      ) : (
                        filteredMatchStats.map((match, index) => (
                          <tr key={match.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-25"}>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="font-medium truncate max-w-48" title={match.name}>
                                {match.name}
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm">
                              {new Date(match.created_at).toLocaleDateString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {match.match_type}
                              </Badge>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <Badge
                                variant={match.status === "completed" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {match.status}
                              </Badge>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="text-sm font-medium">{match.team1_name || "Team 1"}</div>
                              <div className="text-xs text-muted-foreground">
                                {match.team1_players?.length || 0} players
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="text-sm font-medium">{match.team2_name || "Team 2"}</div>
                              <div className="text-xs text-muted-foreground">
                                {match.team2_players?.length || 0} players
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="text-lg font-bold">
                                {match.team1_score || 0} - {match.team2_score || 0}
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <Badge
                                variant={
                                  match.winning_team === "team1"
                                    ? "default"
                                    : match.winning_team === "team2"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {match.winning_team === "team1"
                                  ? "Team 1"
                                  : match.winning_team === "team2"
                                    ? "Team 2"
                                    : "Draw"}
                              </Badge>
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm">
                              {match.duration ? `${Math.round(match.duration / 60)}m` : "N/A"}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-blue-600">
                              {match.total_goals || 0}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-green-600">
                              {match.total_assists || 0}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-purple-600">
                              {match.total_saves || 0}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center font-semibold">
                              {match.avg_elo ? Math.round(match.avg_elo) : "N/A"}
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {match.all_players?.slice(0, 3).map((player: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {player.display_name || player.username}
                                  </Badge>
                                ))}
                                {match.all_players?.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{match.all_players.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMatchChange(match.id)}
                                  className="text-xs"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => exportSingleMatch(match)}
                                  className="text-xs"
                                >
                                  Export
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredMatchStats.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredMatchStats.length} of {matchesWithAnalytics.length} matches
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Match Viewer */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Quick Match Selector
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredMatches.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">No matches found</div>
                    ) : (
                      filteredMatches.slice(0, 10).map((match) => (
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
          </div>
        </TabsContent>

        <TabsContent value="hockey-stats" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  CSV Input & Coordination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your hockey CSV data here...&#10;Format: ID,steals,goals,assists,shots,pickups,passes,passes_received,save_%,shots_on_goalie,shots_saved,goalie_minutes,skater_minutes"
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={processHockeyCSV} disabled={!csvInput.trim() || csvProcessing} className="flex-1">
                    {csvProcessing ? "Processing..." : "Process & Coordinate CSV"}
                  </Button>
                  <Button variant="outline" onClick={exportHockeyStats} disabled={hockeyStats.length === 0}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={processCompletedMatches}
                    disabled={autoProcessing}
                    className="flex-1"
                  >
                    {autoProcessing ? "Auto-Processing..." : "Refresh from Completed Matches"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  CSV data will be automatically coordinated across analytics, betting odds, and leaderboards.
                  {hockeyStats.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
                      ✓ Showing combined stats from {cumulativeStats.size} players across multiple completed matches
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {hockeyStats.length > 0 ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Cumulative Hockey Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {hockeyStats.reduce((sum, s) => sum + s.goals, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Goals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {hockeyStats.reduce((sum, s) => sum + s.assists, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Assists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {hockeyStats.reduce((sum, s) => sum + s.saves, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Saves</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Array.from(cumulativeStats.values()).reduce(
                              (sum: number, s: any) => sum + s.totalGames,
                              0,
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">Games Played</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <HockeyStatsTable stats={hockeyStats} />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold">No Hockey Stats</h3>
                        <p className="text-muted-foreground">
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
