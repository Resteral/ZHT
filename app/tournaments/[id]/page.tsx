"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TournamentDetails } from "@/components/tournaments/tournament-details"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, ArrowLeft } from "lucide-react"

interface TournamentPageProps {
  params: {
    id: string
  }
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function TournamentPage({ params }: TournamentPageProps) {
  const router = useRouter()

  useEffect(() => {
    if (!isValidUUID(params.id)) {
      router.push("/tournaments")
    }
  }, [params.id, router])

  if (!isValidUUID(params.id)) {
    return null
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/tournaments/${params.id}/stats`}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Statistics
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TournamentDetails tournamentId={params.id} />
      </Suspense>
    </div>
  )
}
