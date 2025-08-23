"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Trophy, DollarSign, Gamepad2, Plus } from "lucide-react"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"

export default function DraftPage() {
  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mr-3">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">ELO Draft Matches</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-4">Choose your format and compete in skill-based drafts</p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <DollarSign className="h-4 w-4 mr-1" />
              $10-$50 Per Game
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              FREE Entry
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Plus className="h-6 w-6" />
                Create Lobby
              </CardTitle>
              <CardDescription className="text-center">Start a new draft lobby in any format</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <UnifiedDraftSelector buttonText="Create New Lobby" buttonSize="lg" className="w-full" mode="create" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Gamepad2 className="h-6 w-6" />
                Browse Lobbies
              </CardTitle>
              <CardDescription className="text-center">Join existing lobbies or view all formats</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <UnifiedDraftSelector buttonText="Browse All Formats" buttonSize="lg" className="w-full" mode="both" />
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              How ELO Draft Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create or Join</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new lobby or join existing ones with other players
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Draft Players</h3>
                <p className="text-sm text-muted-foreground">Take turns drafting players in snake draft format</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Earn Rewards</h3>
                <p className="text-sm text-muted-foreground">Earn $10-$50 for participating, plus ELO rating updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
