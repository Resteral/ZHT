"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"
import { useEffect, useState } from "react"
import { csvIdMappingService } from "@/lib/services/csv-id-mapping"
import type { HockeyStats } from "@/lib/services/csv-hockey-parser"

interface HockeyStatsTableProps {
  stats: HockeyStats[]
  title?: string
}

interface EnhancedHockeyStats extends HockeyStats {
  actualUsername?: string
  actualEloRating?: number
  userFound: boolean
}

export function HockeyStatsTable({ stats, title = "Match Statistics" }: HockeyStatsTableProps) {
  const [enhancedStats, setEnhancedStats] = useState<EnhancedHockeyStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      const csvIds = stats.map((stat) => stat.playerId)
      const userMap = await csvIdMappingService.getUsersBatchByCSVIds(csvIds)

      const enhanced = stats.map((stat) => {
        const user = userMap.get(stat.playerId)
        return {
          ...stat,
          actualUsername: user?.username,
          actualEloRating: user?.elo_rating,
          userFound: !!user,
        }
      })

      setEnhancedStats(enhanced)
      setLoading(false)
    }

    fetchUserData()
  }, [stats])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading player data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading hockey statistics...</div>
        </CardContent>
      </Card>
    )
  }

  const mvpPlayerId = enhancedStats.reduce((prev, current) =>
    current.goals + current.assists > prev.goals + prev.assists ? current : prev,
  ).playerId

  const sortedStats = [...enhancedStats].sort((a, b) => b.goals + b.assists - (a.goals + a.assists))

  const getPlayerColor = (team: number) => {
    return team === 1 ? "text-blue-400" : "text-red-400"
  }

  const formatSavePercent = (savePercent: number) => {
    return savePercent > 0 ? `${(savePercent * 100).toFixed(0)}%` : "N/A"
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline">{enhancedStats.length} Players</Badge>
          <Badge variant="secondary">{enhancedStats.filter((s) => s.userFound).length} Mapped</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left p-3 font-medium">Player</th>
                <th className="text-center p-3 font-medium">S/T +/-</th>
                <th className="text-center p-3 font-medium">Goals</th>
                <th className="text-center p-3 font-medium">Assists</th>
                <th className="text-center p-3 font-medium">Shots</th>
                <th className="text-center p-3 font-medium">Pickups</th>
                <th className="text-center p-3 font-medium">Passes</th>
                <th className="text-center p-3 font-medium">Pass Rec.</th>
                <th className="text-center p-3 font-medium">Save %</th>
                <th className="text-center p-3 font-medium">Saves</th>
                <th className="text-center p-3 font-medium">Allowed</th>
                <th className="text-center p-3 font-medium">Goalie Time</th>
                <th className="text-center p-3 font-medium">Skater Time</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stat, index) => (
                <tr
                  key={`${stat.playerId}-${index}`}
                  className={`border-b border-gray-700 ${index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getPlayerColor(stat.team)}`}>
                        {stat.userFound ? stat.actualUsername : `Player ${stat.playerId}`}
                      </span>
                      {stat.playerId === mvpPlayerId && <Crown className="w-4 h-4 text-yellow-400" />}
                      <Badge variant="outline" className="text-xs">
                        ID: {stat.playerId}
                      </Badge>
                      {stat.userFound && stat.actualEloRating && (
                        <Badge variant="secondary" className="text-xs">
                          ELO: {stat.actualEloRating}
                        </Badge>
                      )}
                      {!stat.userFound && (
                        <Badge variant="destructive" className="text-xs">
                          Not Found
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td
                    className={`text-center p-3 font-medium ${
                      stat.stealsPlus > 0 ? "text-green-400" : stat.stealsPlus < 0 ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {stat.stealsPlus > 0 ? "+" : ""}
                    {stat.stealsPlus}
                  </td>
                  <td className="text-center p-3">{stat.goals}</td>
                  <td className="text-center p-3">{stat.assists}</td>
                  <td className="text-center p-3">{stat.shots}</td>
                  <td className="text-center p-3">{stat.pickups}</td>
                  <td className="text-center p-3">{stat.passes}</td>
                  <td className="text-center p-3">{stat.passReceived}</td>
                  <td className="text-center p-3">{formatSavePercent(stat.savePercent)}</td>
                  <td className="text-center p-3">{stat.saves}</td>
                  <td className="text-center p-3">{stat.allowed}</td>
                  <td className="text-center p-3">
                    {stat.goaltenderMinutes > 0 ? formatTime(stat.goaltenderMinutes) : "-"}
                  </td>
                  <td className="text-center p-3">{stat.skaterMinutes > 0 ? formatTime(stat.skaterMinutes) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Team Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card className="bg-blue-900/20 border-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-400 text-sm">Team 1</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {sortedStats.filter((s) => s.team === 1).reduce((sum, s) => sum + s.goals + s.assists, 0)}
              </div>
              <div className="text-xs text-gray-400">Goals + Assists</div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm">Team 2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {sortedStats.filter((s) => s.team === 2).reduce((sum, s) => sum + s.goals + s.assists, 0)}
              </div>
              <div className="text-xs text-gray-400">Goals + Assists</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
