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
        console.log("[v0] User not authenticated:", { isAuthenticated, user: !!user })
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
        const roleHierarchy = ["user", "captain", "organizer", "admin"]
        const userRoleLevel = roleHierarchy.indexOf(user.role || "user")
        const requiredRoleLevel = roleHierarchy.indexOf(requiredRole)

        // Allow admin users to bypass all checks
        if (user.role === "admin") {
          console.log("[v0] Admin user - permission granted")
          setHasPermission(true)
          setPermissionLoading(false)
          return
        }

        if (userRoleLevel < requiredRoleLevel) {
          console.log("[v0] Insufficient role level:", { userRole: user.role, requiredRole })
          setHasPermission(false)
          setPermissionLoading(false)
          return
        }

        // Check tournament creator permission
        if (requireTournamentCreator && tournamentId) {
          let isCreator = false

          const { data: tournament } = await supabase
            .from("tournaments")
            .select("created_by")
            .eq("id", tournamentId)
            .single()

          if (tournament?.created_by === user.id) {
            isCreator = true
          } else {
            // Fallback to leagues table
            const { data: league } = await supabase
              .from("leagues")
              .select("commissioner_id")
              .eq("id", tournamentId)
              .single()

            if (league?.commissioner_id === user.id) {
              isCreator = true
            }
          }

          if (!isCreator) {
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
        if (error instanceof Error && error.message.includes("No rows")) {
          console.log("[v0] No tournament found, but allowing access for creation")
          setHasPermission(true)
        } else {
          setHasPermission(false)
        }
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
        <AlertDescription>You must be logged in to access this content. Please sign in to continue.</AlertDescription>
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
          {user && (
            <div className="mt-2 text-sm">
              Current user: {user.username} (Role: {user.role || "user"})
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
