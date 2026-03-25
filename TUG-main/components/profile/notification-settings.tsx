"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, Info } from "lucide-react"
import { updateSettings } from "@/lib/actions/profile"
import { toast } from "sonner"

export function NotificationSettings() {
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState({
        match_starts: true,
        match_results: true,
        platform_news: false
    })
    const supabase = createClient()

    useEffect(() => {
        async function loadSettings() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from("users")
                .select("settings")
                .eq("id", user.id)
                .single()

            if (profile?.settings?.notifications) {
                setSettings(profile.settings.notifications)
            }
        }
        loadSettings()
    }, [supabase])

    const handleToggle = async (key: string, value: boolean) => {
        const newNotifications = { ...settings, [key]: value }
        setSettings(newNotifications as any)

        // We need the full settings object to update
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from("users")
            .select("settings")
            .eq("id", user.id)
            .single()

        const fullSettings = {
            ...(profile?.settings || {}),
            notifications: newNotifications
        }

        const result = await updateSettings(fullSettings)
        if (result?.success) {
            toast.success("Notification preferences updated")
        } else {
            toast.error("Failed to update preferences")
        }
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Notification Preferences
                </CardTitle>
                <CardDescription>
                    Choose how you want to be notified about Arena activity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="match-starts" className="text-sm font-medium">Match Starts</Label>
                        <p className="text-xs text-muted-foreground">Receive an alert when your arena match is ready.</p>
                    </div>
                    <Switch
                        id="match-starts"
                        checked={settings.match_starts}
                        onCheckedChange={(checked) => handleToggle("match_starts", checked)}
                    />
                </div>

                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="match-results" className="text-sm font-medium">Match Results</Label>
                        <p className="text-xs text-muted-foreground">Get notified when match results are confirmed and payouts processed.</p>
                    </div>
                    <Switch
                        id="match-results"
                        checked={settings.match_results}
                        onCheckedChange={(checked) => handleToggle("match_results", checked)}
                    />
                </div>

                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="platform-news" className="text-sm font-medium">Platform News</Label>
                        <p className="text-xs text-muted-foreground">Stay updated with new features, games, and big tournaments.</p>
                    </div>
                    <Switch
                        id="platform-news"
                        checked={settings.platform_news}
                        onCheckedChange={(checked) => handleToggle("platform_news", checked)}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
