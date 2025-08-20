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
import { Search, TrendingUp, Users, Target, Upload, Download } from "lucide-react"

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
  game_number?: number
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
  gameNumber?: number
  matchName?: string
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

    const interval = setInterval(() => {
      processCompletedMatches()
      loadEloStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const processCompletedMatches = async () => {
    setAutoProcessing(true)
    try {
      console.log("[v0] Processing completed matches for hockey stats...")

      const { data: completedMatches } = await supabase
        .from("match_results")
        .select(`
          match_id,
          team1_score,
          team2_score,
          winning_team,
          csv_code,
          validated_at,
          matches!inner(name, status, created_at, game_number)
        `)
        .not("csv_code", "is", null)
        .order("validated_at", { ascending: false })

      if (completedMatches && completedMatches.length > 0) {
        console.log(`[v0] Found ${completedMatches.length} completed matches with CSV data`)

        // Process each match's CSV data and combine statistics
        const allStats = new Map<string, any>()
        const gameStats: HockeyStat[] = []

        for (const match of completedMatches) {
          if (match.csv_code) {
            const result = await csvCoordinationService.processAndCoordinateCSV(match.csv_code, match.match_id, {
              matchName: match.matches.name,
              gameNumber: match.matches.game_number || 1,
              matchDate: match.validated_at,
            })

            console.log(
              `[v0] Processing match ${match.matches.name} - found ${result.processedStats.length} player records`,
            )

            result.processedStats.forEach((stat) => {
              if (stat.userFound && stat.userId && stat.actualUsername) {
                console.log(`[v0] Auto-mapped Account ID ${stat.accountId} → ${stat.actualUsername} (${stat.userId})`)

                // Add to individual game stats with proper account ID mapping
                gameStats.push({
                  playerId: stat.userId,
                  playerName: stat.actualUsername,
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
                  gameNumber: match.matches.game_number || 1,
                  matchName: match.matches.name,
                })

                // Combine stats for cumulative view
                const existing = allStats.get(stat.userId) || {
                  playerId: stat.userId,
                  playerName: stat.actualUsername,
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
                  gameNumber: match.matches.game_number || 1,
                  date: match.validated_at,
                  goals: stat.goals,
                  assists: stat.assists,
                  saves: stat.saves,
                })

                allStats.set(stat.userId, existing)
              } else {
                console.log(`[v0] Skipping unmapped player with Account ID: ${stat.accountId}`)
              }
            })
          }
        }

        setHockeyStats(gameStats.sort((a, b) => (b.gameNumber || 0) - (a.gameNumber || 0)))
        setCumulativeStats(allStats)
        console.log(
          `[v0] Auto-processed ${gameStats.length} individual game records with correct account ID → player name mapping`,
        )
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
          "id, name, match_type, status, created_at, max_participants, team1_name, team2_name, team1_score, team2_score, winning_team, duration, total_goals, total_assists, total_saves, avg_elo, all_players, game_number",
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
      const selectedMatchData = matches.find((m) => m.id === selectedMatch)
      const matchContext = selectedMatchData
        ? {
            matchName: selectedMatchData.name,
            gameNumber: selectedMatchData.game_number || 1,
            matchDate: selectedMatchData.created_at,
          }
        : undefined

      const result = await csvCoordinationService.processAndCoordinateCSV(
        csvInput,
        selectedMatch || undefined,
        matchContext,
      )

      if (result.success) {
        console.log(`[v0] Successfully coordinated ${result.processedStats.length} hockey stats across all systems`)

        const processedGameStats = result.processedStats
          .filter((stat) => stat.userFound && stat.userId && stat.actualUsername)
          .map((stat) => ({
            playerId: stat.userId!,
            playerName: stat.actualUsername!,
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
            gameNumber: matchContext?.gameNumber || 1,
            matchName: matchContext?.matchName || "Manual Entry",
          }))

        setHockeyStats(processedGameStats)
        await loadEloStats()

        const unmappedCount = result.processedStats.length - processedGameStats.length
        if (unmappedCount > 0) {
          console.log(`[v0] Skipped ${unmappedCount} unmapped players from CSV processing`)
        }
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
        .select("id, username, display_name, elo_rating, wins, losses, total_games, account_id")
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
      "Game,Match,Player,Team,Steals,Goals,Assists,Saves,Shots on Goal,Shots Blocked,Checks,Faceoff Win %,Interceptions,Passes,Faceoffs,Goalie Minutes,Skater Minutes",
      ...hockeyStats.map(
        (stat) =>
          `${stat.gameNumber || "N/A"},${stat.matchName || "N/A"},${stat.playerName},${stat.team},${stat.steals},${stat.goals},${stat.assists},${stat.saves},${stat.shotsOnGoal},${stat.shotsBlocked},${stat.checks},${stat.faceoffWinPercentage},${stat.interceptions},${stat.passes},${stat.faceoffs},${stat.goalieMinutes},${stat.skaterMinutes}`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hockey-stats-by-game-${new Date().toISOString().split("T")[0]}.csv`
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-slate-300 text-lg mt-2">Comprehensive match analytics and performance insights</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700 shadow-sm">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <Badge variant="secondary" className="bg-slate-700 text-slate-200 border-slate-600 font-semibold">
                {matches.length} Matches
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="match-analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-lg rounded-xl p-1">
            <TabsTrigger
              value="match-analytics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Match Analytics
            </TabsTrigger>
            <TabsTrigger
              value="hockey-stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Hockey Stats
            </TabsTrigger>
            <TabsTrigger
              value="elo-stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              ELO Stats
            </TabsTrigger>
            <TabsTrigger
              value="player-performance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="team-comparison"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match-analytics" className="space-y-8">
            <div className="space-y-8">
              <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
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
                    <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                      <div className="text-3xl font-bold text-blue-400 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_goals || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-slate-300">Total Goals</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_assists || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-slate-300">Total Assists</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                      <div className="text-3xl font-bold text-purple-400 mb-2">
                        {matchesWithAnalytics.reduce((sum, m) => sum + (m.total_saves || 0), 0)}
                      </div>
                      <div className="text-sm font-semibold text-slate-300">Total Saves</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                      <div className="text-3xl font-bold text-orange-400 mb-2">{matchesWithAnalytics.length}</div>
                      <div className="text-sm font-semibold text-slate-300">Completed Matches</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredMatchStats.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No matches found</h3>
                        <p>Try adjusting your search criteria</p>
                      </div>
                    ) : (
                      filteredMatchStats.slice(0, 10).map((match) => (
                        <div
                          key={match.id}
                          className="p-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 rounded-xl hover:shadow-lg hover:border-emerald-500 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-slate-200 mb-2 text-lg">{match.name}</div>
                              <div className="flex items-center gap-6 text-sm text-slate-400">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500 text-emerald-400 bg-emerald-900/30 font-semibold"
                                >
                                  {match.match_type}
                                </Badge>
                                <span className="font-medium">{new Date(match.created_at).toLocaleDateString()}</span>
                                <span className="font-bold text-lg text-slate-200">
                                  {match.team1_score || 0} - {match.team2_score || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                onClick={() => handleMatchChange(match.id)}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
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
                <Card className="md:col-span-1 bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 border-b border-slate-600">
                    <CardTitle className="flex items-center gap-3 text-slate-200 text-lg">
                      <Search className="h-5 w-5 text-slate-400" />
                      Quick Match Selector
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredMatches.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
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
                                : "border-slate-600 hover:bg-slate-700 bg-slate-800 text-slate-200"
                            }`}
                            onClick={() => setSelectedMatch(match.id)}
                          >
                            <div className="space-y-2">
                              <div className="font-medium truncate">{match.name}</div>
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
                    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
                      <CardContent className="p-16">
                        <div className="text-center space-y-6">
                          <Target className="h-16 w-16 mx-auto text-slate-500" />
                          <div>
                            <h3 className="text-2xl font-bold text-slate-200">Select a Match</h3>
                            <p className="text-slate-400 text-lg">
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
              <Card className="lg:col-span-1 bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Upload className="h-6 w-6" />
                    CSV Input & Game Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
                  <Textarea
                    placeholder="Paste your hockey CSV data here...&#10;Format: ID,steals,goals,assists,shots,pickups,passes,passes_received,save_%,shots_on_goalie,shots_saved,goalie_minutes,skater_minutes"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    rows={10}
                    className="font-mono text-sm border-slate-600 focus:border-blue-500 focus:ring-blue-500 rounded-xl bg-slate-700 text-slate-200 placeholder:text-slate-400"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={processHockeyCSV}
                      disabled={!csvInput.trim() || csvProcessing}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md"
                    >
                      {csvProcessing ? "Processing..." : "Process & Coordinate CSV"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportHockeyStats}
                      disabled={hockeyStats.length === 0}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800 shadow-md"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={processCompletedMatches}
                      disabled={autoProcessing}
                      className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-200 shadow-md"
                    >
                      {autoProcessing ? "Auto-Processing..." : "Refresh from Completed Matches"}
                    </Button>
                  </div>
                  <div className="text-sm text-slate-300 bg-slate-700 p-4 rounded-xl border border-slate-600">
                    CSV data is automatically processed from completed matches using account IDs to correctly map
                    players to their usernames. Statistics are coordinated across analytics, ELO ratings, and
                    leaderboards in real-time.
                    {hockeyStats.length > 0 && (
                      <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 font-medium">
                        ✓ Auto-processing: {hockeyStats.length} game records from {cumulativeStats.size} players with
                        correct Account ID → Player Name mapping
                      </div>
                    )}
                    {autoProcessing && (
                      <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-400 font-medium animate-pulse">
                        🔄 Automatically processing CSV data from completed matches...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                {hockeyStats.length > 0 ? (
                  <div className="space-y-6">
                    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-600 via-teal-600 to-cyan-600 text-white">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <TrendingUp className="h-6 w-6" />
                          Hockey Statistics by Game
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="grid grid-cols-4 gap-6 mb-6">
                          <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                            <div className="text-3xl font-bold text-blue-400 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.goals, 0)}
                            </div>
                            <div className="text-sm font-semibold text-slate-300">Total Goals</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                            <div className="text-3xl font-bold text-green-400 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.assists, 0)}
                            </div>
                            <div className="text-sm font-semibold text-slate-300">Total Assists</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                            <div className="text-3xl font-bold text-purple-400 mb-2">
                              {hockeyStats.reduce((sum, s) => sum + s.saves, 0)}
                            </div>
                            <div className="text-sm font-semibold text-slate-300">Total Saves</div>
                          </div>
                          <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                            <div className="text-3xl font-bold text-orange-400 mb-2">{hockeyStats.length}</div>
                            <div className="text-sm font-semibold text-slate-300">Game Records</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <HockeyStatsTable stats={hockeyStats} />
                  </div>
                ) : (
                  <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl">
                    <CardContent className="p-16">
                      <div className="text-center space-y-6">
                        <Upload className="h-16 w-16 mx-auto text-slate-500" />
                        <div>
                          <h3 className="text-2xl font-bold text-slate-200 mb-2">No Hockey Stats</h3>
                          <p className="text-slate-400 text-lg">
                            Process CSV data manually or click "Refresh from Completed Matches" to automatically load
                            statistics from all completed games with game numbers and match context
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
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <TrendingUp className="h-6 w-6" />
                  ELO Rankings & Player Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {loadingEloStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-slate-400">Loading ELO statistics...</div>
                  </div>
                ) : eloStats.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No ELO data found</h3>
                    <p>Player rankings will appear here once games are completed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-6 mb-8">
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                          {Math.round(eloStats.reduce((sum, p) => sum + (p.elo_rating || 1200), 0) / eloStats.length)}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Average ELO</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {Math.max(...eloStats.map((p) => p.elo_rating || 1200))}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Highest ELO</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                          {eloStats.reduce((sum, p) => sum + (p.total_games || 0), 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Total Games</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-orange-400 mb-2">{eloStats.length}</div>
                        <div className="text-sm font-semibold text-slate-300">Active Players</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {eloStats.map((player, index) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 rounded-xl hover:shadow-lg hover:border-purple-500 transition-all duration-300"
                        >
                          <div className="flex items-center gap-6">
                            <div className="text-2xl font-bold text-slate-400 min-w-[3rem]">#{index + 1}</div>
                            <div className="flex flex-col">
                              <div className="text-lg font-bold text-slate-200">
                                {player.display_name || player.username || "Unknown Player"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-400">{player.elo_rating || 1200}</div>
                              <div className="text-xs text-slate-400 font-medium">ELO Rating</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-400">{player.wins || 0}W</div>
                              <div className="text-xs text-slate-400 font-medium">Wins</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-red-400">{player.losses || 0}L</div>
                              <div className="text-xs text-slate-400 font-medium">Losses</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-400">
                                {player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0}%
                              </div>
                              <div className="text-xs text-slate-400 font-medium">Win Rate</div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`font-semibold ${
                                (player.elo_rating || 1200) >= 1400
                                  ? "border-yellow-500 text-yellow-400 bg-yellow-900/30"
                                  : (player.elo_rating || 1200) >= 1300
                                    ? "border-purple-500 text-purple-400 bg-purple-900/30"
                                    : "border-slate-500 text-slate-400 bg-slate-900/30"
                              }`}
                            >
                              {(player.elo_rating || 1200) >= 1400
                                ? "Elite"
                                : (player.elo_rating || 1200) >= 1300
                                  ? "Advanced"
                                  : "Standard"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="player-performance" className="space-y-8">
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Users className="h-6 w-6" />
                  Player Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {cumulativeStats.size > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-6 mb-8">
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-orange-400 mb-2">{cumulativeStats.size}</div>
                        <div className="text-sm font-semibold text-slate-300">Active Players</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                          {Array.from(cumulativeStats.values()).reduce((sum, p) => sum + p.totalGoals, 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Total Goals</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {Array.from(cumulativeStats.values()).reduce((sum, p) => sum + p.totalAssists, 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Total Assists</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                          {Array.from(cumulativeStats.values()).reduce((sum, p) => sum + p.totalSaves, 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-300">Total Saves</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {Array.from(cumulativeStats.entries())
                        .sort(([, a], [, b]) => b.totalGoals + b.totalAssists - (a.totalGoals + a.totalAssists))
                        .slice(0, 20)
                        .map(([playerId, stats]) => (
                          <div
                            key={playerId}
                            className="p-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 rounded-xl hover:shadow-lg hover:border-orange-500 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <div className="text-lg font-bold text-slate-200">{stats.playerName}</div>
                                <div className="text-sm text-slate-400">{stats.totalGames} games played</div>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="text-center">
                                  <div className="text-xl font-bold text-blue-400">{stats.totalGoals}</div>
                                  <div className="text-xs text-slate-400 font-medium">Goals</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-green-400">{stats.totalAssists}</div>
                                  <div className="text-xs text-slate-400 font-medium">Assists</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-purple-400">{stats.totalSaves}</div>
                                  <div className="text-xs text-slate-400 font-medium">Saves</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-orange-400">
                                    {Math.round(stats.totalMinutes)}
                                  </div>
                                  <div className="text-xs text-slate-400 font-medium">Minutes</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-yellow-400">
                                    {stats.totalGoals + stats.totalAssists}
                                  </div>
                                  <div className="text-xs text-slate-400 font-medium">Points</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-2xl font-bold text-slate-200 mb-2">No Performance Data</h3>
                    <p className="text-lg">
                      Player performance statistics will appear here once hockey stats are processed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team-comparison" className="space-y-8">
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Target className="h-6 w-6" />
                  Team Comparison & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center py-16 text-slate-400">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold text-slate-200 mb-2">Team Analytics Coming Soon</h3>
                  <p className="text-lg">
                    Comprehensive team comparison and performance analytics will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
