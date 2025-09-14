"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface PermissionGuardProps {
  children: React.ReactNode
  tournamentId?: string
  requiredRole?: "admin" | "organizer" | "captain" | "user"
  requireTournamentCreator?: boolean
  requireTeamCaptain?: boolean
}

export default function PermissionGuard({
  children,
  tournamentId,
  requiredRole = "user",
  requireTournamentCreator = false,
  requireTeamCaptain = false,
}: PermissionGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [permissionLoading, setPermissionLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkPermissions = async () => {
      if (!isAuthenticated || !user) {
        setHasPermission(false)
        setPermissionLoading(false)
        return
      }

      console.log("[v0] Checking permissions for user:", {
        userId: user.id,
        username: user.username,
        role: user.role,
        tournamentId,
        requiredRole,
        requireTournamentCreator,
        requireTeamCaptain,
      })

      try {
        // Check role-based permissions
        const roleHierarchy = ["user", "captain", "organizer", "admin"]
        const userRoleLevel = roleHierarchy.indexOf(user.role || "user")
        const requiredRoleLevel = roleHierarchy.indexOf(requiredRole)

        if (userRoleLevel < requiredRoleLevel) {
          console.log("[v0] Insufficient role level")
          setHasPermission(false)
          setPermissionLoading(false)
          return
        }

        // Check tournament creator permission
        if (requireTournamentCreator && tournamentId) {
          const { data: tournament } = await supabase
            .from("tournaments")
            .select("created_by")
            .eq("id", tournamentId)
            .single()

          if (tournament?.created_by !== user.id) {
            console.log("[v0] User is not tournament creator")
            setHasPermission(false)
            setPermissionLoading(false)
            return
          }
        }

        // Check team captain permission
        if (requireTeamCaptain && tournamentId) {
          const { data: team } = await supabase
            .from("tournament_teams")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("team_captain", user.id)
            .single()

          if (!team) {
            console.log("[v0] User is not a team captain")
            setHasPermission(false)
            setPermissionLoading(false)
            return
          }
        }

        console.log("[v0] Permission granted")
        setHasPermission(true)
      } catch (error) {
        console.error("[v0] Error checking permissions:", error)
        setHasPermission(false)
      } finally {
        setPermissionLoading(false)
      }
    }

    checkPermissions()
  }, [user, isAuthenticated, tournamentId, requiredRole, requireTournamentCreator, requireTeamCaptain, supabase])

  if (isLoading || permissionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertDescription>You must be logged in to access this content.</AlertDescription>
      </Alert>
    )
  }

  if (hasPermission === false) {
    return (
      <Alert>
        <AlertDescription>
          You don't have permission to access this content. Required: {requiredRole}
          {requireTournamentCreator && " (Tournament Creator)"}
          {requireTeamCaptain && " (Team Captain)"}
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
