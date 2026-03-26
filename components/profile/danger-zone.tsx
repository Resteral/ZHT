"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function DangerZone() {
    const handleDeleteAccount = () => {
        toast.info("Account deletion requires support ticket for platform verification.")
        window.open("mailto:support@tugarena.com?subject=Account Deletion Request", "_blank")
    }

    return (
        <Card className="border-red-900/50 bg-red-950/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    Irreversible actions that affect your entire account data and balance.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <div>
                        <p className="text-sm font-medium text-red-200">Delete Account</p>
                        <p className="text-xs text-red-400/70">Permanently remove your profile and history. Any remaining balance will be forfeited.</p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black border-red-900/50">
                            <DialogHeader>
                                <DialogTitle className="text-red-500">Are you absolutely sure?</DialogTitle>
                                <DialogDescription className="text-red-200/70 text-sm">
                                    This action cannot be undone. This will permanently delete your account
                                    and remove your data from our servers.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { }}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteAccount}>Confirm Deletion</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
