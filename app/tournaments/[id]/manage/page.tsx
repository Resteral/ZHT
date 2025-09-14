"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Settings, Users, Trophy, Calendar, Gavel } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { TournamentLifecycleManager } from "@/components/tournaments/tournament-lifecycle-manager"
import PermissionGuard from "@/components/auth/permission-guard"
import { toast } from "sonner"

interface TournamentManagePageProps {
  params: {
    id: string
  }
}

export default function TournamentManagePage({ params }: TournamentManagePageProps) {
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [auctionSession, setAuctionSession] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournament = async () => {
    try {
      console.log("[v0] Loading tournament for management:", params.id)
      console.log("[v0] Current user:", { id: user?.id, username: user?.username, role: user?.role })

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("leagues")
        .select(`
          *,
          creator:users!leagues_commissioner_id_fkey(username, id),
          participant_count:league_participants(count)
        `)
        .eq("id", params.id)
        .eq("league_mode", "tournament")
        .single()

      if (tournamentError) {
        console.log("[v0] Error from leagues table, trying tournaments table as fallback")
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("tournaments")
          .select(`
            *,
            creator:users!tournaments_created_by_fkey(username, id),
            participant_count:tournament_participants(count)
          `)
          .eq("id", params.id)
          .single()

        if (fallbackError) throw fallbackError
        setTournament(fallbackData)
        console.log("[v0] Tournament loaded from tournaments table:", fallbackData.name)
      } else {
        console.log("[v0] Tournament loaded from leagues table:", tournamentData.league_name)
        setTournament(tournamentData)
      }
    } catch (err) {
      console.error("[v0] Error loading tournament:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (tournament) {
      setTournament({ ...tournament, status: newStatus })
      toast.success(`Tournament status updated to ${newStatus}`)
    }
  }

  const startAuctionDraft = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params.id}/auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_auction_direct",
          skip_captain_selection: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAuctionSession(data.session)
        toast.success("Auction draft started successfully!")
        router.push(`/tournaments/${params.id}/auction`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to start auction draft")
      }
    } catch (error) {
      console.error("[v0] Error starting auction draft:", error)
      toast.error("Failed to start auction draft")
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      loadTournament()
    }
  }, [params.id, user, isAuthenticated])

  return (
    <PermissionGuard tournamentId={params.id} requireTournamentCreator={true} requiredRole="organizer">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${params.id}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournament
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{tournament?.name || tournament?.league_name}</h1>
                <p className="text-lg text-muted-foreground">Tournament Management</p>
              </div>
            </div>
            <p className="text-muted-foreground">Manage tournament lifecycle, settings, and cleanup policies</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {tournament?.participant_count?.[0]?.count || 0} participants
            </Badge>
            <Badge variant={tournament?.status === "active" ? "default" : "secondary"}>
              {tournament?.status?.toUpperCase() || "UNKNOWN"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TournamentLifecycleManager tournamentId={params.id} isCreator={true} onStatusChange={handleStatusChange} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {tournament?.tournament_type?.replace("_", " ").toUpperCase() || tournament?.sport?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Participants:</span>
                    <span>{tournament?.max_participants || tournament?.max_teams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Fee:</span>
                    <span className="text-green-600 font-medium">${tournament?.entry_fee || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="text-green-600 font-medium">${tournament?.prize_pool || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(tournament?.created_at).toLocaleDateString()}</span>
                  </div>
                  {tournament?.start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {tournament?.end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span>{new Date(tournament.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push(`/tournaments/${params.id}`)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  View Tournament Page
                </Button>
                <Button
                  onClick={() => router.push(`/tournaments/${params.id}/participants`)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Participants
                </Button>
                {(tournament?.status === "team_building" ||
                  tournament?.status === "drafting" ||
                  tournament?.status === "registration") && (
                  <Button onClick={startAuctionDraft} variant="outline" className="w-full justify-start bg-transparent">
                    <Gavel className="h-4 w-4 mr-2" />
                    Start Direct Auction Draft
                  </Button>
                )}
                <Button
                  onClick={() => router.push(`/tournaments/${params.id}/auction`)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Auction Room
                </Button>
                {tournament?.status !== "drafting" && tournament?.status !== "active" && (
                  <Button
                    onClick={() => router.push(`/tournaments/${params.id}/draft`)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Draft Room
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Management Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Status Progression</div>
                    <div className="text-muted-foreground">
                      Tournaments automatically progress through phases based on time and participation
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Cleanup Policies</div>
                    <div className="text-muted-foreground">
                      Configure when and how tournament data should be cleaned up after completion
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Rollback Support</div>
                    <div className="text-muted-foreground">
                      Most status changes can be rolled back if needed during tournament management
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
