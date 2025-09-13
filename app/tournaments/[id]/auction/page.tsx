import { Suspense } from "react"
import TournamentAuctionRoom from "@/components/tournaments/tournament-auction-room"

interface AuctionPageProps {
  params: {
    id: string
  }
}

export default function AuctionPage({ params }: AuctionPageProps) {
  // TODO: Get current user ID from auth
  const currentUserId = "944b281e-89d5-46f7-b10b-2439f275e179" // Mock user ID
  const isOwner = true // TODO: Check if user is tournament owner

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <TournamentAuctionRoom tournamentId={params.id} currentUserId={currentUserId} isOwner={isOwner} />
    </Suspense>
  )
}
