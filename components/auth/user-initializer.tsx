"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, User } from "lucide-react"

export function UserInitializer() {
  const { user, isAuthenticated } = useAuth()
  const [userExists, setUserExists] = useState<boolean | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkUserExists = async () => {
    if (!user?.id || !isAuthenticated) return

    const supabase = createClient()

    const { data: existingUser, error } = await supabase
      .from("users")
      .select("id, username, account_id")
      .or(`account_id.eq.${user.id},username.eq.${user.username}`)
      .single()

    if (error && error.code === "PGRST116") {
      // User doesn't exist
      setUserExists(false)
    } else if (error) {
      console.error("[v0] Error checking user:", error)
      setError(`Database error: ${error.message}`)
    } else {
      // User exists
      console.log("[v0] User found in database:", existingUser.username)
      setUserExists(true)
    }
  }

  const createUser = async () => {
    if (!user?.id || !user?.username) return

    setIsCreating(true)
    setError(null)

    const supabase = createClient()

    const userToCreate = {
      username: user.username,
      account_id: user.id.length > 20 ? null : user.id, // Only set account_id if it's not a UUID
      email: `${user.username.toLowerCase()}@temp.com`,
      elo_rating: 1200,
      total_games: 0,
      wins: 0,
      losses: 0,
      balance: 100, // Starting balance
      mmr: 1200,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] Creating user with data:", userToCreate)

    const { data: newUser, error: createError } = await supabase.from("users").insert(userToCreate).select().single()

    if (createError) {
      console.error("[v0] Failed to create user:", createError)
      if (createError.code === "23505") {
        // User already exists, check again
        await checkUserExists()
      } else {
        setError(`Failed to create user: ${createError.message}`)
      }
    } else {
      console.log("[v0] User created successfully:", newUser.username)
      setUserExists(true)
    }

    setIsCreating(false)
  }

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      checkUserExists()
    }
  }, [isAuthenticated, user?.id])

  if (!isAuthenticated || !user) {
    return null
  }

  if (userExists === null) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 animate-spin" />
            <span>Checking user account...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (userExists === true) {
    return (
      <Card className="mb-4 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Account ready! You can create tournaments and join games.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertCircle className="h-5 w-5" />
          Account Setup Required
        </CardTitle>
        <CardDescription>
          Your account needs to be initialized in the database before you can create tournaments or join games.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <div className="space-y-2 mb-4">
          <p>
            <strong>Username:</strong> {user.username}
          </p>
          <p>
            <strong>Account ID:</strong> {user.id}
          </p>
        </div>
        <Button onClick={createUser} disabled={isCreating} className="w-full">
          {isCreating ? "Creating Account..." : "Initialize Account"}
        </Button>
      </CardContent>
    </Card>
  )
}
