"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Users } from "lucide-react"

interface SeasonSchedulerProps {
  leagueId: string
  onScheduled?: () => void
}

export function SeasonScheduler({ leagueId, onScheduled }: SeasonSchedulerProps) {
  const [seasonData, setSeasonData] = useState({
    season_name: "2024 Season",
    start_date: "",
    end_date: "",
    playoff_start: "",
    championship_date: "",
    regular_season_weeks: 14,
    playoff_weeks: 3,
    games_per_week: 1,
  })

  const handleCreateSeason = async () => {
    try {
      // API call to create season schedule
      console.log("Creating season:", seasonData)
      onScheduled?.()
    } catch (error) {
      console.error("Error creating season:", error)
    }
  }

  const calculateEndDate = () => {
    if (seasonData.start_date) {
      const startDate = new Date(seasonData.start_date)
      const totalWeeks = seasonData.regular_season_weeks + seasonData.playoff_weeks
      const endDate = new Date(startDate.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000)
      return endDate.toISOString().split("T")[0]
    }
    return ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Season Scheduler
        </CardTitle>
        <CardDescription>Create a complete season schedule with regular season and playoffs</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="season-name">Season Name</Label>
          <Input
            id="season-name"
            value={seasonData.season_name}
            onChange={(e) => setSeasonData({ ...seasonData, season_name: e.target.value })}
            placeholder="2024 Championship Season"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Season Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={seasonData.start_date}
              onChange={(e) => setSeasonData({ ...seasonData, start_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Season End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={seasonData.end_date || calculateEndDate()}
              onChange={(e) => setSeasonData({ ...seasonData, end_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regular-weeks">Regular Season Weeks</Label>
            <Input
              id="regular-weeks"
              type="number"
              min="1"
              max="20"
              value={seasonData.regular_season_weeks}
              onChange={(e) => setSeasonData({ ...seasonData, regular_season_weeks: Number.parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playoff-weeks">Playoff Weeks</Label>
            <Input
              id="playoff-weeks"
              type="number"
              min="1"
              max="6"
              value={seasonData.playoff_weeks}
              onChange={(e) => setSeasonData({ ...seasonData, playoff_weeks: Number.parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="games-per-week">Games per Week</Label>
            <Input
              id="games-per-week"
              type="number"
              min="1"
              max="3"
              value={seasonData.games_per_week}
              onChange={(e) => setSeasonData({ ...seasonData, games_per_week: Number.parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="playoff-start">Playoff Start Date</Label>
            <Input
              id="playoff-start"
              type="date"
              value={seasonData.playoff_start}
              onChange={(e) => setSeasonData({ ...seasonData, playoff_start: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="championship-date">Championship Date</Label>
            <Input
              id="championship-date"
              type="date"
              value={seasonData.championship_date}
              onChange={(e) => setSeasonData({ ...seasonData, championship_date: e.target.value })}
            />
          </div>
        </div>

        {/* Season Preview */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Season Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Total Duration: {seasonData.regular_season_weeks + seasonData.playoff_weeks} weeks</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Games per Week: {seasonData.games_per_week}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">Regular Season: {seasonData.regular_season_weeks} weeks</Badge>
              <Badge variant="outline">Playoffs: {seasonData.playoff_weeks} weeks</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={handleCreateSeason} disabled={!seasonData.start_date || !seasonData.season_name}>
            Create Season Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
