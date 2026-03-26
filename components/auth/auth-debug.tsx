"use client"

import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const runDiagnostics = async () => {
    setChecking(true)
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      localStorage: null,
      authContext: null,
      databaseUser: null,
      supabaseConfig: null,
    }

    try {
      const supabase = createClient()

      // Check localStorage
      const storedUser = localStorage.getItem("fantasy_user")
      diagnostics.localStorage = storedUser ? JSON.parse(storedUser) : null

      // Check auth context
      diagnostics.authContext = {
        user: user,
        isAuthenticated: isAuthenticated,
        isLoading: isLoading,
      }

      // Check database user
      if (user?.id) {
        const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single()

        diagnostics.databaseUser = { data, error: error?.message }
      }

      // Check Supabase configuration
      diagnostics.supabaseConfig = {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      }
    } catch (error) {
      diagnostics.error = error instanceof Error ? error.message : String(error)
    }

    setDebugInfo(diagnostics)
    setChecking(false)
  }

  const clearAuth = () => {
    localStorage.removeItem("fantasy_user")
    window.location.reload()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={checking}>
            {checking ? "Checking..." : "Run Diagnostics"}
          </Button>
          <Button onClick={clearAuth} variant="outline">
            Clear Auth & Reload
          </Button>
        </div>

        {debugInfo && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <pre className="text-sm overflow-auto max-h-96">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        <div className="text-sm space-y-2">
          <p>
            <strong>Current Status:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Authenticated: {isAuthenticated ? "✅ Yes" : "❌ No"}</li>
            <li>Loading: {isLoading ? "⏳ Yes" : "✅ No"}</li>
            <li>User ID: {user?.id || "None"}</li>
            <li>Username: {user?.username || "None"}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
