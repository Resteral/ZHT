import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-12 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Information We Collect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        We collect information you provide directly to us, such as when you create an account, deposit funds, or contact support.
                        This may include your name, email address, date of birth, and payment information.
                    </p>
                    <p>
                        We also automatically collect certain information about your device and usage of the Service, such as your IP address, browser type,
                        and game performance data associated with your linked gaming accounts.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. How We Use Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>To provide, maintain, and improve the Service.</li>
                        <li>To process transactions and send you related information.</li>
                        <li>To verify your identity and prevent fraud or illegal activities (KYC/AML compliance).</li>
                        <li>To monitor and analyze trends, usage, and activities in connection with the Service.</li>
                        <li>To facilitate skill-based matchmaking and leaderboard rankings.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>3. Data Retention & Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        We employ industry-standard security measures to protect your personal information. We retain your data only for as long as is necessary
                        for the purposes set out in this Privacy Policy and to comply with our legal obligations.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>4. Cookies</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        We use cookies and similar tracking technologies to track the activity on our Service and hold certain information.
                        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>5. Contact Us</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at support@tugesports.com.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
