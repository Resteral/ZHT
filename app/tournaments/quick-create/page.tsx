import { QuickTournamentCreator } from "@/components/tournaments/quick-tournament-creator"

export default function QuickCreatePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Quick Tournament Access</h1>
          <p className="text-muted-foreground mt-2">
            Create a tournament instantly and join it right away. Perfect for getting started!
          </p>
        </div>

        <QuickTournamentCreator />
      </div>
    </div>
  )
}
