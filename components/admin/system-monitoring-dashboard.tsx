"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Database, Server, Users, Zap, RefreshCw } from "lucide-react"

interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  database_connections: number
  api_response_time: number
  uptime_percentage: number
  active_users: number
  error_rate: number
}

interface SystemAlert {
  id: string
  type: "error" | "warning" | "info" | "critical"
  title: string
  message: string
  created_at: string
  status: "active" | "acknowledged" | "resolved"
  severity: number
}

export function SystemMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadSystemData()
    const interval = setInterval(loadSystemData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadSystemData = async () => {
    try {
      // Mock data - would fetch from monitoring API
      setMetrics({
        cpu_usage: 67,
        memory_usage: 82,
        disk_usage: 45,
        database_connections: 23,
        api_response_time: 145,
        uptime_percentage: 99.8,
        active_users: 1247,
        error_rate: 0.02,
      })

      setAlerts([
        {
          id: "1",
          type: "warning",
          title: "High Memory Usage",
          message: "Memory usage is above 80% threshold",
          created_at: "2024-01-15T10:30:00Z",
          status: "active",
          severity: 3,
        },
        {
          id: "2",
          type: "info",
          title: "Database Backup Completed",
          message: "Scheduled database backup completed successfully",
          created_at: "2024-01-15T09:00:00Z",
          status: "resolved",
          severity: 1,
        },
        {
          id: "3",
          type: "error",
          title: "Payment Gateway Error",
          message: "3 payment failures detected in the last hour",
          created_at: "2024-01-15T11:15:00Z",
          status: "active",
          severity: 4,
        },
      ])

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error loading system data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAlertColor = (type: string, severity: number) => {
    if (type === "critical" || severity >= 4) return "bg-red-500"
    if (type === "error" || severity >= 3) return "bg-orange-500"
    if (type === "warning" || severity >= 2) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return { color: "text-red-500", status: "critical" }
    if (value >= thresholds.warning) return { color: "text-orange-500", status: "warning" }
    return { color: "text-green-500", status: "healthy" }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading system metrics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">Real-time platform health and performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Last updated: {lastUpdate.toLocaleTimeString()}</div>
          <Button variant="outline" size="sm" onClick={loadSystemData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics?.cpu_usage}%</div>
            <Progress value={metrics?.cpu_usage} className="h-2" />
            <p
              className={`text-xs mt-2 ${getMetricStatus(metrics?.cpu_usage || 0, { warning: 70, critical: 90 }).color}`}
            >
              {getMetricStatus(metrics?.cpu_usage || 0, { warning: 70, critical: 90 }).status.toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics?.memory_usage}%</div>
            <Progress value={metrics?.memory_usage} className="h-2" />
            <p
              className={`text-xs mt-2 ${getMetricStatus(metrics?.memory_usage || 0, { warning: 80, critical: 95 }).color}`}
            >
              {getMetricStatus(metrics?.memory_usage || 0, { warning: 80, critical: 95 }).status.toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics?.api_response_time}ms</div>
            <p
              className={`text-xs ${getMetricStatus(metrics?.api_response_time || 0, { warning: 200, critical: 500 }).color}`}
            >
              {getMetricStatus(metrics?.api_response_time || 0, { warning: 200, critical: 500 }).status.toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics?.active_users?.toLocaleString()}</div>
            <p className="text-xs text-green-500">ONLINE</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                System Alerts
                <Badge variant="outline">{alerts.filter((a) => a.status === "active").length} active</Badge>
              </CardTitle>
              <CardDescription>Current system alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No active alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getAlertColor(alert.type, alert.severity)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                            {alert.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      {alert.status === "active" && (
                        <Button variant="outline" size="sm">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Connections</span>
                  <span className="font-medium">{metrics?.database_connections}/100</span>
                </div>
                <Progress value={(metrics?.database_connections || 0) * 4} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Uptime</span>
                  <span className="font-medium">{metrics?.uptime_percentage}%</span>
                </div>
                <Progress value={metrics?.uptime_percentage} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <span className="font-medium">{metrics?.error_rate}%</span>
                </div>
                <Progress value={(metrics?.error_rate || 0) * 50} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Disk Usage</span>
                  <span className="font-medium">{metrics?.disk_usage}%</span>
                </div>
                <Progress value={metrics?.disk_usage} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
              <CardDescription>Latest system events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex gap-4 p-2 bg-muted rounded">
                  <span className="text-muted-foreground">2024-01-15 11:30:15</span>
                  <span className="text-green-600">[INFO]</span>
                  <span>User authentication successful for user_id: 12345</span>
                </div>
                <div className="flex gap-4 p-2 bg-muted rounded">
                  <span className="text-muted-foreground">2024-01-15 11:29:42</span>
                  <span className="text-blue-600">[DEBUG]</span>
                  <span>Tournament bracket generated for tournament_id: 67890</span>
                </div>
                <div className="flex gap-4 p-2 bg-muted rounded">
                  <span className="text-muted-foreground">2024-01-15 11:28:33</span>
                  <span className="text-orange-600">[WARN]</span>
                  <span>High memory usage detected: 82% of available memory</span>
                </div>
                <div className="flex gap-4 p-2 bg-muted rounded">
                  <span className="text-muted-foreground">2024-01-15 11:27:18</span>
                  <span className="text-red-600">[ERROR]</span>
                  <span>Payment processing failed for transaction_id: 98765</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
