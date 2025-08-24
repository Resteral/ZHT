"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Zap } from "lucide-react"
import Link from "next/link"

export default function AdminCreateTournamentPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/tournaments/create")
  }, [router])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Tournament Creation</h1>
          <p className="text-muted-foreground">Redirecting to unified tournament creation...</p>
        </div>
        <Link href="/admin/tournaments">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Redirecting...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">
              Taking you to the main tournament creation page with admin privileges...
            </p>
            <Button onClick={() => router.push("/tournaments/create")}>Go to Tournament Creation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
