import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
    return (
        <div className="container mx-auto py-12 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
                <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Acceptance of Terms</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        By accessing or using the TUG E-Sports Lobbies platform ("Service"), you agree to be bound by these Terms of Service.
                        If you disagree with any part of the terms, then you may not access the Service.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Eligibility & Skill-Based Gaming</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        You must be at least 18 years of age to use this Service. By using the Service, you represent and warrant that you meet this age requirement.
                    </p>
                    <p className="font-medium text-amber-600">
                        This Service offers skill-based competitions, not gambling.
                    </p>
                    <p>
                        Outcomes are based on the skill, strategy, and performance of participants in the underlying video games (e.g., Omega Strikers, Deadlock),
                        not on chance. You acknowledge that your success depends on your abilities relative to other players.
                    </p>
                    <p>
                        Participation in cash-prize tournaments is void where prohibited by law. You are responsible for ensuring that your participation is legal in your jurisdiction.
                        Restricted jurisdictions may include, but are not limited to: Arizona, Arkansas, Delaware, Louisiana, Maryland, Montana, South Carolina, South Dakota, and Tennessee.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>3. User Accounts & Funds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
                    </p>
                    <p>
                        We adhere to strict Know Your Customer (KYC) and Anti-Money Laundering (AML) standards. We reserve the right to request identity verification
                        before processing withdrawals.
                    </p>
                    <p>
                        Deposited funds are used for entry fees into skill-based contests. Unused funds may be withdrawn subject to our withdrawal policy and verification procedures.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>4. Code of Conduct</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        Users agree to play fairly and respect other players. Cheating, use of unauthorized third-party software (aimbots, wallhacks),
                        collusion, or match-fixing is strictly prohibited and will result in immediate account termination and forfeiture of funds.
                    </p>
                    <p>
                        We reserve the right to disqualify any participant who violates these rules or compromises the integrity of the competition.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>5. Limitation of Liability</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        In no event shall TUG E-Sports Lobbies, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental,
                        special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses,
                        resulting from your access to or use of or inability to access or use the Service.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
