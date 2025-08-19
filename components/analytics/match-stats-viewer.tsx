"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Heart, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PlayerStats {
  id: string
  user_id: string
  kills: number
  deaths: number
  assists: number
  damage_dealt: number
  damage_taken: number
  healing_done: number
  accuracy: number
  score: number
  users: {
    username: string
    elo_rating: number
  }
}

interface TeamStats {
  id: string
  team_name: string
  total_kills: number
  total_deaths: number
  total_damage: number
  total_healing: number
  team_score: number
}

interface MatchStatsViewerProps {
  matchId: string
}

export function MatchStatsViewer({ matchId }: MatchStatsViewerProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch player analytics
        const { data: players } = await supabase
          .from("player_analytics")
          .select(`
            *,
            users:user_id (
              username,
              elo_rating
            )
          `)
          .eq("match_id", matchId)

        // Fetch team analytics
        const { data: teams } = await supabase.from("team_analytics").select("*").eq("match_id", matchId)

        setPlayerStats(players || [])
        setTeamStats(teams || [])
      } catch (error) {
        console.error("Error fetching match stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [matchId, supabase])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading match statistics...</div>
        </CardContent>
      </Card>
    )
  }

  if (playerStats.length === 0 && teamStats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No statistics available for this match.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Statistics */}
      {teamStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Team Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {teamStats.map((team) => (
                <div key={team.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">{team.team_name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Kills:</span>
                      <Badge variant="secondary">{team.total_kills}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Deaths:</span>
                      <Badge variant="outline">{team.total_deaths}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Damage:</span>
                      <Badge variant="secondary">{team.total_damage.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Healing:</span>
                      <Badge variant="outline">{team.total_healing.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span>Team Score:</span>
                      <Badge className="bg-yellow-500 text-yellow-50">{team.team_score}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Statistics */}
      {playerStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Player Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {playerStats.map((player) => (
                <div key={player.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{player.users?.username}</span>
                      <Badge variant="outline">ELO: {player.users?.elo_rating}</Badge>
                    </div>
                    <Badge className="bg-blue-500 text-blue-50">Score: {player.score}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      <span>K/D/A:</span>
                      <Badge variant="secondary">
                        {player.kills}/{player.deaths}/{player.assists}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      <span>Accuracy:</span>
                      <Badge variant="outline">{player.accuracy}%</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span>Damage:</span>
                      <Badge variant="secondary">{player.damage_dealt.toLocaleString()}</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-green-500" />
                      <span>Healing:</span>
                      <Badge variant="outline">{player.healing_done.toLocaleString()}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
