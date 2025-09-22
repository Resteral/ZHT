"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"
import { TournamentParticipants } from "@/components/tournaments/tournament-participants"
import PermissionGuard from "@/components/auth/permission-guard"

interface TournamentParticipantsPageProps {
  params: {
    id: string
  }
}

export default function TournamentParticipantsPage({ params }: TournamentParticipantsPageProps) {
  const router = useRouter()

  return (
    <PermissionGuard tournamentId={params.id} requireTournamentCreator={true} requiredRole="organizer">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${params.id}/manage`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Management
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Manage Participants</h1>
                <p className="text-lg text-muted-foreground">Tournament Registration & Player Management</p>
              </div>
            </div>
            <p className="text-muted-foreground">
              Monitor registration progress, manage player entries, and track tournament participation
            </p>
          </div>
        </div>

        <TournamentParticipants tournamentId={params.id} />
      </div>
    </PermissionGuard>
  )
}
