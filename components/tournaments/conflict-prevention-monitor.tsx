"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, CheckCircle, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ConflictData {
  tournament_id: string
  tournament_name: string
  participant_count: number
  pool_count: number
  conflicts: number
  orphaned_pool_entries: number
}

export function ConflictPreventionMonitor() {
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)

  const supabase = createClient()

  const checkForConflicts = async () => {
    try {
      console.log("[v0] Checking for tournament participation conflicts")

      // Get tournament data with participant and pool counts
      const { data: tournamentData, error } = await supabase.rpc("check_tournament_conflicts")

      if (error) {
        console.error("[v0] Error checking conflicts:", error)
        // Fallback to manual query if RPC doesn't exist
        const { data: tournaments } = await supabase
          .from("tournaments")
          .select(`
            id,
            name,
            tournament_participants(count),
            tournament_player_pool(count)
          `)
          .eq("status", "active")

        if (tournaments) {
          const conflictData: ConflictData[] = tournaments.map((t: any) => ({
            tournament_id: t.id,
            tournament_name: t.name,
            participant_count: t.tournament_participants?.[0]?.count || 0,
            pool_count: t.tournament_player_pool?.[0]?.count || 0,
            conflicts: 0,
            orphaned_pool_entries: 0,
          }))
          setConflicts(conflictData)
        }
      } else {
        setConflicts(tournamentData || [])
      }
    } catch (error) {
      console.error("[v0] Error checking conflicts:", error)
      toast.error("Failed to check for conflicts")
    } finally {
      setLoading(false)
    }
  }

  const resolveConflicts = async () => {
    setResolving(true)
    try {
      console.log("[v0] Resolving tournament participation conflicts")

      // Clean up orphaned player pool entries
      const { error: cleanupError } = await supabase.rpc("cleanup_tournament_conflicts")

      if (cleanupError) {
        console.error("[v0] Error resolving conflicts:", cleanupError)
        toast.error("Failed to resolve conflicts")
      } else {
        toast.success("Conflicts resolved successfully")
        await checkForConflicts()
      }
    } catch (error) {
      console.error("[v0] Error resolving conflicts:", error)
      toast.error("Failed to resolve conflicts")
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    checkForConflicts()
  }, [])

  const totalConflicts = conflicts.reduce((sum, c) => sum + c.conflicts + c.orphaned_pool_entries, 0)
  const hasConflicts = totalConflicts > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tournament Participation Monitor
            </CardTitle>
            <CardDescription>
              Monitor and resolve conflicts between tournament participants and player pools
            </CardDescription>
          </div>
          <Button onClick={checkForConflicts} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasConflicts && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Found {totalConflicts} conflict(s) that need resolution</span>
              <Button onClick={resolveConflicts} disabled={resolving} size="sm">
                {resolving ? "Resolving..." : "Resolve Conflicts"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!hasConflicts && !loading && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No conflicts detected. Tournament participation systems are synchronized.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <div key={conflict.tournament_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">{conflict.tournament_name}</div>
                <div className="text-sm text-muted-foreground">
                  Participants: {conflict.participant_count} | Pool: {conflict.pool_count}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conflict.conflicts > 0 && <Badge variant="destructive">{conflict.conflicts} conflicts</Badge>}
                {conflict.orphaned_pool_entries > 0 && (
                  <Badge variant="secondary">{conflict.orphaned_pool_entries} orphaned</Badge>
                )}
                {conflict.conflicts === 0 && conflict.orphaned_pool_entries === 0 && (
                  <Badge variant="outline">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Clean
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Checking for conflicts...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
