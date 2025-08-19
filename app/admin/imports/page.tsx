"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Users, Trophy, Calendar, Target, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { FileUpload } from "@/components/admin/file-upload"
import { importExportService } from "@/lib/services/import-export-service"

export default function DataImportsPage() {
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    recentImports: 0,
    failedImports: 0,
    totalRecords: 0,
  })

  useEffect(() => {
    loadImportHistory()
  }, [])

  const loadImportHistory = async () => {
    try {
      const history = await importExportService.getImportHistory()
      setImportHistory(history)

      // Calculate stats
      const recent = history.filter((h) => {
        const date = new Date(h.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return date > weekAgo
      }).length

      const failed = history.filter((h) => h.status === "failed").length
      const total = history.reduce((sum, h) => sum + (h.records_imported || 0), 0)

      setStats({
        recentImports: recent,
        failedImports: failed,
        totalRecords: total,
      })
    } catch (error) {
      console.error("Failed to load import history:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerImport = async (file: File) => {
    const result = await importExportService.importPlayers(file)
    await loadImportHistory() // Refresh history
    return result
  }

  const handleTournamentImport = async (file: File) => {
    const result = await importExportService.importTournaments(file)
    await loadImportHistory()
    return result
  }

  const handleGameImport = async (file: File) => {
    const result = await importExportService.importGameResults(file)
    await loadImportHistory()
    return result
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Import</h1>
          <p className="text-muted-foreground">Import CSV data and manage bulk operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadImportHistory} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      {/* Import Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Imports</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentImports}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Imports</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedImports}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Imported</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Import Tabs */}
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
              <CardTitle>Player Data Import</CardTitle>
              <CardDescription>Import player statistics, performance data, and profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUpload={handlePlayerImport}
                acceptedTypes=".csv"
                maxSize={10}
                description="Supported format: CSV with columns: name, game, position, elo_rating, wins, losses"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Data Import</CardTitle>
              <CardDescription>Import tournament results, brackets, and match data</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUpload={handleTournamentImport}
                acceptedTypes=".csv"
                maxSize={10}
                description="Supported format: CSV with columns: tournament_name, game, participants, winner, prize_pool"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games">
          <Card>
            <CardHeader>
              <CardTitle>Game Results Import</CardTitle>
              <CardDescription>Import match results, scores, and game statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUpload={handleGameImport}
                acceptedTypes=".csv"
                maxSize={10}
                description="Supported format: CSV with columns: date, team1, team2, score1, score2, game_type"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="betting">
          <Card>
            <CardHeader>
              <CardTitle>Betting Data Import</CardTitle>
              <CardDescription>Import betting odds, markets, and payout data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Betting data import coming soon</p>
                <p className="text-sm">This feature will be available in the next update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import History</CardTitle>
          <CardDescription>Track your recent data imports and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading import history...</p>
              </div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No import history found</p>
                <p className="text-sm">Start by importing your first data file above</p>
              </div>
            ) : (
              importHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{record.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.type} • {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={record.status === "success" ? "default" : "destructive"}>{record.status}</Badge>
                    <span className="text-sm text-muted-foreground">{record.records_imported || 0} records</span>
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
