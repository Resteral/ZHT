"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export default function DataManagementPage() {
  const [isRemoving, setIsRemoving] = useState(false)
  const [message, setMessage] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)

  const supabase = createClient()

  const handleRemoveAllData = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setIsRemoving(true)
    setMessage("")

    try {
      // Execute the data removal script
      const { error } = await supabase.rpc("execute_sql", {
        sql_query: `
          SET session_replication_role = replica;
          TRUNCATE TABLE match_participants CASCADE;
          TRUNCATE TABLE wager_match_participants CASCADE;
          TRUNCATE TABLE tournament_participants CASCADE;
          TRUNCATE TABLE auction_draft_participants CASCADE;
          TRUNCATE TABLE team_members CASCADE;
          TRUNCATE TABLE team_invitations CASCADE;
          TRUNCATE TABLE betting_markets CASCADE;
          TRUNCATE TABLE user_bets CASCADE;
          TRUNCATE TABLE announcements CASCADE;
          TRUNCATE TABLE user_achievements CASCADE;
          TRUNCATE TABLE match_history CASCADE;
          TRUNCATE TABLE player_statistics CASCADE;
          TRUNCATE TABLE draft_chat CASCADE;
          TRUNCATE TABLE system_alerts CASCADE;
          TRUNCATE TABLE admin_logs CASCADE;
          TRUNCATE TABLE matches CASCADE;
          TRUNCATE TABLE wager_matches CASCADE;
          TRUNCATE TABLE tournaments CASCADE;
          TRUNCATE TABLE auction_drafts CASCADE;
          TRUNCATE TABLE teams CASCADE;
          TRUNCATE TABLE games CASCADE;
          TRUNCATE TABLE venues CASCADE;
          TRUNCATE TABLE leagues CASCADE;
          TRUNCATE TABLE seasons CASCADE;
          TRUNCATE TABLE user_wallets CASCADE;
          TRUNCATE TABLE profiles CASCADE;
          TRUNCATE TABLE users CASCADE;
          SET session_replication_role = DEFAULT;
        `,
      })

      if (error) {
        throw error
      }

      setMessage("All data has been successfully removed from the database.")
      setShowConfirmation(false)
    } catch (error) {
      console.error("Error removing data:", error)
      setMessage(`Error removing data: ${error.message}`)
    } finally {
      setIsRemoving(false)
    }
  }

  const exportData = async () => {
    try {
      // Export all data as JSON
      const tables = [
        "users",
        "profiles",
        "teams",
        "matches",
        "tournaments",
        "wager_matches",
        "games",
        "venues",
        "leagues",
      ]

      const exportData = {}

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*")
        if (!error) {
          exportData[table] = data
        }
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fantasy-sports-data-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMessage("Data exported successfully.")
    } catch (error) {
      console.error("Error exporting data:", error)
      setMessage(`Error exporting data: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Management</h1>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>Download all current data as a JSON file for backup purposes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportData} className="w-full">
              Export All Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Remove All Data
            </CardTitle>
            <CardDescription>
              Permanently delete all data from the database. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showConfirmation ? (
              <Button variant="destructive" onClick={handleRemoveAllData} className="w-full">
                Remove All Data
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert className="border-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will permanently delete ALL data from the database. This action
                    cannot be undone. Are you sure you want to continue?
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleRemoveAllData} disabled={isRemoving} className="flex-1">
                    {isRemoving ? "Removing..." : "Yes, Remove All Data"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
