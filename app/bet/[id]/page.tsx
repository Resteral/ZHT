"use client"

import { useParams } from "next/navigation"
import { MOCK_ESPORTS_MATCHES } from "@/lib/mock-esports-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Calendar, User, Trophy } from "lucide-react"
import Link from "next/link"
import { ContestEntrySlip } from "@/components/betting/bet-slip"

export default function ContestDetailPage() {
    const params = useParams()
    const matchId = params.id as string
    const match = MOCK_ESPORTS_MATCHES.find((m) => m.id === matchId)

    if (!match) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold">Contest not found</h1>
                <Button asChild className="mt-4">
                    <Link href="/matches">Back to Contests</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Button variant="ghost" asChild className="mb-4 text-slate-400 hover:text-white">
                    <Link href="/matches">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Contests
                    </Link>
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Match Header */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className="mb-2 border-slate-700 text-slate-400">{match.gameTitle}</Badge>
                                        <CardTitle className="text-3xl font-bold flex items-center gap-4">
                                            <span>{match.homeTeam.name}</span>
                                            <span className="text-slate-500 text-xl">vs</span>
                                            <span>{match.awayTeam.name}</span>
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 mt-2 flex items-center gap-4">
                                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(match.scheduledTime).toLocaleString()}</span>
                                            <span className="flex items-center gap-1"><Trophy className="h-4 w-4" /> {match.league}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {match.status === 'live' && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                                            Entry: ${match.entryFee || 0}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                            Prize Pool: ${match.prizePool || 0}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Markets */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Contest Picks</h2>
                            {match.markets.map((market, idx) => (
                                <Card key={idx} className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-lg capitalize">{market.type === "moneyline" ? "Head to Head" : market.type}</CardTitle>
                                        <CardDescription>Select a winner</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button variant="outline" className="h-auto py-4 flex flex-col items-center bg-slate-950/50 border-slate-800 hover:bg-slate-800 hover:text-white">
                                                <span className="text-sm font-medium text-slate-400">{match.homeTeam.name}</span>
                                                <span className="text-xl font-bold mt-1 text-green-400">{market.homeOdds}</span>
                                            </Button>
                                            <Button variant="outline" className="h-auto py-4 flex flex-col items-center bg-slate-950/50 border-slate-800 hover:bg-slate-800 hover:text-white">
                                                <span className="text-sm font-medium text-slate-400">{match.awayTeam.name}</span>
                                                <span className="text-xl font-bold mt-1 text-green-400">{market.awayOdds}</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <ContestEntrySlip />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
