import { Suspense } from "react"
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

export default function TournamentPage({ params }: TournamentPageProps) {
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
