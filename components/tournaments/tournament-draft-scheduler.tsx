"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Bell, Users, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { tournamentDraftSchedulerService, type DraftSchedule } from "@/lib/services/tournament-draft-scheduler-service"

interface TournamentDraftSchedulerProps {
  tournamentId: string
  onScheduled?: () => void
}

export function TournamentDraftScheduler({ tournamentId, onScheduled }: TournamentDraftSchedulerProps) {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<DraftSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [scheduleData, setScheduleData] = useState({
    draft_type: "snake" as "auction" | "snake" | "linear",
    scheduled_date: "",
    duration_minutes: 120,
    settings: {
      max_teams: 8,
      players_per_team: 5,
      auction_budget: 200,
      pick_time_limit: 120,
      auto_start: true,
      notification_settings: {
        notify_24h: true,
        notify_1h: true,
        notify_15m: true,
      },
    },
  })

  useEffect(() => {
    loadSchedules()
  }, [tournamentId])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const data = await tournamentDraftSchedulerService.getTournamentDraftSchedules(tournamentId)
      setSchedules(data)
    } catch (error) {
      console.error("Error loading schedules:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchedule = async () => {
    try {
      await tournamentDraftSchedulerService.createDraftSchedule(tournamentId, scheduleData)
      await loadSchedules()
      setShowCreateForm(false)
      onScheduled?.()

      // Reset form
      setScheduleData({
        ...scheduleData,
        scheduled_date: "",
      })
    } catch (error) {
      console.error("Error creating schedule:", error)
    }
  }

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      await tournamentDraftSchedulerService.cancelDraftSchedule(scheduleId)
      await loadSchedules()
    } catch (error) {
      console.error("Error cancelling schedule:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500"
      case "in_progress":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const difference = date.getTime() - now.getTime()

    const formattedDate = date.toLocaleString()

    if (difference > 0) {
      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

      if (hours < 24) {
        return `${formattedDate} (in ${hours}h ${minutes}m)`
      } else {
        const days = Math.floor(hours / 24)
        return `${formattedDate} (in ${days}d ${hours % 24}h)`
      }
    }

    return formattedDate
  }

  if (loading) {
    return <div className="text-center py-8">Loading draft schedules...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Draft Scheduling</h3>
          <p className="text-sm text-muted-foreground">Schedule and manage tournament draft sessions</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Draft
        </Button>
      </div>

      {/* Create Schedule Form */}
      {showCreateForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule New Draft
            </CardTitle>
            <CardDescription>Set up a draft session for your tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Draft Type</Label>
                    <Select
                      value={scheduleData.draft_type}
                      onValueChange={(value: "auction" | "snake" | "linear") =>
                        setScheduleData({ ...scheduleData, draft_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="snake">Snake Draft</SelectItem>
                        <SelectItem value="linear">Linear Draft</SelectItem>
                        <SelectItem value="auction">Auction Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={scheduleData.duration_minutes.toString()}
                      onValueChange={(value) =>
                        setScheduleData({ ...scheduleData, duration_minutes: Number.parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Draft Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleData.scheduled_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Teams</Label>
                    <Input
                      type="number"
                      min="2"
                      max="16"
                      value={scheduleData.settings.max_teams}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: { ...scheduleData.settings, max_teams: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Players per Team</Label>
                    <Input
                      type="number"
                      min="3"
                      max="10"
                      value={scheduleData.settings.players_per_team}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: { ...scheduleData.settings, players_per_team: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                </div>

                {scheduleData.draft_type === "auction" && (
                  <div className="space-y-2">
                    <Label>Auction Budget per Team</Label>
                    <Input
                      type="number"
                      min="100"
                      max="1000"
                      value={scheduleData.settings.auction_budget}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: { ...scheduleData.settings, auction_budget: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Pick Time Limit (seconds)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="300"
                    value={scheduleData.settings.pick_time_limit}
                    onChange={(e) =>
                      setScheduleData({
                        ...scheduleData,
                        settings: { ...scheduleData.settings, pick_time_limit: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={scheduleData.settings.auto_start}
                    onCheckedChange={(checked) =>
                      setScheduleData({
                        ...scheduleData,
                        settings: { ...scheduleData.settings, auto_start: checked },
                      })
                    }
                  />
                  <Label>Auto-start draft at scheduled time</Label>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scheduleData.settings.notification_settings.notify_24h}
                      onCheckedChange={(checked) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: {
                            ...scheduleData.settings,
                            notification_settings: {
                              ...scheduleData.settings.notification_settings,
                              notify_24h: checked,
                            },
                          },
                        })
                      }
                    />
                    <Label>Send reminder 24 hours before draft</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scheduleData.settings.notification_settings.notify_1h}
                      onCheckedChange={(checked) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: {
                            ...scheduleData.settings,
                            notification_settings: {
                              ...scheduleData.settings.notification_settings,
                              notify_1h: checked,
                            },
                          },
                        })
                      }
                    />
                    <Label>Send reminder 1 hour before draft</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scheduleData.settings.notification_settings.notify_15m}
                      onCheckedChange={(checked) =>
                        setScheduleData({
                          ...scheduleData,
                          settings: {
                            ...scheduleData.settings,
                            notification_settings: {
                              ...scheduleData.settings.notification_settings,
                              notify_15m: checked,
                            },
                          },
                        })
                      }
                    />
                    <Label>Send reminder 15 minutes before draft</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule} disabled={!scheduleData.scheduled_date}>
                Schedule Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Schedules */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No draft schedules yet</p>
              <p className="text-sm text-muted-foreground">Create your first draft schedule to get started</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {schedule.draft_type === "auction" ? "🔨" : schedule.draft_type === "snake" ? "🐍" : "📋"}
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize">{schedule.draft_type} Draft</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateTime(schedule.scheduled_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{schedule.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{schedule.settings.max_teams} teams</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(schedule.status)}>
                      {schedule.status.replace("_", " ").toUpperCase()}
                    </Badge>

                    {schedule.settings.auto_start && (
                      <Badge variant="outline" className="text-xs">
                        <Bell className="h-3 w-3 mr-1" />
                        Auto-start
                      </Badge>
                    )}

                    {schedule.status === "scheduled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Teams</p>
                      <p className="font-medium">{schedule.settings.max_teams}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Players/Team</p>
                      <p className="font-medium">{schedule.settings.players_per_team}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pick Timer</p>
                      <p className="font-medium">{schedule.settings.pick_time_limit}s</p>
                    </div>
                    {schedule.draft_type === "auction" && (
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-medium">${schedule.settings.auction_budget}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
