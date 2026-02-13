"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { sendFriendRequest } from "@/app/actions/social-actions"

export function AddFriendDialog() {
    const [open, setOpen] = useState(false)
    const [username, setUsername] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim()) return

        setIsLoading(true)
        try {
            await sendFriendRequest(username)
            toast.success(`Friend request sent to ${username}`)
            setOpen(false)
            setUsername("")
        } catch (error: any) {
            toast.error(error.message || "Failed to send friend request")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                    <DialogDescription>
                        Enter the username of the player you want to add as a friend.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSendRequest}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                                Username
                            </Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="col-span-3"
                                placeholder="ImperialHal"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Request"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
