"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Settings } from "lucide-react"

interface CreateScheduleTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateCreated: () => void
}

const games = [
  { value: "zealot_hockey", label: "Zealot Hockey", icon: "🏒" },
  { value: "call_of_duty", label: "Call of Duty", icon: "🎯" },
  { value: "rainbow_six_siege", label: "Rainbow Six Siege", icon: "🛡️" },
  { value: "counter_strike", label: "Counter Strike", icon: "💥" },
]

const frequencies = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
]

const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function CreateScheduleTemplateDialog({
  open,
  onOpenChange,
  onTemplateCreated,
}: CreateScheduleTemplateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    game: "",
    schedule_type: "recurring",
    frequency: "weekly",
    day_of_week: 6, // Saturday
    time_of_day: "19:00",
    max_teams: 8,
    players_per_team: 5,
    entry_fee: 25,
    prize_pool: 200,
    registration_duration_hours: 24,
    auction_duration_minutes: 120,
    min_participants: 4,
    auto_start: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // API call to create schedule template
      console.log("Creating schedule template:", formData)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onTemplateCreated()
      onOpenChange(false)

      // Reset form
      setFormData({
        name: "",
        game: "",
        schedule_type: "recurring",
        frequency: "weekly",
        day_of_week: 6,
        time_of_day: "19:00",
        max_teams: 8,
        players_per_team: 5,
        entry_fee: 25,
        prize_pool: 200,
        registration_duration_hours: 24,
        auction_duration_minutes: 120,
        min_participants: 4,
        auto_start: true,
      })
    } catch (error) {
      console.error("Error creating template:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Schedule Template
          </DialogTitle>
          <DialogDescription>Set up automatic auction scheduling for regular league matches</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Zealot Hockey"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select value={formData.game} onValueChange={(value) => setFormData({ ...formData, game: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.value} value={game.value}>
                        <div className="flex items-center gap-2">
                          <span>{game.icon}</span>
                          <span>{game.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency !== "daily" && (
                  <div className="space-y-2">
                    <Label htmlFor="day_of_week">Day of Week</Label>
                    <Select
                      value={formData.day_of_week.toString()}
                      onValueChange={(value) => setFormData({ ...formData, day_of_week: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_of_day">Time of Day</Label>
                <Input
                  id="time_of_day"
                  type="time"
                  value={formData.time_of_day}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auction Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Auction Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_teams">Max Teams</Label>
                  <Select
                    value={formData.max_teams.toString()}
                    onValueChange={(value) => setFormData({ ...formData, max_teams: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Teams</SelectItem>
                      <SelectItem value="6">6 Teams</SelectItem>
                      <SelectItem value="8">8 Teams</SelectItem>
                      <SelectItem value="10">10 Teams</SelectItem>
                      <SelectItem value="12">12 Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="players_per_team">Players per Team</Label>
                  <Select
                    value={formData.players_per_team.toString()}
                    onValueChange={(value) => setFormData({ ...formData, players_per_team: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Players</SelectItem>
                      <SelectItem value="4">4 Players</SelectItem>
                      <SelectItem value="5">5 Players</SelectItem>
                      <SelectItem value="6">6 Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_pool">Prize Pool ($)</Label>
                  <Input
                    id="prize_pool"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_duration">Registration Duration (hours)</Label>
                  <Input
                    id="registration_duration"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.registration_duration_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_duration_hours: Number.parseInt(e.target.value) || 24 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_participants">Min Participants</Label>
                  <Input
                    id="min_participants"
                    type="number"
                    min="2"
                    max={formData.max_teams}
                    value={formData.min_participants}
                    onChange={(e) =>
                      setFormData({ ...formData, min_participants: Number.parseInt(e.target.value) || 4 })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_start"
                  checked={formData.auto_start}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_start: checked })}
                />
                <Label htmlFor="auto_start">Auto-start when minimum participants reached</Label>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule Preview</CardTitle>
              <CardDescription>
                {formData.frequency} auctions • {formData.time_of_day}
                {formData.frequency !== "daily" &&
                  ` • ${daysOfWeek.find((d) => d.value === formData.day_of_week)?.label}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Teams</p>
                  <p className="font-medium">{formData.max_teams}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entry Fee</p>
                  <p className="font-medium">${formData.entry_fee}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prize Pool</p>
                  <p className="font-medium text-green-600">${formData.prize_pool}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.game} className="flex-1">
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
