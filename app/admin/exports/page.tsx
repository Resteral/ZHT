"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, Users, Trophy, Calendar, Target, Database, RefreshCw } from "lucide-react"
import Link from "next/link"
import { importExportService, type ExportOptions } from "@/lib/services/import-export-service"

export default function DataExportsPage() {
  const [exportHistory, setExportHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [stats, setStats] = useState({
    recentExports: 0,
    totalRecords: 0,
    estimatedSize: 0,
  })

  useEffect(() => {
    loadExportHistory()
  }, [])

  const loadExportHistory = async () => {
    try {
      const history = await importExportService.getExportHistory()
      setExportHistory(history)

      // Calculate stats
      const recent = history.filter((h) => {
        const date = new Date(h.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return date > weekAgo
      }).length

      const total = history.reduce((sum, h) => sum + (h.records_exported || 0), 0)

      setStats({
        recentExports: recent,
        totalRecords: total,
        estimatedSize: 2.4, // Mock estimated size
      })
    } catch (error) {
      console.error("Failed to load export history:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type: string, options: ExportOptions) => {
    setExporting(type)
    try {
      let data: string
      let filename: string

      switch (type) {
        case "players":
          data = await importExportService.exportPlayers(options)
          filename = `players_export_${new Date().toISOString().split("T")[0]}.${options.format}`
          break
        case "tournaments":
          data = await importExportService.exportTournaments(options)
          filename = `tournaments_export_${new Date().toISOString().split("T")[0]}.${options.format}`
          break
        case "games":
          data = await importExportService.exportGames(options)
          filename = `games_export_${new Date().toISOString().split("T")[0]}.${options.format}`
          break
        case "betting":
          data = await importExportService.exportBettingData(options)
          filename = `betting_export_${new Date().toISOString().split("T")[0]}.${options.format}`
          break
        default:
          throw new Error("Unknown export type")
      }

      // Create and download file
      const blob = new Blob([data], {
        type: options.format === "json" ? "application/json" : "text/csv",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      await loadExportHistory() // Refresh history
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Export</h1>
          <p className="text-muted-foreground">Export platform data and generate reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadExportHistory} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      {/* Export Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentExports}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available for export</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Size</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.estimatedSize} MB</div>
            <p className="text-xs text-muted-foreground">Estimated export size</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Tabs */}
      <Tabs defaultValue="players" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Players
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="betting" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Betting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Player Data Export</CardTitle>
              <CardDescription>Export player profiles, statistics, and performance data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Export Format</label>
                  <select id="players-format" className="w-full p-2 border rounded-md">
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex gap-2">
                    <input type="date" id="players-start" className="flex-1 p-2 border rounded-md" />
                    <input type="date" id="players-end" className="flex-1 p-2 border rounded-md" />
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const format = (document.getElementById("players-format") as HTMLSelectElement).value as
                    | "csv"
                    | "json"
                    | "excel"
                  const startDate = (document.getElementById("players-start") as HTMLInputElement).value
                  const endDate = (document.getElementById("players-end") as HTMLInputElement).value

                  const options: ExportOptions = {
                    format,
                    ...(startDate && endDate && { dateRange: { start: startDate, end: endDate } }),
                  }

                  handleExport("players", options)
                }}
                disabled={exporting === "players"}
              >
                {exporting === "players" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Players
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Data Export</CardTitle>
              <CardDescription>Export tournament results, brackets, and participant data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tournament Status</label>
                  <select id="tournaments-status" className="w-full p-2 border rounded-md">
                    <option value="">All Tournaments</option>
                    <option value="upcoming">Upcoming Only</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Game Type</label>
                  <select id="tournaments-game" className="w-full p-2 border rounded-md">
                    <option value="">All Games</option>
                    <option value="Counter Strike">Counter Strike</option>
                    <option value="Rainbow Six Siege">Rainbow Six Siege</option>
                    <option value="Call of Duty">Call of Duty</option>
                    <option value="Zealot Hockey">Zealot Hockey</option>
                  </select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const status = (document.getElementById("tournaments-status") as HTMLSelectElement).value
                  const game = (document.getElementById("tournaments-game") as HTMLSelectElement).value

                  const options: ExportOptions = {
                    format: "csv",
                    filters: {
                      ...(status && { status }),
                      ...(game && { game }),
                    },
                  }

                  handleExport("tournaments", options)
                }}
                disabled={exporting === "tournaments"}
              >
                {exporting === "tournaments" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Tournaments
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games">
          <Card>
            <CardHeader>
              <CardTitle>Game Results Export</CardTitle>
              <CardDescription>Export match results, scores, and game statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Season</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Current Season</option>
                    <option>2024 Season 1</option>
                    <option>2023 Season 2</option>
                    <option>All Seasons</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Include Statistics</label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="player-stats" className="rounded" />
                    <label htmlFor="player-stats" className="text-sm">
                      Player Statistics
                    </label>
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleExport("games", { format: "csv" })}
                disabled={exporting === "games"}
              >
                {exporting === "games" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Games
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="betting">
          <Card>
            <CardHeader>
              <CardTitle>Betting Data Export</CardTitle>
              <CardDescription>Export betting markets, odds, and transaction data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Type</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>All Betting Data</option>
                    <option>Markets Only</option>
                    <option>Transactions Only</option>
                    <option>Payouts Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Market Status</label>
                  <select id="betting-status" className="w-full p-2 border rounded-md">
                    <option value="">All Markets</option>
                    <option value="active">Active Markets</option>
                    <option value="settled">Settled Markets</option>
                  </select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const status = (document.getElementById("betting-status") as HTMLSelectElement).value
                  const options: ExportOptions = {
                    format: "csv",
                    filters: { ...(status && { status }) },
                  }
                  handleExport("betting", options)
                }}
                disabled={exporting === "betting"}
              >
                {exporting === "betting" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Betting
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Export History</CardTitle>
          <CardDescription>Track your recent data exports and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading export history...</p>
              </div>
            ) : exportHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No export history found</p>
                <p className="text-sm">Start by exporting your first data set above</p>
              </div>
            ) : (
              exportHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {record.type}_export_{record.format}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.type} • {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{record.status}</Badge>
                    <span className="text-sm text-muted-foreground">{record.records_exported || 0} records</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
