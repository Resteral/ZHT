"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TermsPage() {
    const router = useRouter()

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            <header>
                <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">← Back to Lobby</Button>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Terms of Service
                </h1>
                <p className="text-muted-foreground mt-2">Last Updated: March 8, 2024</p>
            </header>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>1. Skill-Based Competition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        TUG Arena is a platform for skill-based competition. By participating, you acknowledge that all outcomes are determined strictly by the physical and mental skill of the participants, including but not limited to reaction time, strategic planning, and game knowledge.
                    </p>
                    <p>
                        This platform is **not a gambling website**. We do not host games of chance. All prize pools are platform-hosted and fixed before the start of any competition. Participation is predicated on the user's ability to demonstrate superior skill.
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>2. Eligibility & Jurisdictional Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        Participants must be at least **18 years of age** to enter paid arenas. Users are responsible for ensuring that participation in skill-based contests is legal in their primary jurisdiction.
                    </p>
                    <p>
                        TUG Arena does not offer paid competitions in jurisdictions where skill-based gaming with entry fees is restricted. By accessing the site, you represent that you are not in a restricted territory.
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>3. Prize Distribution & Fees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        Prizes are distributed based on match results as reported by participants and verified by platform systems. In matches requiring consensus reporting, payouts will only occur once all participants have confirmed the outcome.
                    </p>
                    <p>
                        TUG Arena collects a platform fee from each entry fee to facilitate match hosting, dispute resolution, and platform maintenance. This fee is clearly displayed before any arena entry.
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-background/50 border-2">
                <CardHeader>
                    <CardTitle>4. Anti-Cheat & Integrity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        Any attempt to manipulate match outcomes through third-party software, collusion, or exploitation of game bugs is a violation of these terms. TUG Arena reserves the right to freeze balances and terminate accounts of any user suspected of compromising platform integrity.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
