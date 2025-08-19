"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Trophy, Swords, Crown, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const matchTypes = [
  {
    value: "fantasy_league",
    label: "Fantasy League",
    description: "Traditional fantasy league with weekly matchups and season-long competition",
    icon: Trophy,
    earning: "$100 per ELO game",
    features: ["Weekly matchups", "Season playoffs", "Draft system", "Prize pools"],
    nextStep: "/matches/create/fantasy-league",
  },
  {
    value: "wager_match",
    label: "Wager Match",
    description: "Direct 1v1 battles with custom wager amounts and instant payouts",
    icon: Swords,
    earning: "75% of pot to winner",
    features: ["Instant matches", "Custom wagers", "Quick payouts", "Skill-based"],
    nextStep: "/matches/create/wager-match",
  },
  {
    value: "captain_draft",
    label: "Captain Draft",
    description: "Snake draft system where captains build teams strategically",
    icon: Crown,
    earning: "$100 per ELO game",
    features: ["Snake draft", "Team captains", "Strategic picks", "Multiple formats"],
    nextStep: "/matches/create/captain-draft",
  },
  {
    value: "tournament",
    label: "Tournament",
    description: "Bracket-style elimination tournaments with multiple rounds",
    icon: Users,
    earning: "$25 participation + prizes",
    features: ["Bracket system", "Elimination rounds", "Large prize pools", "Spectator mode"],
    nextStep: "/matches/create/tournament",
  },
]

export default function CreateMatchPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const handleContinue = () => {
    const matchType = matchTypes.find((type) => type.value === selectedType)
    if (matchType) {
      router.push(matchType.nextStep)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Match</h1>
            <p className="text-muted-foreground">Choose your match type and start earning money</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              1
            </div>
            <span className="font-medium">Choose Type</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-muted flex items-center justify-center text-xs">2</div>
            <span>Configure</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-muted flex items-center justify-center text-xs">3</div>
            <span>Launch</span>
          </div>
        </div>

        {/* Match Type Selection */}
        <div className="grid gap-6 md:grid-cols-2">
          {matchTypes.map((type) => {
            const IconComponent = type.icon
            const isSelected = selectedType === type.value

            return (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedType(type.value)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.label}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {type.earning}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                  <CardDescription className="mt-2">{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Key Features:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {type.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-6">
          <Button onClick={handleContinue} disabled={!selectedType} size="lg" className="min-w-32">
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
