"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfile } from "@/lib/actions/profile"
import { Gamepad2 } from "lucide-react"
import { SteamIcon } from "@/components/icons/steam-icon"

export function ProfileSettings() {
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [steamId, setSteamId] = useState("")
    const [epicId, setEpicId] = useState("")
    const supabase = createClient()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from("users")
                .select("username, avatar_url, steam_id, epic_games_id")
                .eq("id", user.id)
                .single()

            if (profile) {
                setUsername(profile.username || "")
                setAvatarUrl(profile.avatar_url || "")
                setSteamId(profile.steam_id || "")
                setEpicId(profile.epic_games_id || "")
            }
        }
        loadProfile()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateProfile({
            username,
            avatar_url: avatarUrl,
            steam_id: steamId,
            epic_games_id: epicId
        })

        if (result?.success) {
            toast.success("Profile links updated!")
        } else {
            toast.error(result?.error || "Failed to update links")
        }
        setLoading(false)
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    Profile & Social Links
                </CardTitle>
                <CardDescription>
                    Customize your appearance and link game platform accounts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="Resteral"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-primary/5 border-primary/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar">Avatar URL</Label>
                            <Input
                                id="avatar"
                                placeholder="https://example.com/avatar.png"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="bg-primary/5 border-primary/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <SteamIcon className="w-4 h-4 text-[#171a21]" />
                            Steam Profile / ID
                        </Label>
                        <Input
                            placeholder="e.g. https://steamcommunity.com/id/resteral/"
                            value={steamId}
                            onChange={(e) => setSteamId(e.target.value)}
                            className="bg-primary/5 border-primary/10"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Helpful for opponents to find and add you for Steam matches.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-[#FFFFFF]">
                            <span className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                                <span className="text-black text-[10px] font-bold">E</span>
                            </span>
                            Epic Games Display Name
                        </Label>
                        <Input
                            placeholder="e.g. Resteral"
                            value={epicId}
                            onChange={(e) => setEpicId(e.target.value)}
                            className="bg-primary/5 border-primary/10"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Your display name used in Epic Games titles (Fortnite, etc.)
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Profile Changes"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
