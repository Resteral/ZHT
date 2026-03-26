"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield, Eye, EyeOff } from "lucide-react"
import { updateSettings } from "@/lib/actions/profile"
import { toast } from "sonner"

export function PrivacySettings() {
    const [settings, setSettings] = useState({
        public_profile: true,
        show_elo: true
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

            if (profile?.settings?.privacy) {
                setSettings(profile.settings.privacy)
            }
        }
        loadSettings()
    }, [supabase])

    const handleToggle = async (key: string, value: boolean) => {
        const newPrivacy = { ...settings, [key]: value }
        setSettings(newPrivacy as any)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from("users")
            .select("settings")
            .eq("id", user.id)
            .single()

        const fullSettings = {
            ...(profile?.settings || {}),
            privacy: newPrivacy
        }

        const result = await updateSettings(fullSettings)
        if (result?.success) {
            toast.success("Privacy settings updated")
        } else {
            toast.error("Failed to update settings")
        }
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Privacy & Visibility
                </CardTitle>
                <CardDescription>
                    Control what information others can see on the platform.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="public-profile" className="text-sm font-medium">Public Profile</Label>
                        <p className="text-xs text-muted-foreground">Allow others to view your match history and stats.</p>
                    </div>
                    <Switch
                        id="public-profile"
                        checked={settings.public_profile}
                        onCheckedChange={(checked) => handleToggle("public_profile", checked)}
                    />
                </div>

                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="show-elo" className="text-sm font-medium">Show ELO Rating</Label>
                        <p className="text-xs text-muted-foreground">Display your skill rating on leaderboards and in lobbies.</p>
                    </div>
                    <Switch
                        id="show-elo"
                        checked={settings.show_elo}
                        onCheckedChange={(checked) => handleToggle("show_elo", checked)}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
