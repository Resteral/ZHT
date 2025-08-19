import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Trophy,
  Calendar,
  Target,
  TrendingUp,
  Database,
  Shield,
  AlertTriangle,
  DollarSign,
  Activity,
  Settings,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive platform management and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            Super Admin
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-green-500 text-green-500">
            System Healthy
          </Badge>
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">12 ending this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$127K</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,456</div>
            <p className="text-xs text-muted-foreground">$89K volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">CPU usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          {/* Management Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>Manage users, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Active: <span className="font-medium">2,689</span>
                  </div>
                  <div>
                    Suspended: <span className="font-medium text-red-500">23</span>
                  </div>
                  <div>
                    Admins: <span className="font-medium">8</span>
                  </div>
                  <div>
                    New Today: <span className="font-medium text-green-500">47</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/users">
                    <Button className="w-full bg-transparent" variant="outline">
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/admin/users/create">
                    <Button className="w-full" size="sm">
                      Add User
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament Management
                </CardTitle>
                <CardDescription>Create and manage tournaments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Active: <span className="font-medium">34</span>
                  </div>
                  <div>
                    Registration: <span className="font-medium text-blue-500">12</span>
                  </div>
                  <div>
                    Completed: <span className="font-medium">156</span>
                  </div>
                  <div>
                    Prize Pool: <span className="font-medium text-green-500">$89K</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/tournaments">
                    <Button className="w-full bg-transparent" variant="outline">
                      Manage Tournaments
                    </Button>
                  </Link>
                  <Link href="/admin/tournaments/create">
                    <Button className="w-full" size="sm">
                      Create Tournament
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Betting Management
                </CardTitle>
                <CardDescription>Manage betting markets and payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Active Markets: <span className="font-medium">127</span>
                  </div>
                  <div>
                    Total Volume: <span className="font-medium text-green-500">$89K</span>
                  </div>
                  <div>
                    Pending Payouts: <span className="font-medium text-orange-500">$12K</span>
                  </div>
                  <div>
                    Disputes: <span className="font-medium text-red-500">3</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/betting">
                    <Button className="w-full bg-transparent" variant="outline">
                      Manage Markets
                    </Button>
                  </Link>
                  <Link href="/admin/betting/create">
                    <Button className="w-full" size="sm">
                      Create Market
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Game Management
                </CardTitle>
                <CardDescription>Schedule and manage matches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Scheduled: <span className="font-medium">89</span>
                  </div>
                  <div>
                    Live: <span className="font-medium text-green-500">12</span>
                  </div>
                  <div>
                    Completed: <span className="font-medium">234</span>
                  </div>
                  <div>
                    Cancelled: <span className="font-medium text-red-500">5</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/games">
                    <Button className="w-full bg-transparent" variant="outline">
                      Manage Games
                    </Button>
                  </Link>
                  <Link href="/admin/games/create">
                    <Button className="w-full" size="sm">
                      Schedule Game
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Moderation
                </CardTitle>
                <CardDescription>Content moderation and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Reports: <span className="font-medium text-orange-500">15</span>
                  </div>
                  <div>
                    Resolved: <span className="font-medium">234</span>
                  </div>
                  <div>
                    Banned Users: <span className="font-medium text-red-500">12</span>
                  </div>
                  <div>
                    Appeals: <span className="font-medium">3</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/moderation">
                    <Button className="w-full bg-transparent" variant="outline">
                      View Reports
                    </Button>
                  </Link>
                  <Link href="/admin/moderation/banned">
                    <Button className="w-full" size="sm">
                      Banned Users
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Management
                </CardTitle>
                <CardDescription>Payments, payouts, and transactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Revenue: <span className="font-medium text-green-500">$127K</span>
                  </div>
                  <div>
                    Pending: <span className="font-medium text-orange-500">$23K</span>
                  </div>
                  <div>
                    Disputes: <span className="font-medium text-red-500">$2.1K</span>
                  </div>
                  <div>
                    Fees: <span className="font-medium">$8.9K</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/financial">
                    <Button className="w-full bg-transparent" variant="outline">
                      View Transactions
                    </Button>
                  </Link>
                  <Link href="/admin/financial/payouts">
                    <Button className="w-full" size="sm">
                      Process Payouts
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Import, export, and backup data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    DB Size: <span className="font-medium">2.4GB</span>
                  </div>
                  <div>
                    Last Backup: <span className="font-medium text-green-500">2h ago</span>
                  </div>
                  <div>
                    Imports: <span className="font-medium">23</span>
                  </div>
                  <div>
                    Exports: <span className="font-medium">45</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/imports">
                    <Button className="w-full bg-transparent" variant="outline">
                      Import Data
                    </Button>
                  </Link>
                  <Link href="/admin/exports">
                    <Button className="w-full" size="sm">
                      Export Data
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Season Management
                </CardTitle>
                <CardDescription>Manage seasons and leagues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Active: <span className="font-medium">4</span>
                  </div>
                  <div>
                    Upcoming: <span className="font-medium text-blue-500">2</span>
                  </div>
                  <div>
                    Completed: <span className="font-medium">12</span>
                  </div>
                  <div>
                    Teams: <span className="font-medium">156</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/admin/seasons">
                    <Button className="w-full bg-transparent" variant="outline">
                      Manage Seasons
                    </Button>
                  </Link>
                  <Link href="/admin/seasons/create">
                    <Button className="w-full" size="sm">
                      Create Season
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* System Monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CPU Usage</span>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      67%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory Usage</span>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      82%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Database</span>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Response</span>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      145ms
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="p-2 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                    <p className="text-sm font-medium">High Memory Usage</p>
                    <p className="text-xs text-muted-foreground">Memory usage above 80%</p>
                  </div>
                  <div className="p-2 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-sm font-medium">Slow Query Detected</p>
                    <p className="text-xs text-muted-foreground">Tournament query taking 2.3s</p>
                  </div>
                  <div className="p-2 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20">
                    <p className="text-sm font-medium">Failed Payment</p>
                    <p className="text-xs text-muted-foreground">3 payment failures in last hour</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  User Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Online Users</span>
                    <span className="font-medium text-green-500">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Sessions</span>
                    <span className="font-medium">2,156</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Signups (24h)</span>
                    <span className="font-medium text-blue-500">47</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Concurrent</span>
                    <span className="font-medium">1,892</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>Latest system events and admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: "2 minutes ago", action: "Tournament created", user: "admin@platform.com", type: "info" },
                  {
                    time: "5 minutes ago",
                    action: "User banned for violation",
                    user: "moderator@platform.com",
                    type: "warning",
                  },
                  { time: "12 minutes ago", action: "Payout processed", user: "system", type: "success" },
                  { time: "18 minutes ago", action: "Database backup completed", user: "system", type: "info" },
                  { time: "25 minutes ago", action: "High memory usage alert", user: "system", type: "error" },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "success"
                            ? "bg-green-500"
                            : activity.type === "warning"
                              ? "bg-orange-500"
                              : activity.type === "error"
                                ? "bg-red-500"
                                : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">by {activity.user}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Revenue charts and trends</p>
                  <p className="text-sm">Coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>User acquisition metrics</p>
                  <p className="text-sm">Coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tournament Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tournament engagement data</p>
                  <p className="text-sm">Coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* System Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Platform Settings
                </CardTitle>
                <CardDescription>Configure global platform settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Maintenance Mode</label>
                      <p className="text-xs text-muted-foreground">Enable to restrict platform access</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">New User Registration</label>
                      <p className="text-xs text-muted-foreground">Allow new users to register</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Tournament Creation</label>
                      <p className="text-xs text-muted-foreground">Allow users to create tournaments</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Betting System</label>
                      <p className="text-xs text-muted-foreground">Enable betting features</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
                <Button className="w-full">Save Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Advanced system configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default ELO Rating</label>
                    <input type="number" value="1200" className="w-full p-2 border rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tournament Entry Fee Limit</label>
                    <input type="number" value="1000" className="w-full p-2 border rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Concurrent Tournaments</label>
                    <input type="number" value="50" className="w-full p-2 border rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <input type="number" value="60" className="w-full p-2 border rounded-md" />
                  </div>
                </div>
                <Button className="w-full">Update Configuration</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
