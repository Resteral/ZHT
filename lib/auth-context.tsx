"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"

interface User {
  id: string // This will now store account_id instead of UUID
  uuid: string // Store the actual UUID for database operations
  username: string
  account_id: string
  balance: number
  elo_rating: number
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isLoading: boolean
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const validateAndRefreshSession = async (storedUser: User) => {
    try {
      let query = supabase.from("users").select("*")

      if (storedUser.account_id) {
        query = query.eq("account_id", storedUser.account_id)
      } else {
        query = query.eq("id", storedUser.uuid || storedUser.id)
      }

      const { data, error } = await query.single()

      if (error || !data) {
        localStorage.removeItem("fantasy_user")
        setUser(null)
        return false
      }

      const updatedUser = {
        id: data.account_id || data.username,
        uuid: data.id,
        username: data.username,
        account_id: data.account_id,
        balance: data.balance,
        elo_rating: data.elo_rating,
        created_at: data.created_at,
      }

      setUser(updatedUser)
      localStorage.setItem("fantasy_user", JSON.stringify(updatedUser))
      return true
    } catch (error) {
      console.error("Error validating session:", error)
      localStorage.removeItem("fantasy_user")
      setUser(null)
      return false
    }
  }

  const refreshUser = async () => {
    if (!user) return

    try {
      let query = supabase.from("users").select("*")

      if (user.account_id) {
        query = query.eq("account_id", user.account_id)
      } else {
        query = query.eq("id", user.uuid)
      }

      const { data, error } = await query.single()

      if (!error && data) {
        const updatedUser = {
          id: data.account_id || data.username,
          uuid: data.id,
          username: data.username,
          account_id: data.account_id,
          balance: data.balance,
          elo_rating: data.elo_rating,
          created_at: data.created_at,
        }
        setUser(updatedUser)
        localStorage.setItem("fantasy_user", JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error("Error refreshing user:", error)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("fantasy_user")
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          await validateAndRefreshSession(parsedUser)
        } catch (error) {
          console.error("Error parsing stored user:", error)
          localStorage.removeItem("fantasy_user")
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(
      () => {
        refreshUser()
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [user])

  const isAuthenticated = !!user && !isLoading

  const login = (userData: User) => {
    const userWithAccountId = {
      ...userData,
      id: userData.account_id || userData.username,
      uuid: userData.uuid || userData.id,
    }
    setUser(userWithAccountId)
    localStorage.setItem("fantasy_user", JSON.stringify(userWithAccountId))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("fantasy_user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        refreshUser,
        isAuthenticated,
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
