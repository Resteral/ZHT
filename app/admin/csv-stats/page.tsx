"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { csvAnalyticsService } from "@/lib/services/csv-analytics-service"
import { analyticsService } from "@/lib/services/analytics-service"
import { BarChart3, Upload, AlertCircle } from "lucide-react"

export default function CSVStatsTestPage() {
  const [csvData, setCsvData] = useState("")
  const [parseResult, setParseResult] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])

  const handleParseCSV = () => {
    if (!csvData.trim()) {
      setTestResults(["Please enter CSV data to parse"])
      return
    }

    const result = csvAnalyticsService.parseCSVData(csvData)
    setParseResult(result)

    if (result.isValid) {
      setTestResults([
        `✅ Successfully parsed ${result.players.length} players`,
        `✅ Match data: ${result.match.total_kills} total kills, ${result.match.total_damage} total damage`,
        `✅ MVP: ${result.match.mvp_username}`,
      ])
    } else {
      setTestResults([
        `❌ Parsing failed with ${result.errors.length} errors:`,
        ...result.errors.map((error) => `  • ${error}`),
      ])
    }
  }

  const loadSampleData = () => {
    const sampleCSV = csvAnalyticsService.generateSampleCSV()
    setCsvData(sampleCSV)
    setTestResults(["Sample CSV data loaded. Click 'Parse CSV' to test."])
  }

  const testAnalyticsService = async () => {
    setIsProcessing(true)
    const results: string[] = []

    try {
      // Test getting player analytics (should return empty for non-existent match)
      const playerAnalytics = await analyticsService.getPlayerAnalytics("test-match-id")
      results.push(`✅ Player analytics query: ${playerAnalytics.length} records`)

      // Test getting team analytics
      const teamAnalytics = await analyticsService.getTeamAnalytics("test-match-id")
      results.push(`✅ Team analytics query: ${teamAnalytics.length} records`)

      // Test getting match analytics
      const matchAnalytics = await analyticsService.getMatchAnalytics("test-match-id")
      results.push(`✅ Match analytics query: ${matchAnalytics ? "Found" : "Not found"}`)

      // Test top performers
      const topPerformers = await analyticsService.getTopPerformers(5)
      results.push(`✅ Top performers query: ${topPerformers.length} records`)

      // Test matches with analytics
      const matchesWithAnalytics = await analyticsService.getMatchesWithAnalytics(10)
      results.push(`✅ Matches with analytics: ${matchesWithAnalytics.length} records`)

      results.push("🎉 All analytics service tests passed!")
    } catch (error) {
      results.push(`❌ Analytics service test failed: ${error}`)
    }

    setTestResults(results)
    setIsProcessing(false)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CSV Analytics Testing</h1>
          <p className="text-muted-foreground">Test CSV parsing and analytics integration</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          <BarChart3 className="h-4 w-4 mr-1" />
          Admin Tool
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV Data Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button onClick={loadSampleData} variant="outline" size="sm">
                Load Sample Data
              </Button>
              <Textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste CSV data here or click 'Load Sample Data'"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleParseCSV} disabled={!csvData.trim()}>
                Parse CSV
              </Button>
              <Button onClick={testAnalyticsService} variant="outline" disabled={isProcessing}>
                {isProcessing ? "Testing..." : "Test Analytics Service"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <div key={index} className="text-sm font-mono">
                        {result}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {parseResult && parseResult.isValid && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Parsed Players:</h4>
                  <div className="space-y-2">
                    {parseResult.players.map((player: any, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{player.username}</div>
                        <div className="text-muted-foreground">
                          K/D/A: {player.kills}/{player.deaths}/{player.assists} | Damage: {player.damage_dealt} |
                          Score: {player.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Match Summary:</h4>
                  <div className="p-2 bg-green-50 rounded text-sm">
                    <div>Total Kills: {parseResult.match.total_kills}</div>
                    <div>Total Damage: {parseResult.match.total_damage}</div>
                    <div>MVP: {parseResult.match.mvp_username}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expected CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded font-mono text-sm">
            <div>username,kills,deaths,assists,damage_dealt,damage_taken,healing_done,accuracy,score</div>
            <div>Player1,15,8,12,2500,1800,500,75.5,1200</div>
            <div>Player2,12,10,15,2200,2000,800,68.2,1100</div>
            <div>...</div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            All columns are required. Numeric values should be integers except for accuracy (decimal).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
