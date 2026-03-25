"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ShieldCheck, Scale, AlertOctagon } from "lucide-react"

export default function RulesPage() {
    const router = useRouter()

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            <header>
                <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">← Back to Lobby</Button>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Arena Rules & Anti-Cheat
                </h1>
                <p className="text-muted-foreground mt-2">Ensuring fair and competitive play for everyone.</p>
            </header>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-400" />
                        <CardTitle className="text-blue-400">Fair Play</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        Respect your opponents. Collusion or match-fixing will result in an immediate permanent ban.
                    </CardContent>
                </Card>

                <Card className="bg-green-500/10 border-green-500/30">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-400" />
                        <CardTitle className="text-green-400">Anti-Cheat</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        Use of third-party software to gain an advantage is strictly prohibited. We use heuristic analysis to detect anomalies.
                    </CardContent>
                </Card>

                <Card className="bg-red-500/10 border-red-500/30">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <AlertOctagon className="h-5 w-5 text-red-400" />
                        <CardTitle className="text-red-400">Banning Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        Violators will have their balances frozen and accounts terminated without recourse.
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>Consensus Reporting & Disputes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        To ensure integrity, all participants must report the match outcome. False reporting is a violation of our terms.
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Standard Reporting:</strong> Winners must report within 30 minutes of match completion.</li>
                        <li><strong>Conflict Resolution:</strong> If reports conflict, the match is moved to "Disputed" status.</li>
                        <li><strong>Evidence Submission:</strong> In case of a dispute, players must provide valid proof (video replays or full-room screenshots) via the support center or Discord within 24 hours.</li>
                        <li><strong>Admin Ruling:</strong> Platform administrators have final authority on all match outcomes based on provided evidence.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>Match Abandonment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        Leaving a match in progress or failing to join the game server within the allotted time will result in a technical forfeit. Repeated abandonment will lead to account restrictions.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
