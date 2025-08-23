"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertCircle, Settings, Zap, ArrowRight, Clock, Trophy, Target, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { tournamentDraftService } from "@/lib/services/tournament-draft-service"
import { toast } from "sonner"

interface DraftInitiationSystemProps {
  tournamentId: string
  tournament: any
  isOrganizer?: boolean
  onDraftStarted?: (draftId: string) => void
}

interface PrerequisiteCheck {
  id: string
  name: string
  description: string
  status: "pending" | "completed" | "failed"
  required: boolean
  details?: string
}

interface DraftReadiness {
  canStart: boolean
  completedChecks: number
  totalChecks: number
  failedChecks: PrerequisiteCheck[]
  pendingChecks: PrerequisiteCheck[]
}

export function DraftInitiationSystem({
  tournamentId,
  tournament,
  isOrganizer = false,
  onDraftStarted,
}: DraftInitiationSystemProps) {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheck[]>([])
  const [readiness, setReadiness] = useState<DraftReadiness>({
    canStart: false,
    completedChecks: 0,
    totalChecks: 0,
    failedChecks: [],
    pendingChecks: [],
  })
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [draftState, setDraftState] = useState<any>(null)
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()

  const checkPrerequisites = async () => {
    try {
      console.log("[v0] Checking draft prerequisites for tournament:", tournamentId)

      const checks: PrerequisiteCheck[] = []

      // Check 1: Tournament settings configured
      const settingsCheck = await checkTournamentSettings()
      checks.push(settingsCheck)

      // Check 2: Minimum players registered
      const playersCheck = await checkMinimumPlayers()
      checks.push(playersCheck)

      // Check 3: Captains selected
      const captainsCheck = await checkCaptainsSelected()
      checks.push(captainsCheck)

      // Check 4: Teams created
      const teamsCheck = await checkTeamsCreated()
      checks.push(teamsCheck)

      // Check 5: Draft not already started
      const draftStatusCheck = await checkDraftStatus()
      checks.push(draftStatusCheck)

      // Check 6: Tournament status ready
      const tournamentStatusCheck = await checkTournamentStatus()
      checks.push(tournamentStatusCheck)

      setPrerequisites(checks)
      calculateReadiness(checks)

      console.log("[v0] Prerequisites check completed:", checks.length, "checks")
    } catch (error) {
      console.error("[v0] Error checking prerequisites:", error)
      toast.error("Failed to check draft prerequisites")
    } finally {
      setLoading(false)
    }
  }

  const checkTournamentSettings = async (): Promise<PrerequisiteCheck> => {
    try {
      const settings = tournament?.player_pool_settings

      if (!settings) {
        return {
          id: "settings",
          name: "Tournament Settings",
          description: "Tournament draft settings must be configured",
          status: "failed",
          required: true,
          details: "No draft settings found",
        }
      }

      const hasRequiredSettings =
        settings.max_teams && settings.players_per_team && settings.max_pool_size && settings.draft_type

      return {
        id: "settings",
        name: "Tournament Settings",
        description: "Tournament draft settings must be configured",
        status: hasRequiredSettings ? "completed" : "failed",
        required: true,
        details: hasRequiredSettings
          ? `${settings.max_teams} teams, ${settings.players_per_team} players each, ${settings.draft_type} draft`
          : "Missing required settings",
      }
    } catch (error) {
      return {
        id: "settings",
        name: "Tournament Settings",
        description: "Tournament draft settings must be configured",
        status: "failed",
        required: true,
        details: "Error checking settings",
      }
    }
  }

  const checkMinimumPlayers = async (): Promise<PrerequisiteCheck> => {
    try {
      const { data: players, error } = await supabase
        .from("tournament_player_pool")
        .select("user_id")
        .eq("tournament_id", tournamentId)
        .in("status", ["available", "captain"])

      if (error) throw error

      const playerCount = players?.length || 0
      const minRequired = (tournament?.player_pool_settings?.max_teams || 2) * 2 // At least 2 players per team minimum
      const hasEnoughPlayers = playerCount >= minRequired

      return {
        id: "players",
        name: "Minimum Players",
        description: "Sufficient players must be registered",
        status: hasEnoughPlayers ? "completed" : "failed",
        required: true,
        details: `${playerCount}/${minRequired} minimum players registered`,
      }
    } catch (error) {
      return {
        id: "players",
        name: "Minimum Players",
        description: "Sufficient players must be registered",
        status: "failed",
        required: true,
        details: "Error checking player count",
      }
    }
  }

  const checkCaptainsSelected = async (): Promise<PrerequisiteCheck> => {
    try {
      const { data: captains, error } = await supabase
        .from("tournament_player_pool")
        .select("user_id")
        .eq("tournament_id", tournamentId)
        .eq("status", "captain")

      if (error) throw error

      const captainCount = captains?.length || 0
      const requiredCaptains = tournament?.player_pool_settings?.max_teams || 2
      const hasEnoughCaptains = captainCount >= Math.min(requiredCaptains, 2) // At least 2 captains for any tournament

      return {
        id: "captains",
        name: "Captains Selected",
        description: "Team captains must be selected",
        status: hasEnoughCaptains ? "completed" : "failed",
        required: true,
        details: `${captainCount}/${Math.min(requiredCaptains, 2)} captains selected`,
      }
    } catch (error) {
      return {
        id: "captains",
        name: "Captains Selected",
        description: "Team captains must be selected",
        status: "failed",
        required: true,
        details: "Error checking captains",
      }
    }
  }

  const checkTeamsCreated = async (): Promise<PrerequisiteCheck> => {
    try {
      const { data: teams, error } = await supabase
        .from("tournament_teams")
        .select("id, team_name")
        .eq("tournament_id", tournamentId)

      if (error) throw error

      const teamCount = teams?.length || 0
      const requiredTeams = tournament?.player_pool_settings?.max_teams || 2
      const hasEnoughTeams = teamCount >= requiredTeams

      return {
        id: "teams",
        name: "Teams Created",
        description: "Tournament teams must be created",
        status: hasEnoughTeams ? "completed" : "pending",
        required: true,
        details: `${teamCount}/${requiredTeams} teams created`,
      }
    } catch (error) {
      return {
        id: "teams",
        name: "Teams Created",
        description: "Tournament teams must be created",
        status: "failed",
        required: true,
        details: "Error checking teams",
      }
    }
  }

  const checkDraftStatus = async (): Promise<PrerequisiteCheck> => {
    try {
      // Check if draft is already initialized or active
      const existingDraftState = await tournamentDraftService.getDraftState(tournamentId)

      if (existingDraftState) {
        setDraftState(existingDraftState)

        if (existingDraftState.status === "active") {
          return {
            id: "draft_status",
            name: "Draft Status",
            description: "Draft should not be already active",
            status: "failed",
            required: true,
            details: "Draft is already active",
          }
        } else if (existingDraftState.status === "completed") {
          return {
            id: "draft_status",
            name: "Draft Status",
            description: "Draft should not be already completed",
            status: "failed",
            required: true,
            details: "Draft has already been completed",
          }
        } else if (existingDraftState.status === "waiting") {
          return {
            id: "draft_status",
            name: "Draft Status",
            description: "Draft is ready to start",
            status: "completed",
            required: true,
            details: "Draft initialized and ready",
          }
        }
      }

      return {
        id: "draft_status",
        name: "Draft Status",
        description: "Draft should be ready to initialize",
        status: "completed",
        required: true,
        details: "Ready to initialize draft",
      }
    } catch (error) {
      return {
        id: "draft_status",
        name: "Draft Status",
        description: "Draft should be ready to initialize",
        status: "pending",
        required: true,
        details: "Checking draft status...",
      }
    }
  }

  const checkTournamentStatus = async (): Promise<PrerequisiteCheck> => {
    const validStatuses = ["registration", "ready", "waiting"]
    const currentStatus = tournament?.status || "registration"
    const isValidStatus = validStatuses.includes(currentStatus)

    return {
      id: "tournament_status",
      name: "Tournament Status",
      description: "Tournament must be in ready state",
      status: isValidStatus ? "completed" : "failed",
      required: true,
      details: `Current status: ${currentStatus}`,
    }
  }

  const calculateReadiness = (checks: PrerequisiteCheck[]) => {
    const completed = checks.filter((c) => c.status === "completed")
    const failed = checks.filter((c) => c.status === "failed" && c.required)
    const pending = checks.filter((c) => c.status === "pending")

    const readinessState: DraftReadiness = {
      canStart: failed.length === 0 && pending.length === 0,
      completedChecks: completed.length,
      totalChecks: checks.length,
      failedChecks: failed,
      pendingChecks: pending,
    }

    setReadiness(readinessState)
  }

  const initiateDraft = async () => {
    if (!isOrganizer || !readiness.canStart) return

    setInitiating(true)
    try {
      console.log("[v0] Initiating tournament draft:", tournamentId)

      // Initialize draft if not already done
      let currentDraftState = draftState
      if (!currentDraftState || currentDraftState.status === "pending") {
        console.log("[v0] Initializing draft state...")
        const { draftState: newDraftState } = await tournamentDraftService.initializeDraft(tournamentId)
        currentDraftState = newDraftState
        setDraftState(newDraftState)
      }

      // Start the draft
      console.log("[v0] Starting draft...")
      const activeDraftState = await tournamentDraftService.startDraft(tournamentId, user?.id || "")

      // Update tournament status
      await supabase
        .from("tournaments")
        .update({
          status: "drafting",
          started_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      toast.success("Draft started successfully! Redirecting to draft room...")

      // Redirect to draft room or call callback
      if (onDraftStarted) {
        onDraftStarted(tournamentId)
      } else {
        router.push(`/tournaments/${tournamentId}/draft`)
      }
    } catch (error) {
      console.error("[v0] Error initiating draft:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start draft")
    } finally {
      setInitiating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-yellow-600"
    }
  }

  useEffect(() => {
    checkPrerequisites()

    // Set up real-time subscription for changes
    const subscription = supabase
      .channel(`draft-initiation-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Player pool change detected, rechecking prerequisites")
          checkPrerequisites()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_teams",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("[v0] Teams change detected, rechecking prerequisites")
          checkPrerequisites()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking draft readiness...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Draft Readiness Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Draft Initiation System
            <Button onClick={checkPrerequisites} variant="outline" size="sm" className="ml-auto bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>Verify all prerequisites are met before starting the tournament draft.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{readiness.completedChecks}</div>
              <div className="text-sm text-muted-foreground">Completed Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{readiness.failedChecks.length}</div>
              <div className="text-sm text-muted-foreground">Failed Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{readiness.pendingChecks.length}</div>
              <div className="text-sm text-muted-foreground">Pending Checks</div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Draft Readiness</span>
              <span className="font-medium">
                {readiness.completedChecks}/{readiness.totalChecks} checks passed
              </span>
            </div>
            <Progress value={(readiness.completedChecks / readiness.totalChecks) * 100} className="h-3" />
          </div>

          {readiness.canStart && isOrganizer && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-700">
                All prerequisites met! Ready to start the tournament draft.
              </AlertDescription>
            </Alert>
          )}

          {!readiness.canStart && (readiness.failedChecks.length > 0 || readiness.pendingChecks.length > 0) && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {readiness.failedChecks.length > 0
                  ? `${readiness.failedChecks.length} checks failed. Please resolve issues before starting draft.`
                  : `${readiness.pendingChecks.length} checks pending. Please complete setup before starting draft.`}
              </AlertDescription>
            </Alert>
          )}

          {isOrganizer && (
            <Button onClick={initiateDraft} disabled={!readiness.canStart || initiating} className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              {initiating ? "Starting Draft..." : "Start Tournament Draft"}
            </Button>
          )}

          {!isOrganizer && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">
                Only the tournament organizer can start the draft. Please wait for them to initiate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="prerequisites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prerequisites">Prerequisites</TabsTrigger>
          <TabsTrigger value="settings">Draft Settings</TabsTrigger>
          <TabsTrigger value="flow">Draft Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="prerequisites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prerequisite Checks
              </CardTitle>
              <CardDescription>All requirements that must be met before starting the draft.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prerequisites.map((check) => (
                  <div key={check.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mt-0.5">
                      {getStatusIcon(check.status)}
                      {check.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{check.name}</div>
                      <div className="text-sm text-muted-foreground mb-1">{check.description}</div>
                      {check.details && (
                        <div className={`text-xs ${getStatusColor(check.status)}`}>{check.details}</div>
                      )}
                    </div>
                    <Badge
                      variant={
                        check.status === "completed"
                          ? "default"
                          : check.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Draft Configuration
              </CardTitle>
              <CardDescription>Current tournament draft settings and configuration.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Tournament Structure</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium">{tournament?.player_pool_settings?.max_teams || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Players per Team:</span>
                      <span className="font-medium">
                        {tournament?.player_pool_settings?.players_per_team || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Pool Size:</span>
                      <span className="font-medium">
                        {tournament?.player_pool_settings?.max_pool_size || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Draft Settings</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Draft Type:</span>
                      <Badge variant="outline">{tournament?.player_pool_settings?.draft_type || "Not set"}</Badge>
                    </div>
                    {tournament?.player_pool_settings?.draft_type === "auction" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auction Budget:</span>
                        <span className="font-medium">${tournament?.player_pool_settings?.auction_budget || 500}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pick Time Limit:</span>
                      <span className="font-medium">2 minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-green-500" />
                Draft Initiation Flow
              </CardTitle>
              <CardDescription>Step-by-step process for starting the tournament draft.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Prerequisite Verification</div>
                    <div className="text-sm text-muted-foreground">
                      System checks all requirements: settings, players, captains, teams
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-medium text-yellow-700">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Draft Initialization</div>
                    <div className="text-sm text-muted-foreground">
                      Create draft state, generate pick order, set up teams and budgets
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-700">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Draft Room Launch</div>
                    <div className="text-sm text-muted-foreground">
                      Transition all participants to the live draft room interface
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700">
                    4
                  </div>
                  <div>
                    <div className="font-medium">Live Drafting</div>
                    <div className="text-sm text-muted-foreground">
                      Real-time draft with timer, picks, and team formation
                    </div>
                  </div>
                </div>
              </div>

              {draftState && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Current Draft State</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Status:{" "}
                    <Badge variant="outline" className="ml-1">
                      {draftState.status}
                    </Badge>
                    {draftState.status === "waiting" && (
                      <span className="ml-2">Ready to start when organizer initiates</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
