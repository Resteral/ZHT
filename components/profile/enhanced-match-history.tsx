"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar, Filter, TrendingUp, TrendingDown, Search } from "lucide-react"
import { ProfileNameLink } from "./profile-name-link"

interface Match {
  id: string
  opponent_id: string
  opponent_username: string
  game: string
  match_type: string
  tournament_name?: string
  result: "win" | "loss" | "draw"
  player_score: number
  opponent_score: number
  elo_before: number
  elo_after: number
  elo_change: number
  match_duration: number
  match_date: string
  season: string
}

interface EnhancedMatchHistoryProps {
  userId: string
}

export function EnhancedMatchHistory({ userId }: EnhancedMatchHistoryProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    game: "all",
    result: "all",
    matchType: "all",
    timeRange: "30",
    search: "",
  })
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [filters, page])

  const loadMatches = async () => {
    try {
      // Mock data - would fetch from Supabase with filters
      const mockMatches: Match[] = [
        {
          id: "1",
          opponent_id: "opp1",
          opponent_username: "ShadowNinja",
          game: "counter_strike",
          match_type: "tournament",
          tournament_name: "Winter Championship",
          result: "win",
          player_score: 16,
          opponent_score: 12,
          elo_before: 1823,
          elo_after: 1847,
          elo_change: 24,
          match_duration: 45,
          match_date: "2024-01-15T20:30:00Z",
          season: "2024-Q1",
        },
        {
          id: "2",
          opponent_id: "opp2",
          opponent_username: "TacticalAce",
          game: "rainbow_six_siege",
          match_type: "league",
          tournament_name: "Pro League",
          result: "loss",
          player_score: 2,
          opponent_score: 3,
          elo_before: 1841,
          elo_after: 1823,
          elo_change: -18,
          match_duration: 38,
          match_date: "2024-01-14T19:15:00Z",
          season: "2024-Q1",
        },
        {
          id: "3",
          opponent_id: "opp3",
          opponent_username: "QuickScope99",
          game: "call_of_duty",
          match_type: "ranked",
          result: "win",
          player_score: 250,
          opponent_score: 180,
          elo_before: 1810,
          elo_after: 1841,
          elo_change: 31,
          match_duration: 22,
          match_date: "2024-01-13T21:45:00Z",
          season: "2024-Q1",
        },
      ]

      setMatches(page === 1 ? mockMatches : [...matches, ...mockMatches])
      setHasMore(mockMatches.length === 10) // Assume 10 per page
    } catch (error) {
      console.error("Error loading matches:", error)
    } finally {
      setLoading(false)
    }
  }

  const getGameIcon = (game: string) => {
    const icons = {
      counter_strike: "💥",
      rainbow_six_siege: "🛡️",
      call_of_duty: "🎯",
      zealot_hockey: "🏒",
    }
    return icons[game as keyof typeof icons] || "🎮"
  }

  const getGameName = (game: string) => {
    const names = {
      counter_strike: "Counter Strike",
      rainbow_six_siege: "Rainbow Six Siege",
      call_of_duty: "Call of Duty",
      zealot_hockey: "Zealot Hockey",
    }
    return names[game as keyof typeof names] || game
  }

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case "tournament":
        return "bg-purple-500/20 text-purple-500"
      case "league":
        return "bg-blue-500/20 text-blue-500"
      case "ranked":
        return "bg-green-500/20 text-green-500"
      default:
        return "bg-gray-500/20 text-gray-500"
    }
  }

  const filteredMatches = matches.filter((match) => {
    if (filters.game !== "all" && match.game !== filters.game) return false
    if (filters.result !== "all" && match.result !== filters.result) return false
    if (filters.matchType !== "all" && match.match_type !== filters.matchType) return false
    if (filters.search && !match.opponent_username.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Match Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Game</label>
              <Select value={filters.game} onValueChange={(value) => setFilters({ ...filters, game: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="counter_strike">Counter Strike</SelectItem>
                  <SelectItem value="rainbow_six_siege">Rainbow Six Siege</SelectItem>
                  <SelectItem value="call_of_duty">Call of Duty</SelectItem>
                  <SelectItem value="zealot_hockey">Zealot Hockey</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Result</label>
              <Select value={filters.result} onValueChange={(value) => setFilters({ ...filters, result: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="win">Wins Only</SelectItem>
                  <SelectItem value="loss">Losses Only</SelectItem>
                  <SelectItem value="draw">Draws Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Match Type</label>
              <Select value={filters.matchType} onValueChange={(value) => setFilters({ ...filters, matchType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="league">League</SelectItem>
                  <SelectItem value="ranked">Ranked</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={filters.timeRange} onValueChange={(value) => setFilters({ ...filters, timeRange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 3 Months</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search Opponent</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Match History
            </span>
            <Badge variant="outline">{filteredMatches.length} matches</Badge>
          </CardTitle>
          <CardDescription>Detailed history of all your competitive matches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading match history...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No matches found with current filters</p>
              </div>
            ) : (
              filteredMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        match.result === "win"
                          ? "bg-green-500"
                          : match.result === "loss"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <div className="text-2xl">{getGameIcon(match.game)}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{getGameName(match.game)}</span>
                        <Badge variant="outline" className={getMatchTypeColor(match.match_type)}>
                          {match.match_type}
                        </Badge>
                        {match.tournament_name && (
                          <Badge variant="outline" className="text-xs">
                            {match.tournament_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        vs{" "}
                        <ProfileNameLink
                          userId={match.opponent_id}
                          username={match.opponent_username}
                          pageSource="match-history"
                        />{" "}
                        • {new Date(match.match_date).toLocaleDateString()} • {match.match_duration}min
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">
                        {match.player_score}-{match.opponent_score}
                      </span>
                      <Badge
                        variant={
                          match.result === "win" ? "default" : match.result === "loss" ? "destructive" : "secondary"
                        }
                      >
                        {match.result.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {match.elo_before} → {match.elo_after}
                      </span>
                      <div
                        className={`flex items-center gap-1 font-medium ${
                          match.elo_change > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {match.elo_change > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {match.elo_change > 0 ? "+" : ""}
                        {match.elo_change}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {hasMore && !loading && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setPage(page + 1)} className="bg-transparent">
                Load More Matches
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
