"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Calendar, Users } from "lucide-react"
import Link from "next/link"

export default function CreateSeason() {
  const [seasonData, setSeasonData] = useState({
    name: "",
    description: "",
    game: "",
    format: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    maxTeams: 16,
    entryFee: 0,
    prizePool: 0,
    playoffTeams: 8,
    regularSeasonWeeks: 12,
    playoffWeeks: 4,
    gamesPerWeek: 3,
    autoSchedule: true,
    allowTrades: true,
    draftDate: "",
    draftTime: "",
  })

  const games = ["Counter Strike", "Rainbow Six Siege", "Call of Duty", "Zealot Hockey"]
  const formats = ["Round Robin", "Swiss System", "Single Elimination", "Double Elimination", "League Play"]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Creating season:", seasonData)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/seasons">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seasons
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Season</h1>
          <p className="text-muted-foreground">Set up a new competitive season</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Season details and game selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Season Name</Label>
                <Input
                  id="name"
                  value={seasonData.name}
                  onChange={(e) => setSeasonData({ ...seasonData, name: e.target.value })}
                  placeholder="Enter season name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select
                  value={seasonData.game}
                  onValueChange={(value) => setSeasonData({ ...seasonData, game: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game} value={game}>
                        {game}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Season Format</Label>
                <Select
                  value={seasonData.format}
                  onValueChange={(value) => setSeasonData({ ...seasonData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={seasonData.description}
                  onChange={(e) => setSeasonData({ ...seasonData, description: e.target.value })}
                  placeholder="Season description and rules..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Dates</CardTitle>
              <CardDescription>Set important dates and schedule structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Season Start</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startDate"
                      type="date"
                      value={seasonData.startDate}
                      onChange={(e) => setSeasonData({ ...seasonData, startDate: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Season End</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="endDate"
                      type="date"
                      value={seasonData.endDate}
                      onChange={(e) => setSeasonData({ ...seasonData, endDate: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="registrationDeadline"
                    type="date"
                    value={seasonData.registrationDeadline}
                    onChange={(e) => setSeasonData({ ...seasonData, registrationDeadline: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="draftDate">Draft Date</Label>
                  <Input
                    id="draftDate"
                    type="date"
                    value={seasonData.draftDate}
                    onChange={(e) => setSeasonData({ ...seasonData, draftDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="draftTime">Draft Time</Label>
                  <Input
                    id="draftTime"
                    type="time"
                    value={seasonData.draftTime}
                    onChange={(e) => setSeasonData({ ...seasonData, draftTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regularSeasonWeeks">Regular Season Weeks</Label>
                  <Input
                    id="regularSeasonWeeks"
                    type="number"
                    value={seasonData.regularSeasonWeeks}
                    onChange={(e) =>
                      setSeasonData({ ...seasonData, regularSeasonWeeks: Number.parseInt(e.target.value) })
                    }
                    min="1"
                    max="52"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playoffWeeks">Playoff Weeks</Label>
                  <Input
                    id="playoffWeeks"
                    type="number"
                    value={seasonData.playoffWeeks}
                    onChange={(e) => setSeasonData({ ...seasonData, playoffWeeks: Number.parseInt(e.target.value) })}
                    min="1"
                    max="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gamesPerWeek">Games/Week</Label>
                  <Input
                    id="gamesPerWeek"
                    type="number"
                    value={seasonData.gamesPerWeek}
                    onChange={(e) => setSeasonData({ ...seasonData, gamesPerWeek: Number.parseInt(e.target.value) })}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team & Financial Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Team & Financial Settings</CardTitle>
              <CardDescription>Configure team limits and prize structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Maximum Teams</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="maxTeams"
                      type="number"
                      value={seasonData.maxTeams}
                      onChange={(e) => setSeasonData({ ...seasonData, maxTeams: Number.parseInt(e.target.value) })}
                      className="pl-10"
                      min="4"
                      max="64"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playoffTeams">Playoff Teams</Label>
                  <Input
                    id="playoffTeams"
                    type="number"
                    value={seasonData.playoffTeams}
                    onChange={(e) => setSeasonData({ ...seasonData, playoffTeams: Number.parseInt(e.target.value) })}
                    min="2"
                    max={seasonData.maxTeams}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee ($)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    value={seasonData.entryFee}
                    onChange={(e) => setSeasonData({ ...seasonData, entryFee: Number.parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <Input
                    id="prizePool"
                    type="number"
                    value={seasonData.prizePool}
                    onChange={(e) => setSeasonData({ ...seasonData, prizePool: Number.parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoSchedule"
                    checked={seasonData.autoSchedule}
                    onCheckedChange={(checked) => setSeasonData({ ...seasonData, autoSchedule: checked as boolean })}
                  />
                  <Label htmlFor="autoSchedule">Auto-generate schedule</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowTrades"
                    checked={seasonData.allowTrades}
                    onCheckedChange={(checked) => setSeasonData({ ...seasonData, allowTrades: checked as boolean })}
                  />
                  <Label htmlFor="allowTrades">Allow player trades</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Season Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Season Preview</CardTitle>
              <CardDescription>Summary of season configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="text-sm">
                  <strong>Duration:</strong> {seasonData.regularSeasonWeeks + seasonData.playoffWeeks} weeks total
                </div>
                <div className="text-sm">
                  <strong>Total Games:</strong>{" "}
                  {seasonData.regularSeasonWeeks * seasonData.gamesPerWeek + seasonData.playoffWeeks * 4} estimated
                </div>
                <div className="text-sm">
                  <strong>Teams:</strong> {seasonData.maxTeams} max, {seasonData.playoffTeams} make playoffs
                </div>
                <div className="text-sm">
                  <strong>Revenue:</strong> ${(seasonData.entryFee * seasonData.maxTeams).toFixed(2)} potential
                </div>
                <div className="text-sm">
                  <strong>Format:</strong> {seasonData.format || "Not selected"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/seasons">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Create Season
          </Button>
        </div>
      </form>
    </div>
  )
}
