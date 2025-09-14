"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  Archive,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Calendar,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { tournamentLifecycleService, type TournamentLifecycleState } from "@/lib/services/tournament-lifecycle-service"
import { liveBracketIntegrationService } from "@/lib/services/live-bracket-integration-service"
import { toast } from "sonner"

interface TournamentLifecycleManagerProps {
  tournamentId: string
  isCreator?: boolean
  onStatusChange?: (newStatus: string) => void
}

export function TournamentLifecycleManager({
  tournamentId,
  isCreator = false,
  onStatusChange,
}: TournamentLifecycleManagerProps) {
  const [lifecycleState, setLifecycleState] = useState<TournamentLifecycleState | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCleanupSettings, setShowCleanupSettings] = useState(false)
  const [cleanupHours, setCleanupHours] = useState(24)
  const [archiveBeforeCleanup, setArchiveBeforeCleanup] = useState(true)
  const [preserveResults, setPreserveResults] = useState(true)
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const { user } = useAuth()

  const loadLifecycleState = async () => {
    try {
      const state = await tournamentLifecycleService.getLifecycleState(tournamentId)
      setLifecycleState(state)
    } catch (error) {
      console.error("[v0] Error loading lifecycle state:", error)
      toast.error("Failed to load tournament status")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (targetStatus: string) => {
    if (!user || !lifecycleState) return

    setUpdating(true)
    try {
      console.log("[v0] Changing tournament status to:", targetStatus)

      if (targetStatus === "team_building" && lifecycleState.status === "registration") {
        // Check if tournament has minimum participants before allowing team building
        const response = await fetch(`/api/tournaments/${tournamentId}/validate-transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_status: targetStatus }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Cannot transition to team building")
        }
      }

      const newState = await tournamentLifecycleService.progressStatus(tournamentId, targetStatus, user.id)

      if (targetStatus === "active" && lifecycleState.status !== "active") {
        console.log("[v0] Tournament activated, generating live bracket")
        const bracketResult = await liveBracketIntegrationService.generateTournamentBracket(tournamentId)
        if (bracketResult.success) {
          toast.success("Tournament activated with live bracket!")
        } else {
          toast.warning("Tournament activated but bracket generation failed")
        }
      }

      setLifecycleState(newState)
      onStatusChange?.(targetStatus)
      toast.success(`Tournament status changed to ${targetStatus}`)
    } catch (error) {
      console.error("[v0] Error changing status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to change status")
    } finally {
      setUpdating(false)
    }
  }

  const handleRollback = async () => {
    if (!user) return

    setUpdating(true)
    try {
      console.log("[v0] Rolling back tournament status")
      const newState = await tournamentLifecycleService.rollbackStatus(tournamentId, user.id)
      setLifecycleState(newState)
      toast.success("Tournament status rolled back successfully")
    } catch (error) {
      console.error("[v0] Error rolling back:", error)
      toast.error(error instanceof Error ? error.message : "Failed to rollback status")
    } finally {
      setUpdating(false)
    }
  }

  const handleScheduleCleanup = async () => {
    setUpdating(true)
    try {
      await tournamentLifecycleService.scheduleCleanup(tournamentId, {
        cleanup_after_hours: cleanupHours,
        archive_before_cleanup: archiveBeforeCleanup,
        preserve_results: preserveResults,
        notify_participants: notifyParticipants,
        cleanup_type: archiveBeforeCleanup ? "soft" : "hard",
      })
      toast.success(`Cleanup scheduled for ${cleanupHours} hours from now`)
      setShowCleanupSettings(false)
      loadLifecycleState() // Refresh to show scheduled cleanup
    } catch (error) {
      console.error("[v0] Error scheduling cleanup:", error)
      toast.error("Failed to schedule cleanup")
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "bg-blue-500"
      case "team_building":
        return "bg-orange-500"
      case "drafting":
        return "bg-yellow-500"
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-purple-500"
      case "cancelled":
        return "bg-red-500"
      case "archived":
        return "bg-gray-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "registration":
        return <Clock className="h-4 w-4" />
      case "team_building":
        return <Settings className="h-4 w-4" />
      case "drafting":
        return <Play className="h-4 w-4" />
      case "active":
        return <Play className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <Square className="h-4 w-4" />
      case "archived":
        return <Archive className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAvailableActions = () => {
    if (!lifecycleState || !isCreator) return []

    const actions = []
    switch (lifecycleState.status) {
      case "registration":
        actions.push({ label: "Start Team Building", value: "team_building", icon: Play })
        actions.push({ label: "Start Draft", value: "drafting", icon: Play })
        actions.push({ label: "Cancel", value: "cancelled", icon: Square })
        break
      case "team_building":
        actions.push({ label: "Start Draft", value: "drafting", icon: Play })
        actions.push({ label: "Back to Registration", value: "registration", icon: RotateCcw })
        actions.push({ label: "Cancel", value: "cancelled", icon: Square })
        break
      case "drafting":
        actions.push({ label: "Start Tournament", value: "active", icon: Play })
        actions.push({ label: "Back to Team Building", value: "team_building", icon: RotateCcw })
        actions.push({ label: "Cancel", value: "cancelled", icon: Square })
        break
      case "active":
        actions.push({ label: "Complete Tournament", value: "completed", icon: CheckCircle })
        actions.push({ label: "Cancel", value: "cancelled", icon: Square })
        break
      case "completed":
        actions.push({ label: "Archive", value: "archived", icon: Archive })
        break
      case "cancelled":
        actions.push({ label: "Restart Registration", value: "registration", icon: RotateCcw })
        break
    }
    return actions
  }

  useEffect(() => {
    loadLifecycleState()
    const interval = setInterval(loadLifecycleState, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament status...</p>
        </CardContent>
      </Card>
    )
  }

  if (!lifecycleState) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Failed to load tournament status</p>
        </CardContent>
      </Card>
    )
  }

  const availableActions = getAvailableActions()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(lifecycleState.status)}
            Tournament Lifecycle Management
          </CardTitle>
          <CardDescription>Monitor and control tournament progression and cleanup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(lifecycleState.status)} text-white`}>
                {lifecycleState.status.toUpperCase()}
              </Badge>
              {lifecycleState.error_state && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Error
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Progress: {Math.round(lifecycleState.progress_percentage)}%
            </div>
          </div>

          <Progress value={lifecycleState.progress_percentage} className="h-2" />

          {lifecycleState.next_action && (
            <div className="text-sm">
              <span className="text-muted-foreground">Next Action: </span>
              <span className="font-medium">{lifecycleState.next_action}</span>
            </div>
          )}

          {lifecycleState.cleanup_scheduled && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Cleanup scheduled for {new Date(lifecycleState.cleanup_scheduled).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {lifecycleState.error_state && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{lifecycleState.error_state}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isCreator && availableActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Controls</CardTitle>
            <CardDescription>Manage tournament status and progression</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              {availableActions.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.value}
                    onClick={() => handleStatusChange(action.value)}
                    disabled={updating}
                    variant={action.value === "cancelled" ? "destructive" : "default"}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                )
              })}
            </div>

            {lifecycleState.can_rollback && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleRollback}
                  disabled={updating}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rollback Last Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isCreator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cleanup Management
            </CardTitle>
            <CardDescription>Configure automatic tournament cleanup policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setShowCleanupSettings(!showCleanupSettings)} variant="outline" className="w-full">
              {showCleanupSettings ? "Hide" : "Show"} Cleanup Settings
            </Button>

            {showCleanupSettings && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="cleanup-hours">Cleanup After (Hours)</Label>
                  <Input
                    id="cleanup-hours"
                    type="number"
                    value={cleanupHours}
                    onChange={(e) => setCleanupHours(Number(e.target.value))}
                    min="1"
                    max="8760"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="archive-before">Archive Before Cleanup</Label>
                    <Switch
                      id="archive-before"
                      checked={archiveBeforeCleanup}
                      onCheckedChange={setArchiveBeforeCleanup}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve-results">Preserve Results</Label>
                    <Switch id="preserve-results" checked={preserveResults} onCheckedChange={setPreserveResults} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-participants">Notify Participants</Label>
                    <Switch
                      id="notify-participants"
                      checked={notifyParticipants}
                      onCheckedChange={setNotifyParticipants}
                    />
                  </div>
                </div>

                <Button onClick={handleScheduleCleanup} disabled={updating} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Schedule Cleanup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
