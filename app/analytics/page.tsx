"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MatchStatsViewer } from "@/components/analytics/match-stats-viewer"
import { createClient } from "@/lib/supabase/client"
import { analyticsService, type PlayerAnalytics, type TeamAnalytics } from "@/lib/services/analytics-service"
import type { CSVPlayerStats } from "@/lib/services/csv-stats-service"
import { Search, TrendingUp, Users, Target, Download, Trophy, DollarSign } from "lucide-react"

interface DetailedMatch {
  id: string
  name: string
  match_type: string
  status: string
  created_at: string
  team1_score: number
  team2_score: number
  winner: string
  team1_players: Array<{
    id: string
    username: string
    display_name: string
    account_id: string
  }>
  team2_players: Array<{
    id: string
    username: string
    display_name: string
    account_id: string
  }>
  betting_info: {
    total_bets: number
    total_volume: number
    winning_bets: number
    losing_bets: number
  }
  individual_csv_stats: Array<{
    player_id: string
    player_name: string
    account_id: string
    team: number
    goals: number
    assists: number
    saves: number
    shots: number
    steals: number
    passes: number
    goalie_minutes: number
    skater_minutes: number
  }>
}

interface Match {
  id: string
  name: string
  match_type: string
  status: string
  created_at: string
  max_participants: number
  description?: string
  game?: string
  prize_pool?: number
  entry_fee?: number
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

  const [csvStats, setCsvStats] = useState<CSVPlayerStats[]>([])
  const [loadingCsvStats, setLoadingCsvStats] = useState(false)

  const [detailedMatches, setDetailedMatches] = useState<DetailedMatch[]>([])
  const [loadingDetailedMatches, setLoadingDetailedMatches] = useState<false>(false)
  const [selectedDetailedMatch, setSelectedDetailedMatch] = useState<string | null>(null)

  const supabase = createClient()

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

  const processCompletedMatches = useCallback(async () => {
    if (autoProcessing) {
      console.log("[v0] Skipping processing - already in progress")
      return
    }

    setAutoProcessing(true)
    setLoadingCsvStats(true)
    try {
      console.log("[v0] Loading CSV statistics from score submissions...")

      // Get all score submissions with CSV data
      const { data: submissions, error } = await supabase
        .from("score_submissions")
        .select(`
          *,
          matches(name),
          users(username, account_id)
        `)
        .not("csv_code", "is", null)
        .order("submitted_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching CSV submissions:", error)
        return
      }

      const aggregatedStats = new Map()

      const { data: allUsers } = await supabase
        .from("users")
        .select("account_id, username, display_name")
        .not("account_id", "is", null)

      const accountIdMap = new Map()
      allUsers?.forEach((user) => {
        if (user.account_id) {
          accountIdMap.set(user.account_id, user.display_name || user.username)
        }
      })

      console.log(`[v0] Created account ID mapping for ${accountIdMap.size} users`)

      for (const submission of submissions || []) {
        if (!submission.csv_code?.trim()) continue

        try {
          const csvLines = submission.csv_code.trim().split("\n")

          for (let i = 0; i < csvLines.length; i++) {
            const line = csvLines[i].trim()
            if (!line) continue

            const values = line.split(/[,;\t]/).map((v) => v.trim())

            if (values.length < 6) {
              console.log(`[v0] Skipping line ${i}: insufficient data (${values.length} parts)`)
              continue
            }

            let accountId = values[1] || values[0] || ""

            // Handle different account ID formats
            if (accountId.includes("-")) {
              const parts = accountId.split("-")
              accountId = parts[parts.length - 1] // Get the last part
            }

            // Remove any non-numeric characters for account ID
            accountId = accountId.replace(/[^0-9]/g, "")

            if (accountId && accountId.length > 3) {
              const mappedUsername = accountIdMap.get(accountId) || submission.users?.username || `Player ${accountId}`

              const existingStats = aggregatedStats.get(accountId)

              const newStats = {
                steals: Number.parseInt(values[2]) || 0,
                goals: Number.parseInt(values[3]) || 0,
                assists: Number.parseInt(values[4]) || 0,
                shots: Number.parseInt(values[5]) || 0,
                pickups: Number.parseInt(values[6]) || 0,
                passes: Number.parseInt(values[7]) || 0,
                passesReceived: Number.parseInt(values[8]) || 0,
                savePercentage: Number.parseFloat(values[9]) || 0,
                shotsOnGoalie: Number.parseInt(values[10]) || 0,
                shotsSaved: Number.parseInt(values[11]) || 0,
                goalieMinutes: Number.parseFloat(values[12]) || 0,
                skaterMinutes: Number.parseFloat(values[13]) || 0,
              }

              if (existingStats) {
                aggregatedStats.set(accountId, {
                  ...existingStats,
                  steals: existingStats.steals + newStats.steals,
                  goals: existingStats.goals + newStats.goals,
                  assists: existingStats.assists + newStats.assists,
                  shots: existingStats.shots + newStats.shots,
                  pickups: existingStats.pickups + newStats.pickups,
                  passes: existingStats.passes + newStats.passes,
                  passesReceived: existingStats.passesReceived + newStats.passesReceived,
                  savePercentage: (existingStats.savePercentage + newStats.savePercentage) / 2, // Average save percentage
                  shotsOnGoalie: existingStats.shotsOnGoalie + newStats.shotsOnGoalie,
                  shotsSaved: existingStats.shotsSaved + newStats.shotsSaved,
                  goalieMinutes: existingStats.goalieMinutes + newStats.goalieMinutes,
                  skaterMinutes: existingStats.skaterMinutes + newStats.skaterMinutes,
                  gamesPlayed: existingStats.gamesPlayed + 1, // Increment games played
                })
              } else {
                aggregatedStats.set(accountId, {
                  accountId,
                  username: mappedUsername,
                  team: Number.parseInt(values[0]) || 1,
                  ...newStats,
                  gamesPlayed: 1, // Initialize games played counter
                  matchId: submission.match_id,
                  matchName: submission.matches?.name || "Unknown Match",
                  submittedAt: submission.submitted_at,
                })
              }
            }
          }
        } catch (parseError) {
          console.error("[v0] Error parsing CSV for submission:", submission.id, parseError)
        }
      }

      const csvStatsData = Array.from(aggregatedStats.values())
      setCsvStats(csvStatsData)
      console.log(
        `[v0] Processed ${csvStatsData.length} aggregated player stats from ${submissions?.length || 0} submissions`,
      )

      const handleCsvProcessed = () => {
        console.log("[v0] CSV processed event received, refreshing stats...")
        setTimeout(() => processCompletedMatches(), 1000)
      }

      window.addEventListener("csvProcessed", handleCsvProcessed)

      return () => {
        window.removeEventListener("csvProcessed", handleCsvProcessed)
      }
    } catch (error) {
      console.error("Error processing CSV submissions:", error)
    } finally {
      setAutoProcessing(false)
      setLoadingCsvStats(false)
    }
  }, [supabase])

  const refreshStatsAfterCSV = useCallback(async () => {
    console.log("[v0] Refreshing stats after CSV submission...")
    await Promise.all([loadEloStats(), processCompletedMatches()])
  }, [processCompletedMatches])

  const processHockeyCSV = async () => {
    if (!csvInput.trim()) return

    setCsvProcessing(true)
    try {
      console.log("[v0] CSV processing functionality has been removed")
      setCsvInput("")
    } catch (error) {
      console.error("[v0] Error processing CSV:", error)
    } finally {
      setCsvProcessing(false)
    }
  }

  const loadDetailedMatchAnalytics = useCallback(async () => {
    setLoadingDetailedMatches(true)
    try {
      console.log("[v0] Loading detailed match analytics...")

      // Get completed matches with results
      const { data: matchResults, error: matchError } = await supabase
        .from("match_results")
        .select(`
          *,
          matches!inner(
            id,
            name,
            match_type,
            status,
            created_at
          )
        `)
        .order("validated_at", { ascending: false })
        .limit(20)

      if (matchError) {
        console.error("[v0] Error loading match results:", matchError)
        return
      }

      const detailedMatchData: DetailedMatch[] = []

      for (const result of matchResults || []) {
        const matchId = result.match_id

        // Get match participants with team assignments
        const { data: participants } = await supabase
          .from("match_participants")
          .select(`
            user_id,
            users!inner(
              id,
              username,
              display_name,
              account_id
            )
          `)
          .eq("match_id", matchId)

        // Assign teams based on participant order (first 4 = team 1, next 4 = team 2)
        const team1Players = (participants || []).slice(0, 4).map((p) => ({
          id: p.users.id,
          username: p.users.username,
          display_name: p.users.display_name,
          account_id: p.users.account_id,
        }))

        const team2Players = (participants || []).slice(4, 8).map((p) => ({
          id: p.users.id,
          username: p.users.username,
          display_name: p.users.display_name,
          account_id: p.users.account_id,
        }))

        // Get betting information
        const { data: bets } = await supabase.from("bets").select("*").eq("market_id", matchId) // Assuming market_id links to match_id

        const bettingInfo = {
          total_bets: bets?.length || 0,
          total_volume: bets?.reduce((sum, bet) => sum + (bet.stake_amount || 0), 0) || 0,
          winning_bets: bets?.filter((bet) => bet.status === "won").length || 0,
          losing_bets: bets?.filter((bet) => bet.status === "lost").length || 0,
        }

        // Get individual CSV stats for this match
        const { data: csvSubmissions } = await supabase
          .from("score_submissions")
          .select("csv_code, submitter_id, users!inner(username, display_name, account_id)")
          .eq("match_id", matchId)
          .not("csv_code", "is", null)

        const individualCsvStats: DetailedMatch["individual_csv_stats"] = []

        // Process CSV data for each submission
        for (const submission of csvSubmissions || []) {
          if (submission.csv_code) {
            const lines = submission.csv_code.split("\n")
            for (const line of lines) {
              if (line.trim()) {
                const parts = line.split(",")
                if (parts.length >= 13) {
                  const accountId = parts[0]?.trim()
                  const team = Number.parseInt(parts[1]?.trim()) || 0
                  const goals = Number.parseInt(parts[2]?.trim()) || 0
                  const assists = Number.parseInt(parts[3]?.trim()) || 0
                  const saves = Number.parseInt(parts[4]?.trim()) || 0
                  const shots = Number.parseInt(parts[5]?.trim()) || 0
                  const steals = Number.parseInt(parts[6]?.trim()) || 0
                  const passes = Number.parseInt(parts[7]?.trim()) || 0
                  const goalieMinutes = Number.parseInt(parts[11]?.trim()) || 0
                  const skaterMinutes = Number.parseInt(parts[12]?.trim()) || 0

                  // Find player name from account ID mapping
                  const playerName = submission.users.display_name || submission.users.username || `Player ${accountId}`

                  individualCsvStats.push({
                    player_id: submission.submitter_id,
                    player_name: playerName,
                    account_id: accountId,
                    team,
                    goals,
                    assists,
                    saves,
                    shots,
                    steals,
                    passes,
                    goalie_minutes: goalieMinutes,
                    skater_minutes: skaterMinutes,
                  })
                }
              }
            }
          }
        }

        const { team1_score, team2_score, winning_team } = result
        const team1_players = (participants || []).slice(0, 4).map((p) => ({
          id: p.users.id,
          username: p.users.username,
          display_name: p.users.display_name,
          account_id: p.users.account_id,
        }))

        const team2_players = (participants || []).slice(4, 8).map((p) => ({
          id: p.users.id,
          username: p.users.username,
          display_name: p.users.display_name,
          account_id: p.users.account_id,
        }))

        detailedMatchData.push({
          id: matchId,
          name: result.matches.name,
          match_type: result.matches.match_type,
          status: result.matches.status,
          created_at: result.matches.created_at,
          team1_score: result.team1_score || 0,
          team2_score: result.team2_score || 0,
          winner: result.winning_team === 1 ? "Team 1" : result.winning_team === 2 ? "Team 2" : "TBD",
          team1_players,
          team2_players,
          betting_info: bettingInfo,
          individual_csv_stats: individualCsvStats,
        })
      }

      setDetailedMatches(detailedMatchData)
      console.log(`[v0] Loaded ${detailedMatchData.length} detailed matches`)
    } catch (error) {
      console.error("[v0] Error loading detailed match analytics:", error)
    } finally {
      setLoadingDetailedMatches(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMatches()
    loadAnalyticsData()
    loadEloStats()
    processCompletedMatches()
    loadDetailedMatchAnalytics() // Load detailed match analytics on mount
  }, [loadDetailedMatchAnalytics, processCompletedMatches])

  const fetchMatches = async () => {
    try {
      console.log("[v0] Fetching matches from database...")

      const { data, error } = await supabase
        .from("matches")
        .select("id, name, match_type, status, created_at, max_participants, description, game, prize_pool, entry_fee")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("[v0] Error fetching matches:", error)
        throw error
      }

      console.log(`[v0] Found ${data?.length || 0} matches in database`)

      const mappedMatches = (data || []).map((match) => ({
        ...match,
        duration: undefined, // Not available in database
        total_goals: 0, // Default value
        total_assists: 0, // Default value
        total_saves: 0, // Default value
        avg_elo: 0, // Default value
        all_players: [], // Default empty array
        game_number: undefined, // Not available in database
      }))

      setMatches(mappedMatches)

      // If no matches exist, log helpful information
      if (!data || data.length === 0) {
        console.log("[v0] No matches found - this is normal for a new installation")
        console.log("[v0] Matches will appear here once games are created and completed")
      }
    } catch (error) {
      console.error("[v0] Error fetching matches:", error)
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
      match.all_players.some(
        (player) =>
          player.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.username.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  )

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
      "Match,Date,Type,Status,Score,Winner,Duration,Total Goals,Total Assists,Total Saves,Avg ELO,Players",
      ...matchesWithAnalytics.map(
        (match) =>
          `${match.name},${new Date(match.created_at).toLocaleDateString()},${match.match_type},${match.status},${match.team1_score || 0}-${match.team2_score || 0},${match.winning_team || "N/A"},${match.duration ? `${Math.round(match.duration / 60)}m` : "N/A"},${match.total_goals || 0},${match.total_assists || 0},${match.total_saves || 0},${match.avg_elo || 0},${match.all_players.map((player: any) => player.display_name || player.username).join(",")}`,
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
      "Match,Date,Type,Status,Score,Winner,Duration,Total Goals,Total Assists,Total Saves,Avg ELO,Players",
      `${match.name},${new Date(match.created_at).toLocaleDateString()},${match.match_type},${match.status},N/A-N/A,N/A,${match.duration ? `${Math.round(match.duration / 60)}m` : "N/A"},${match.total_goals || 0},${match.total_assists || 0},${match.total_saves || 0},${match.avg_elo || 0},${match.all_players?.map((player: any) => player.display_name || player.username).join(",") || "N/A"}`,
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
          {/* Added new tab for detailed match analytics with teams, scores, betting, and individual CSV stats */}
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-lg rounded-xl p-1">
            <TabsTrigger
              value="detailed-matches"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Detailed Matches
            </TabsTrigger>
            <TabsTrigger
              value="match-analytics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Match Analytics
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="team-comparison"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-slate-300"
            >
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detailed-matches" className="space-y-8">
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Trophy className="h-6 w-6" />
                  Complete Match Analytics - Teams, Scores, Betting & Individual CSV Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {loadingDetailedMatches ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-slate-400">Loading detailed match analytics...</div>
                  </div>
                ) : detailedMatches.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No detailed matches found</h3>
                    <p>Complete match analytics will appear here once games are finished</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {detailedMatches.map((match) => (
                      <div
                        key={match.id}
                        className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 rounded-2xl p-8 space-y-8"
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-200 mb-2">{match.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <Badge variant="outline" className="border-blue-500 text-blue-400 bg-blue-900/30">
                                {match.match_type}
                              </Badge>
                              <span>{new Date(match.created_at).toLocaleDateString()}</span>
                              <Badge variant="outline" className="border-green-500 text-green-400 bg-green-900/30">
                                {match.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-slate-200 mb-2">
                              {match.team1_score} - {match.team2_score}
                            </div>
                            <Badge
                              variant="outline"
                              className={`${
                                match.winner === "Team 1"
                                  ? "border-blue-500 text-blue-400 bg-blue-900/30"
                                  : match.winner === "Team 2"
                                    ? "border-red-500 text-red-400 bg-red-900/30"
                                    : "border-slate-500 text-slate-400 bg-slate-900/30"
                              }`}
                            >
                              Winner: {match.winner}
                            </Badge>
                          </div>
                        </div>

                        {/* Team Rosters */}
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
                            <h4 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Team 1 ({match.team1_score})
                            </h4>
                            <div className="space-y-3">
                              {match.team1_players.map((player) => (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-200">
                                      {player.display_name || player.username}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                      ID: {player.account_id || "Not Mapped"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
                            <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Team 2 ({match.team2_score})
                            </h4>
                            <div className="space-y-3">
                              {match.team2_players.map((player) => (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-200">
                                      {player.display_name || player.username}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                      ID: {player.account_id || "Not Mapped"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Betting Information */}
                        <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
                          <h4 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Betting Information
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">{match.betting_info.total_bets}</div>
                              <div className="text-sm text-slate-400">Total Bets</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">
                                ${match.betting_info.total_volume.toFixed(2)}
                              </div>
                              <div className="text-sm text-slate-400">Total Volume</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">{match.betting_info.winning_bets}</div>
                              <div className="text-sm text-slate-400">Winning Bets</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-400">{match.betting_info.losing_bets}</div>
                              <div className="text-sm text-slate-400">Losing Bets</div>
                            </div>
                          </div>
                        </div>

                        {/* Individual CSV Stats Spreadsheet */}
                        <div className="bg-slate-900/50 border border-slate-600 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              Individual Player CSV Statistics
                            </h4>
                            <Button
                              onClick={() => {
                                const csvContent = [
                                  "Account ID,Player Name,Team,Goals,Assists,Saves,Shots,Steals,Passes,Goalie Minutes,Skater Minutes",
                                  ...match.individual_csv_stats.map(
                                    (stat) =>
                                      `${stat.account_id},"${stat.player_name}",${stat.team},${stat.goals},${stat.assists},${stat.saves},${stat.shots},${stat.steals},${stat.passes},${stat.goalie_minutes},${stat.skater_minutes}`,
                                  ),
                                ].join("\n")

                                const blob = new Blob([csvContent], { type: "text/csv" })
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = `${match.name}-individual-stats.csv`
                                a.click()
                                window.URL.revokeObjectURL(url)
                              }}
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export CSV
                            </Button>
                          </div>

                          {match.individual_csv_stats.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-700">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-slate-200">Account ID</th>
                                    <th className="px-3 py-2 text-left text-slate-200">Player</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Team</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Goals</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Assists</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Saves</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Shots</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Steals</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Passes</th>
                                    <th className="px-3 py-2 text-center text-slate-200">Possession</th>
                                    <th className="px-3 py-2 text-center text-slate-200">S.Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {match.individual_csv_stats.map((stat, index) => (
                                    <tr
                                      key={`${stat.account_id}-${index}`}
                                      className="border-t border-slate-600 hover:bg-slate-700/30"
                                    >
                                      <td className="px-3 py-2 text-slate-400 font-mono text-xs">{stat.account_id}</td>
                                      <td className="px-3 py-2 text-slate-200 font-semibold">{stat.player_name}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            stat.team === 1
                                              ? "bg-blue-600 text-white"
                                              : stat.team === 2
                                                ? "bg-red-600 text-white"
                                                : "bg-slate-600 text-slate-300"
                                          }`}
                                        >
                                          {stat.team}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-300 font-semibold">
                                        {stat.goals}
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-300">{stat.assists}</td>
                                      <td className="px-3 py-2 text-center text-slate-300">{stat.saves}</td>
                                      <td className="px-3 py-2 text-center text-slate-300">{stat.shots}</td>
                                      <td className="px-3 py-2 text-center text-slate-300">{stat.steals}</td>
                                      <td className="px-3 py-2 text-center text-slate-300">{stat.passes}</td>
                                      <td className="px-3 py-2 text-center text-slate-300"></td>
                                      <td className="px-3 py-2 text-center text-slate-300"></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-400">
                              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No individual CSV statistics available for this match</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="text-center">
                      <Button
                        onClick={loadDetailedMatchAnalytics}
                        disabled={loadingDetailedMatches}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loadingDetailedMatches ? "Loading..." : "Refresh Detailed Analytics"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="performance" className="space-y-8">
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <TrendingUp className="h-6 w-6" />
                  ELO Rankings & Player Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {loadingEloStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-foreground">Loading ELO statistics...</div>
                  </div>
                ) : eloStats.length === 0 ? (
                  <div className="text-center py-12 text-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No ELO data found</h3>
                    <p>Player rankings will appear here once games are completed</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-5 gap-4 mb-8">
                      <div className="text-center p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-xl border border-slate-600 shadow-lg">
                        <div className="text-2xl font-bold text-purple-400 mb-1">
                          {Math.round(eloStats.reduce((sum, p) => sum + (p.elo_rating || 1200), 0) / eloStats.length)}
                        </div>
                        <div className="text-xs font-semibold text-slate-200">Average ELO</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-xl border border-slate-600 shadow-lg">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {Math.max(...eloStats.map((p) => p.elo_rating || 1200))}
                        </div>
                        <div className="text-xs font-semibold text-slate-200">Highest ELO</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-xl border border-slate-600 shadow-lg">
                        <div className="text-2xl font-bold text-blue-400 mb-1">
                          {eloStats.reduce((sum, p) => sum + (p.total_games || 0), 0)}
                        </div>
                        <div className="text-xs font-semibold text-slate-200">Total Games</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-xl border border-slate-600 shadow-lg">
                        <div className="text-2xl font-bold text-orange-400 mb-1">{eloStats.length}</div>
                        <div className="text-xs font-semibold text-slate-200">Active Players</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-xl border border-slate-600 shadow-lg">
                        <div className="text-2xl font-bold text-cyan-400 mb-1">
                          {eloStats.filter((p) => p.account_id).length}
                        </div>
                        <div className="text-xs font-semibold text-slate-200">CSV Mapped</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl border border-slate-600 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 text-white">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">Player Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">Account ID</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">ELO Rating</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">Wins</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">Losses</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">Total Games</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">Win Rate</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">CSV Status</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold">Tier</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {eloStats.map((player, index) => {
                              const winRate =
                                player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0
                              const tier =
                                (player.elo_rating || 1200) >= 1400
                                  ? "Elite"
                                  : (player.elo_rating || 1200) >= 1300
                                    ? "Advanced"
                                    : "Standard"
                              const hasCsvMapping = !!player.account_id

                              return (
                                <tr key={player.id} className="hover:bg-slate-800/50 transition-colors duration-200">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center">
                                      <div className="text-lg font-bold text-slate-300 min-w-[2rem]">#{index + 1}</div>
                                      {index < 3 && (
                                        <div className="ml-2">
                                          {index === 0 && <span className="text-yellow-400">🥇</span>}
                                          {index === 1 && <span className="text-gray-400">🥈</span>}
                                          {index === 2 && <span className="text-amber-600">🥉</span>}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="font-semibold text-slate-200">
                                      {player.display_name || player.username || "Unknown Player"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="font-mono text-sm text-slate-400">
                                      {player.account_id || "Not Mapped"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="text-xl font-bold text-purple-400">{player.elo_rating || 1200}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="text-lg font-semibold text-green-400">{player.wins || 0}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="text-lg font-semibold text-red-400">{player.losses || 0}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="text-lg font-semibold text-blue-400">{player.total_games || 0}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="text-lg font-semibold text-cyan-400">{winRate}%</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <Badge
                                      variant="outline"
                                      className={`font-semibold text-xs ${
                                        hasCsvMapping
                                          ? "border-green-500 text-green-400 bg-green-900/30"
                                          : "border-red-500 text-red-400 bg-red-900/30"
                                      }`}
                                    >
                                      {hasCsvMapping ? "✓ Mapped" : "✗ Not Found"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <Badge
                                      variant="outline"
                                      className={`font-semibold text-xs ${
                                        tier === "Elite"
                                          ? "border-yellow-500 text-yellow-400 bg-yellow-900/30"
                                          : tier === "Advanced"
                                            ? "border-purple-500 text-purple-400 bg-purple-900/30"
                                            : "border-slate-500 text-slate-400 bg-slate-900/30"
                                      }`}
                                    >
                                      {tier}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-slate-400">
                        Showing {eloStats.length} players with ELO ratings and CSV account ID mapping status
                      </div>
                      <Button
                        onClick={() => {
                          const csvContent = [
                            "Rank,Player Name,Account ID,ELO Rating,Wins,Losses,Total Games,Win Rate,CSV Status,Tier",
                            ...eloStats.map((player, index) => {
                              const winRate =
                                player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0
                              const tier =
                                (player.elo_rating || 1200) >= 1400
                                  ? "Elite"
                                  : (player.elo_rating || 1200) >= 1300
                                    ? "Advanced"
                                    : "Standard"
                              const hasCsvMapping = !!player.account_id

                              return `${index + 1},"${player.display_name || player.username || "Unknown Player"}","${player.account_id || "Not Mapped"}",${player.elo_rating || 1200},${player.wins || 0},${player.losses || 0},${player.total_games || 0},${winRate}%,${hasCsvMapping ? "Mapped" : "Not Found"},${tier}`
                            }),
                          ].join("\n")

                          const blob = new Blob([csvContent], { type: "text/csv" })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `elo-stats-spreadsheet-${new Date().toISOString().split("T")[0]}.csv`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        }}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800 shadow-md"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Spreadsheet
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-8">
            <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Users className="h-6 w-6" />
                  CSV Hockey Statistics Spreadsheet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {loadingCsvStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-slate-400">Loading CSV statistics...</div>
                  </div>
                ) : csvStats.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-300">Showing {csvStats.length} player records from CSV submissions</p>
                      <Button
                        onClick={() => {
                          const csvContent = [
                            "Account ID,Player Name,Team,Games Played,Steals,Goals,Assists,Shots,Pickups,Passes,Passes Received,Possession,Saves Allowed,Saves,Save Amount,Save Percentage,Goal Tended,Skating Time,Match,Submitted At",
                            ...csvStats.map(
                              (stat) =>
                                `${stat.accountId},"${stat.username}",${stat.team},${stat.gamesPlayed},${stat.steals},${stat.goals},${stat.assists},${stat.shots},${stat.pickups},${stat.passes},${stat.passesReceived},${stat.possession},${stat.savesAllowed},${stat.saves},${stat.saveAmount || stat.saves + stat.savesAllowed},${stat.savePercentage?.toFixed(1) || "0.0"},${stat.goalTended},${stat.skatingTime},"${stat.matchName}","${new Date(stat.submittedAt).toLocaleString()}"`,
                            ),
                          ].join("\n")

                          const blob = new Blob([csvContent], { type: "text/csv" })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `csv-hockey-stats-${new Date().toISOString().split("T")[0]}.csv`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        }}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800 shadow-md"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-600">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-slate-200 font-semibold">Account ID</th>
                            <th className="px-4 py-3 text-left text-slate-200 font-semibold">Player Name</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Team</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Games Played</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Steals</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Goals</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Assists</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Shots</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Pickups</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Passes</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">P. Received</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Possession</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Saves Allowed</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Saves</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Save Amount</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Save %</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Goal Tended</th>
                            <th className="px-4 py-3 text-center text-slate-200 font-semibold">Skating Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                          {csvStats.map((stat, index) => (
                            <tr key={`${stat.accountId}-${index}`} className="hover:bg-slate-700/50">
                              <td className="px-4 py-3 text-slate-300 font-mono text-xs">{stat.accountId}</td>
                              <td className="px-4 py-3 text-slate-200 font-medium">{stat.username}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline" className="border-blue-500 text-blue-400">
                                  Team {stat.team}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.gamesPlayed}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.steals}</td>
                              <td className="px-4 py-3 text-center text-green-400 font-semibold">{stat.goals}</td>
                              <td className="px-4 py-3 text-center text-blue-400 font-semibold">{stat.assists}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.shots}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.pickups}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.passes}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.passesReceived}</td>
                              <td className="px-4 py-3 text-center text-yellow-400 font-semibold">{stat.possession}</td>
                              <td className="px-4 py-3 text-center text-red-400">{stat.savesAllowed}</td>
                              <td className="px-4 py-3 text-center text-green-400 font-semibold">{stat.saves}</td>
                              <td className="px-4 py-3 text-center text-purple-400 font-semibold">
                                {stat.saveAmount || stat.saves + stat.savesAllowed}
                              </td>
                              <td className="px-4 py-3 text-center text-cyan-400 font-semibold">
                                {stat.savePercentage?.toFixed(1) || "0.0"}%
                              </td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.goalTended}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{stat.skatingTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-center">
                      <Button
                        onClick={processCompletedMatches}
                        disabled={autoProcessing}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {autoProcessing ? "Processing..." : "Refresh CSV Statistics"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">No CSV Statistics Found</h3>
                    <p className="text-slate-400 mb-6">
                      CSV statistics from completed matches will appear here automatically.
                    </p>
                    <Button
                      onClick={processCompletedMatches}
                      disabled={autoProcessing}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {autoProcessing ? "Processing..." : "Load CSV Statistics"}
                    </Button>
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
