"use client"

import { Suspense } from "react"
import { useAuth } from "@/lib/auth-context"
import TournamentAuctionRoom from "@/components/tournaments/tournament-auction-room"

interface AuctionPageProps {
  params: {
    id: string
  }
}

export default function AuctionPage({ params }: AuctionPageProps) {
  const { user } = useAuth()

  const currentUserId = user?.id || ""
  const isOwner = user?.username === "Resteral" // TODO: Check if user is tournament owner/creator

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access the auction room.</p>
        </div>
      </div>
    )
  }

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
