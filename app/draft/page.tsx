"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, Trophy, DollarSign, Gamepad2 } from "lucide-react"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"

const draftFormats = [
  {
    name: "1v1 Draft",
    description: "Head-to-head draft matches",
    players: "2 Players",
    duration: "15-20 minutes",
    reward: "$50 per game",
    href: "/draft/1v1",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    name: "2v2 Draft",
    description: "Team draft with 4 players",
    players: "4 Players",
    duration: "20-25 minutes",
    reward: "$50 per game",
    href: "/draft/2v2",
    icon: Users,
    color: "bg-green-500",
  },
  {
    name: "3v3 Draft",
    description: "Squad draft with 6 players",
    players: "6 Players",
    duration: "25-30 minutes",
    reward: "$50 per game",
    href: "/draft/3v3",
    icon: Users,
    color: "bg-purple-500",
  },
]

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
              $50 Per Game
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              FREE Entry
            </Badge>
          </div>
        </div>

        {/* Draft Formats Grid */}
        <div className="text-center mb-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Gamepad2 className="h-6 w-6" />
                Choose Your Format
              </CardTitle>
              <CardDescription>Select from 1v1 to 6v6 draft formats. All FREE with $50 rewards!</CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedDraftSelector buttonText="Browse All Formats" buttonSize="lg" className="w-full" />
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
                <h3 className="font-semibold mb-2">Join Lobby</h3>
                <p className="text-sm text-muted-foreground">
                  Select your format and join a draft lobby with other players
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
                <p className="text-sm text-muted-foreground">Earn $50 for participating, plus ELO rating updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
