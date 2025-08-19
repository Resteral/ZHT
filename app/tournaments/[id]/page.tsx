import { Suspense } from "react"
import { TournamentDetails } from "@/components/tournaments/tournament-details"
import { Skeleton } from "@/components/ui/skeleton"

interface TournamentPageProps {
  params: {
    id: string
  }
}

export default function TournamentPage({ params }: TournamentPageProps) {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TournamentDetails tournamentId={params.id} />
      </Suspense>
    </div>
  )
}
