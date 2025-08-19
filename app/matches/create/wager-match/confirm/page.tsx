"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Swords, DollarSign, Users, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function ConfirmWagerMatchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const data = searchParams.get("data")
    if (data) {
      try {
        setFormData(JSON.parse(decodeURIComponent(data)))
      } catch (error) {
        console.error("Error parsing form data:", error)
        router.push("/matches/create")
      }
    }
  }, [searchParams, router])

  const handleCreateMatch = async () => {
    setLoading(true)
    try {
      console.log("Creating wager match:", formData)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      router.push("/matches/create/success?type=wager")
    } catch (error) {
      console.error("Error creating match:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!formData) {
    return <div>Loading...</div>
  }

  const actualWager = formData.customWager ? Number.parseFloat(formData.customWager) : formData.wagerAmount
  const winnerPayout = actualWager * 0.75

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/matches/create/wager-match">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Check className="h-8 w-8 text-green-500" />
              Review & Launch
            </h1>
            <p className="text-muted-foreground">Confirm your wager match details</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
              ✓
            </div>
            <span>Choose Type</span>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
              ✓
            </div>
            <span>Configure</span>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              3
            </div>
            <span className="font-medium">Launch</span>
          </div>
        </div>

        {/* Match Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-6 w-6 text-red-500" />
              {formData.name}
            </CardTitle>
            <CardDescription>Wager Match Summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Game</div>
                <div className="font-medium">{formData.game}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Match Type</div>
                <Badge variant="secondary">1v1 Wager Match</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Wager Amount</div>
                <div className="font-bold text-lg">${actualWager.toFixed(2)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Winner Payout</div>
                <div className="font-bold text-lg text-green-500">${winnerPayout.toFixed(2)}</div>
              </div>
            </div>

            {formData.description && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="text-sm bg-muted p-3 rounded-lg">{formData.description}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card>
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium">Match Goes Live</div>
                  <div className="text-sm text-muted-foreground">
                    Your match will be visible to other players immediately
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <div className="font-medium">Wait for Opponent</div>
                  <div className="text-sm text-muted-foreground">Another player will join and the match will begin</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="font-medium">Winner Takes 75%</div>
                  <div className="text-sm text-muted-foreground">
                    Winner receives ${winnerPayout.toFixed(2)} instantly
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launch Button */}
        <div className="flex justify-between pt-6">
          <Link href="/matches/create/wager-match">
            <Button variant="outline">Back to Edit</Button>
          </Link>
          <Button onClick={handleCreateMatch} disabled={loading} size="lg">
            {loading ? "Creating Match..." : "Launch Wager Match"}
          </Button>
        </div>
      </div>
    </div>
  )
}
