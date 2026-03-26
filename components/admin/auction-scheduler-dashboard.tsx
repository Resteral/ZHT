"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Settings, Play, Pause, Plus, BarChart3, Users, Trophy, Zap } from "lucide-react"
import { CreateScheduleTemplateDialog } from "./create-schedule-template-dialog"

interface ScheduleTemplate {
  id: string
  name: string
  game: string
  schedule_type: string
  frequency: string
  day_of_week: number
  time_of_day: string
  max_teams: number
  players_per_team: number
  entry_fee: number
  prize_pool: number
  is_active: boolean
  next_scheduled: string
}

interface ScheduledAuction {
  id: string
  template_name: string
  game: string
  scheduled_start_time: string
  registration_opens_at: string
  status: string
  participant_count: number
  max_teams: number
}

const gameIcons = {
  zealot_hockey: "🏒",
  call_of_duty: "🎯",
  rainbow_six_siege: "🛡️",
  counter_strike: "💥",
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function AuctionSchedulerDashboard() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [scheduledAuctions, setScheduledAuctions] = useState<ScheduledAuction[]>([])
  const [schedulerEnabled, setSchedulerEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Mock data - would fetch from API
      setTemplates([
        {
          id: "1",
          name: "Daily Zealot Hockey",
          game: "zealot_hockey",
          schedule_type: "recurring",
          frequency: "daily",
          day_of_week: 0,
          time_of_day: "19:00",
          max_teams: 8,
          players_per_team: 5,
          entry_fee: 25,
          prize_pool: 200,
          is_active: true,
          next_scheduled: "2024-03-25T19:00:00Z",
        },
        {
          id: "2",
          name: "Weekend Call of Duty",
          game: "call_of_duty",
          schedule_type: "recurring",
          frequency: "weekly",
          day_of_week: 6,
          time_of_day: "20:00",
          max_teams: 6,
          players_per_team: 6,
          entry_fee: 50,
          prize_pool: 300,
          is_active: true,
          next_scheduled: "2024-03-30T20:00:00Z",
        },
      ])

      setScheduledAuctions([
        {
          id: "1",
          template_name: "Daily Zealot Hockey",
          game: "zealot_hockey",
          scheduled_start_time: "2024-03-25T19:00:00Z",
          registration_opens_at: "2024-03-24T19:00:00Z",
          status: "registration_open",
          participant_count: 6,
          max_teams: 8,
        },
        {
          id: "2",
          template_name: "Weekend Call of Duty",
          game: "call_of_duty",
          scheduled_start_time: "2024-03-30T20:00:00Z",
          registration_opens_at: "2024-03-29T20:00:00Z",
          status: "scheduled",
          participant_count: 0,
          max_teams: 6,
        },
      ])
    } catch (error) {
      console.error("Error loading scheduler data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTemplate = async (templateId: string, active: boolean) => {
    try {
      // API call to toggle template
      setTemplates(templates.map((t) => (t.id === templateId ? { ...t, is_active: active } : t)))
    } catch (error) {
      console.error("Error toggling template:", error)
    }
  }

  const toggleScheduler = async (enabled: boolean) => {
    try {
      // API call to toggle scheduler
      setSchedulerEnabled(enabled)
    } catch (error) {
      console.error("Error toggling scheduler:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration_open":
        return "bg-blue-500"
      case "auction_ready":
        return "bg-yellow-500"
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

  if (loading) {
    return <div className="text-center py-8">Loading scheduler...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auction Scheduler</h2>
          <p className="text-muted-foreground">Automatically create and manage auction leagues</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Scheduler</span>
            <Switch checked={schedulerEnabled} onCheckedChange={toggleScheduler} />
            {schedulerEnabled ? (
              <Badge className="bg-green-500">
                <Play className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Pause className="h-3 w-3 mr-1" />
                Paused
              </Badge>
            )}
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter((t) => t.is_active).length}</div>
            <p className="text-xs text-muted-foreground">{templates.length} total templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Auctions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledAuctions.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduledAuctions.reduce((sum, a) => sum + a.participant_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all auctions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${templates.reduce((sum, t) => sum + t.prize_pool, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total scheduled</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Schedule Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Auctions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">{gameIcons[template.game as keyof typeof gameIcons]}</span>
                        {template.name}
                      </CardTitle>
                      <CardDescription>
                        {template.frequency} • {template.time_of_day}
                        {template.frequency === "weekly" && ` • ${dayNames[template.day_of_week]}`}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => toggleTemplate(template.id, checked)}
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Teams</p>
                      <p className="font-medium">{template.max_teams}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Players/Team</p>
                      <p className="font-medium">{template.players_per_team}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Fee</p>
                      <p className="font-medium">${template.entry_fee}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prize Pool</p>
                      <p className="font-medium text-green-600">${template.prize_pool}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Next Scheduled</p>
                    <p className="font-medium">{new Date(template.next_scheduled).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Zap className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="space-y-4">
            {scheduledAuctions.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{gameIcons[auction.game as keyof typeof gameIcons]}</div>
                      <div>
                        <h3 className="font-semibold">{auction.template_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Starts: {new Date(auction.scheduled_start_time).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Registration: {new Date(auction.registration_opens_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{auction.participant_count}</div>
                        <div className="text-xs text-muted-foreground">/ {auction.max_teams} teams</div>
                      </div>
                      <Badge className={getStatusColor(auction.status)}>
                        {auction.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Participation Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(gameIcons).map(([game, icon]) => (
                    <div key={game} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span className="capitalize">{game.replace("_", " ")}</span>
                      </div>
                      <Badge variant="outline">{templates.filter((t) => t.game === game).length} templates</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateScheduleTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTemplateCreated={loadData}
      />
    </div>
  )
}
