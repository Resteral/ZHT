"use client"

import { ContestDashboard } from "@/components/contests/contest-dashboard"
import { UserInitializer } from "@/components/auth/user-initializer"
// import { useAuth } from "@/lib/auth-context"

export default function Dashboard() {
  // const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <main className="container mx-auto px-4 py-8">
        <UserInitializer />
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">Esports Contests</h1>
          </div>
          <ContestDashboard />
        </div>
      </main>
    </div>
  )
}
