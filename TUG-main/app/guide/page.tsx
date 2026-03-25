"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { PlayCircle, Target, Trophy, CheckCircle, Info, HelpCircle } from "lucide-react"

export default function GuidePage() {
    const router = useRouter()

    const steps = [
        {
            icon: PlayCircle,
            title: "1. Join an Arena",
            description: "Choose your stake tier ($5 - $100) and game format. You'll be matched with other players at the same stake level.",
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            icon: Target,
            title: "2. Draft Your Strategy",
            description: "Once a match is found, enter the Draft Room. Phase 1 is drafting your strategic lineup. Choose wisely—every pick matters.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            icon: Trophy,
            title: "3. Compete to Win",
            description: "Go head-to-head using your drafted team. The outcomes are determined strictly by player skill and strategic execution.",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            icon: CheckCircle,
            title: "4. Report Results",
            description: "After the match, visit the Score Room. All participants must report the outcome. Payouts are triggered once consensus is reached.",
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        }
    ]

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-12 min-h-screen pt-20">
            <header className="text-center space-y-4">
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent italic tracking-tighter">
                    HOW IT WORKS
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Master the arena. Follow these four simple steps to compete for platform-hosted prize pools.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                {steps.map((step, index) => (
                    <Card key={index} className="bg-background/40 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 group">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className={`p-4 rounded-2xl ${step.bg} group-hover:scale-110 transition-transform`}>
                                <step.icon className={`h-8 w-8 ${step.color}`} />
                            </div>
                            <CardTitle className="text-2xl font-bold">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-400 text-lg leading-relaxed">
                            {step.description}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Info className="h-6 w-6 text-blue-400" />
                        <CardTitle>Skill-Based Integrity</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-300">
                    <p>
                        TUG Arena is built on the principle of <strong>Skill-Based Competition</strong>. This means that luck is not a factor. Prize pools are fixed and hosted by the platform, ensuring a safe and transparent environment for competitive gaming.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Button variant="outline" onClick={() => router.push("/rules")}>Read Competitive Rules</Button>
                        <Button variant="outline" onClick={() => router.push("/terms")}>Terms of Service</Button>
                    </div>
                </CardContent>
            </Card>

            <footer className="text-center py-8">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-12 h-16 rounded-full font-bold shadow-lg shadow-primary/20" onClick={() => router.push("/")}>
                    Enter the Lobby
                </Button>
            </footer>
        </div>
    )
}
