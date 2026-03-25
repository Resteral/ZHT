"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export function AuthStatus() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()

  const handleRefresh = async () => {
    try {
      await refreshUser()
      toast.success("User data refreshed")
    } catch (error) {
      toast.error("Failed to refresh user data")
    }
  }

  const handleClearAuth = () => {
    localStorage.removeItem("fantasy_user")
    window.location.reload()
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading authentication...</span>
        </CardContent>
      </Card>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Not Authenticated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">You need to sign in to access all features.</p>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
          <Button onClick={handleClearAuth} variant="ghost" size="sm" className="w-full">
            Clear Auth Data
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Authenticated
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Username:</span>
            <span className="text-sm font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">ELO Rating:</span>
            <Badge variant="secondary">{user.elo_rating}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="text-sm font-medium text-green-600">${user.balance}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="flex-1 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={handleClearAuth} variant="ghost" size="sm" className="flex-1">
            Clear Auth
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
