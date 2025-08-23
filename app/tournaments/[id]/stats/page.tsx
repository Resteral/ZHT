import { Suspense } from "react"
import { TournamentStats } from "@/components/tournaments/tournament-stats"
import { Skeleton } from "@/components/ui/skeleton"

interface TournamentStatsPageProps {
  params: {
    id: string
  }
}

export default function TournamentStatsPage({ params }: TournamentStatsPageProps) {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TournamentStats tournamentId={params.id} />
      </Suspense>
    </div>
  )
}
