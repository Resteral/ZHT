"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Smartphone, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function SecuritySettings() {
    const supabase = createClient()

    const handlePasswordReset = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/settings/password-update`,
        })

        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Password reset email sent!")
        }
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Account Security
                </CardTitle>
                <CardDescription>
                    Manage your password and security verification methods.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        <div>
                            <p className="text-sm font-medium">Password Management</p>
                            <p className="text-xs text-muted-foreground">Receive a secure link to update your password.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePasswordReset}>
                        Reset Password
                    </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">Two-Factor Authentication</p>
                            <p className="text-xs text-muted-foreground text-red-400">Not enabled. Configuration required.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
