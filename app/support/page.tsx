"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    HelpCircle,
    Mail,
    MessageSquare,
    ShieldAlert,
    CreditCard,
    Gamepad2,
    ChevronDown
} from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function SupportPage() {
    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-12 pb-20">
            <header className="text-center pt-10">
                <h1 className="text-4xl font-black tracking-tight mb-4">SUPPORT CENTER</h1>
                <p className="text-muted-foreground text-lg">How can we help you stay in the game?</p>
            </header>

            <div className="grid sm:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20 text-center hover:bg-primary/10 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                        <Mail className="w-8 h-8 mx-auto mb-4 text-primary" />
                        <h3 className="font-bold mb-1">Email Us</h3>
                        <p className="text-xs text-muted-foreground">support@tugarena.com</p>
                    </CardContent>
                </Card>
                <a href="https://discord.gg/TBV2XxmUkc" target="_blank" rel="noopener noreferrer">
                    <Card className="bg-[#5865F2]/10 border-[#5865F2]/20 text-center hover:bg-[#5865F2]/20 transition-colors h-full">
                        <CardContent className="pt-6">
                            <MessageSquare className="w-8 h-8 mx-auto mb-4 text-[#5865F2]" />
                            <h3 className="font-bold mb-1">Discord Support</h3>
                            <p className="text-xs text-muted-foreground">Get live help from mods</p>
                        </CardContent>
                    </Card>
                </a>
                <Card className="bg-green-500/5 border-green-500/20 text-center hover:bg-green-500/10 transition-colors">
                    <CardContent className="pt-6">
                        <ShieldAlert className="w-8 h-8 mx-auto mb-4 text-green-500" />
                        <h3 className="font-bold mb-1">Report Abuse</h3>
                        <p className="text-xs text-muted-foreground">Keep the arena fair</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <HelpCircle className="w-6 h-6 text-primary" />
                    Frequently Asked Questions
                </h2>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="item-1" className="border border-white/10 rounded-xl px-4 bg-black/20">
                        <AccordionTrigger className="hover:no-underline font-bold text-left">Is TUG Arena gambling?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            No. TUG Arena is a 100% skill-based competition platform. Outcomes are determined strictly by player performance and strategic decisions. We do not host games of chance.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" className="border border-white/10 rounded-xl px-4 bg-black/20">
                        <AccordionTrigger className="hover:no-underline font-bold text-left">How do payouts work?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Payouts are triggered automatically once all match participants report consistent results in the score room. If there is a dispute, a moderator reviews the evidence to determine the winner.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" className="border border-white/10 rounded-xl px-4 bg-black/20">
                        <AccordionTrigger className="hover:no-underline font-bold text-left">What are the platform fees?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            TUG Arena takes a fixed platform fee (typically 20% total) to cover server costs, hosting, and prize pool management. For a $5 entry, $1 goes to the platform and $4 goes into the prize pool.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4" className="border border-white/10 rounded-xl px-4 bg-black/20">
                        <AccordionTrigger className="hover:no-underline font-bold text-left">I'm having trouble linking my account.</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Ensure your profile is set to "Public" on Steam or Epic Games so our system can verify your ID. If you still face issues, contact us on Discord with your platform ID.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <Card className="bg-red-500/5 border-red-500/10">
                <CardHeader>
                    <CardTitle className="text-lg">Need to speak to a human?</CardTitle>
                    <CardDescription>Our average response time is under 12 hours.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" asChild>
                        <a href="mailto:support@tugarena.com">Open Support Ticket</a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
