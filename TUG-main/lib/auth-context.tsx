"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface User {
  id: string // Supabase UUID as primary identifier
  username: string
  account_id: string
  balance: number
  elo_rating: number
  created_at: string
  role?: string // Added role field for permissions
  email?: string // Added email from Supabase auth
  avatar_url?: string // Added avatar_url
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isLoading: boolean
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  supabaseUser: SupabaseUser | null // Added Supabase user for session management
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const validateAndRefreshSession = async (storedUser?: User) => {
    try {
      // First check Supabase session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Supabase session error:", sessionError)
        localStorage.removeItem("fantasy_user")
        setUser(null)
        setSupabaseUser(null)
        return false
      }

      if (!session?.user) {
        console.log("[v0] No active Supabase session")
        localStorage.removeItem("fantasy_user")
        setUser(null)
        setSupabaseUser(null)
        return false
      }

      setSupabaseUser(session.user)

      // Now get user data from our database using Supabase user ID
      let { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

      if (error || !data) {
        console.error("[v0] User not found in database:", error)
        // Try to create user record if it doesn't exist
        if (session.user.email) {
          const newUser = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email.split("@")[0],
            email: session.user.email,
            account_id: session.user.id, // Use Supabase ID as account_id
            balance: 1000,
            elo_rating: 1200,
            role: "user",
          }

          const { data: createdUser, error: createError } = await supabase
            .from("users")
            .insert(newUser)
            .select()
            .single()

          if (createError) {
            console.error("[v0] Error creating user:", createError)
            return false
          }

          data = createdUser
        } else {
          return false
        }
      }

      const updatedUser: User = {
        id: data.id,
        username: data.username,
        account_id: data.account_id,
        balance: data.balance,
        elo_rating: data.elo_rating,
        created_at: data.created_at,
        role: data.role || "user",
        email: session.user.email,
        avatar_url: data.avatar_url,
      }

      console.log("[v0] User authenticated:", {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
      })

      setUser(updatedUser)
      localStorage.setItem("fantasy_user", JSON.stringify(updatedUser))
      return true
    } catch (error) {
      console.error("[v0] Error validating session:", error)
      localStorage.removeItem("fantasy_user")
      setUser(null)
      setSupabaseUser(null)
      return false
    }
  }

  const refreshUser = useCallback(async () => {
    if (!supabaseUser) return

    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", supabaseUser.id).single()

      if (!error && data) {
        const updatedUser: User = {
          id: data.id,
          username: data.username,
          account_id: data.account_id,
          balance: data.balance,
          elo_rating: data.elo_rating,
          created_at: data.created_at,
          role: data.role || "user",
          email: supabaseUser.email,
          avatar_url: data.avatar_url,
        }
        setUser(updatedUser)
        localStorage.setItem("fantasy_user", JSON.stringify(updatedUser))
        console.log("[v0] User refreshed:", { id: updatedUser.id, username: updatedUser.username })
      }
    } catch (error) {
      console.error("[v0] Error refreshing user:", error)
    }
  }, [supabaseUser, supabase])

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("[v0] Initializing auth...")

      // Check for existing session first
      await validateAndRefreshSession()

      setIsLoading(false)
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event, session?.user?.id || "none")

      if (event === "SIGNED_OUT" || !session) {
        setUser(null)
        setSupabaseUser(null)
        localStorage.removeItem("fantasy_user")
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await validateAndRefreshSession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  useEffect(() => {
    if (!user || !supabaseUser) return

    const interval = setInterval(
      () => {
        refreshUser()
      },
      5 * 60 * 1000,
    ) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [user, supabaseUser, refreshUser])

  const isAuthenticated = !!user && !!supabaseUser && !isLoading

  const login = useCallback((userData: User) => {
    console.log("[v0] Manual login:", userData.username)
    setUser(userData)
    localStorage.setItem("fantasy_user", JSON.stringify(userData))
  }, [])

  const logout = useCallback(async () => {
    console.log("[v0] Logging out...")
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("[v0] Error signing out:", error)
    }
    setUser(null)
    setSupabaseUser(null)
    localStorage.removeItem("fantasy_user")
  }, [supabase.auth])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        refreshUser,
        isAuthenticated,
        supabaseUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
