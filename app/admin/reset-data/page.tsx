"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"

interface ResetOptions {
  playerStats: boolean
  matchHistory: boolean
  bettingData: boolean
  analyticsData: boolean
  eloRatings: boolean
  financialData: boolean
}

export default function ResetDataPage() {
  const [isResetting, setIsResetting] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    playerStats: true,
    matchHistory: true,
    bettingData: true,
    analyticsData: true,
    eloRatings: true,
    financialData: false,
  })

  const supabase = createClient()

  const resetPlayerData = async () => {
    setIsResetting(true)
    setError(null)

    try {
      console.log("[v0] Starting comprehensive player data reset...")

      // Reset user statistics
      if (resetOptions.playerStats) {
        console.log("[v0] Resetting player statistics...")
        await supabase
          .from("users")
          .update({
            elo_rating: 1200,
            mmr: 1200,
            total_games: 0,
            wins: 0,
            losses: 0,
            balance: 25,
          })
          .neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Reset match history and results
      if (resetOptions.matchHistory) {
        console.log("[v0] Clearing match history...")
        await supabase.from("match_results").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("match_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("match_participants").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("score_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Reset betting data
      if (resetOptions.bettingData) {
        console.log("[v0] Clearing betting data...")
        await supabase.from("bets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("auction_bets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("betting_markets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Reset analytics and performance data
      if (resetOptions.analyticsData) {
        console.log("[v0] Clearing analytics data...")
        await supabase.from("player_analytics").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("player_performances").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("match_analytics").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("team_analytics").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("csv_processing_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Reset ELO history
      if (resetOptions.eloRatings) {
        console.log("[v0] Clearing ELO history...")
        await supabase.from("elo_history").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Reset financial data (optional - dangerous)
      if (resetOptions.financialData) {
        console.log("[v0] Clearing financial data...")
        await supabase.from("financial_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("user_wallets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Clear additional game-specific data
      console.log("[v0] Clearing additional game data...")
      await supabase.from("mvp_votes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("player_mvp_awards").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("draft_bids").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("captain_draft_participants").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("captain_drafts").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      console.log("[v0] Player data reset completed successfully")
      setResetComplete(true)
    } catch (err) {
      console.error("[v0] Error during player data reset:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsResetting(false)
    }
  }

  const handleOptionChange = (option: keyof ResetOptions, checked: boolean) => {
    setResetOptions((prev) => ({
      ...prev,
      [option]: checked,
    }))
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset Player Data</h1>
        <p className="text-slate-600">Comprehensive system to reset all player statistics and game data</p>
      </div>

      <Alert className="mb-6 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Warning:</strong> This action will permanently delete selected player data and cannot be undone.
          Please ensure you have proper backups before proceeding.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Reset Options
          </CardTitle>
          <CardDescription>
            Select which types of player data to reset. User accounts will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="playerStats"
                checked={resetOptions.playerStats}
                onCheckedChange={(checked) => handleOptionChange("playerStats", checked as boolean)}
              />
              <label htmlFor="playerStats" className="text-sm font-medium">
                Player Statistics (ELO, wins, losses, games played)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="matchHistory"
                checked={resetOptions.matchHistory}
                onCheckedChange={(checked) => handleOptionChange("matchHistory", checked as boolean)}
              />
              <label htmlFor="matchHistory" className="text-sm font-medium">
                Match History & Results
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bettingData"
                checked={resetOptions.bettingData}
                onCheckedChange={(checked) => handleOptionChange("bettingData", checked as boolean)}
              />
              <label htmlFor="bettingData" className="text-sm font-medium">
                Betting Data & Markets
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="analyticsData"
                checked={resetOptions.analyticsData}
                onCheckedChange={(checked) => handleOptionChange("analyticsData", checked as boolean)}
              />
              <label htmlFor="analyticsData" className="text-sm font-medium">
                Analytics & Performance Data
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="eloRatings"
                checked={resetOptions.eloRatings}
                onCheckedChange={(checked) => handleOptionChange("eloRatings", checked as boolean)}
              />
              <label htmlFor="eloRatings" className="text-sm font-medium">
                ELO Rating History
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="financialData"
                checked={resetOptions.financialData}
                onCheckedChange={(checked) => handleOptionChange("financialData", checked as boolean)}
              />
              <label htmlFor="financialData" className="text-sm font-medium text-red-600">
                Financial Data (⚠️ Dangerous)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execute Reset</CardTitle>
          <CardDescription>This will reset all selected player data across the entire platform</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">Error: {error}</AlertDescription>
            </Alert>
          )}

          {resetComplete && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Player data reset completed successfully! All selected data has been cleared.
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={resetPlayerData} disabled={isResetting} variant="destructive" size="lg" className="w-full">
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting Player Data...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Selected Player Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
