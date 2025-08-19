import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Trophy, Plus, Bell } from "lucide-react"
import { UpcomingGames } from "./upcoming-games"
import { SeasonCalendar } from "./season-calendar"
import { CreateGameDialog } from "./create-game-dialog"

export function ScheduleDashboard() {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leagues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">3 playoffs active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Game</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 15m</div>
            <p className="text-xs text-muted-foreground">Championship final</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">Games this season</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Games</CardTitle>
                <CardDescription>Next scheduled matches and events</CardDescription>
              </div>
              <CreateGameDialog>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Game
                </Button>
              </CreateGameDialog>
            </CardHeader>
            <CardContent>
              <UpcomingGames />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Season Calendar</CardTitle>
              <CardDescription>View and manage league schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <SeasonCalendar />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>League updates and news</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Create
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Playoff Schedule Released</h4>
                  <Badge variant="secondary">New</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Championship brackets are now available. Check your team's playoff position.
                </p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Trade Deadline Reminder</h4>
                  <Badge variant="outline">Important</Badge>
                </div>
                <p className="text-xs text-muted-foreground">All trades must be completed by Friday 11:59 PM EST.</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Weekly Matchup Preview</h4>
                <p className="text-xs text-muted-foreground">
                  Top matchups to watch this week including key player analysis.
                </p>
                <p className="text-xs text-muted-foreground">3 days ago</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Events</CardTitle>
              <CardDescription>Upcoming milestones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Draft Day</p>
                  <p className="text-xs text-muted-foreground">March 15, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Trade Deadline</p>
                  <p className="text-xs text-muted-foreground">April 20, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Playoffs Begin</p>
                  <p className="text-xs text-muted-foreground">May 1, 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
