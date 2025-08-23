"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TournamentStats } from "@/components/tournaments/tournament-stats"
import { Skeleton } from "@/components/ui/skeleton"

interface TournamentStatsPageProps {
  params: {
    id: string
  }
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function TournamentStatsPage({ params }: TournamentStatsPageProps) {
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
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TournamentStats tournamentId={params.id} />
      </Suspense>
    </div>
  )
}
