"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Search, DollarSign, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface User {
  id: string
  username: string
  display_name?: string
}

export function SendMoneyDialog() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { user } = useAuth()
  const supabase = createClient()

  const searchUsers = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name")
        .or(`username.ilike.%${searchQuery}%`)
        .neq("id", user?.id) // Exclude current user
        .limit(5)

      if (error) throw error
      setSearchResults(data || [])
    } catch (err) {
      console.error("[v0] Error searching users:", err)
      setError("Failed to search users")
    } finally {
      setLoading(false)
    }
  }

  const sendMoney = async () => {
    if (!selectedUser || !amount || !user) return

    const amountNum = Number.parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Check sender's balance
      const { data: senderWallet } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single()

      if (!senderWallet || senderWallet.balance < amountNum) {
        setError("Insufficient balance")
        return
      }

      // Create transaction using RPC function
      const { error: transactionError } = await supabase.rpc("send_money_transaction", {
        sender_id: user.id,
        recipient_id: selectedUser.id,
        amount: amountNum,
        description: message || `Money sent to ${selectedUser.username}`,
      })

      if (transactionError) throw transactionError

      setSuccess(`Successfully sent $${amountNum.toFixed(2)} to ${selectedUser.username}`)

      // Reset form
      setSelectedUser(null)
      setAmount("")
      setMessage("")
      setSearchQuery("")
      setSearchResults([])

      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false)
        setSuccess("")
      }, 2000)
    } catch (err) {
      console.error("[v0] Error sending money:", err)
      setError("Failed to send money. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Send className="h-4 w-4" />
          Send Money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Send Money
          </DialogTitle>
          <DialogDescription>Send money to another user on the platform</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!selectedUser ? (
            <div className="space-y-3">
              <Label>Search for user</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={loading} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUser(searchUser)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/placeholder-32px.png?height=32&width=32`} />
                        <AvatarFallback className="text-xs">
                          {searchUser.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{searchUser.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`/generic-placeholder-graphic.png?height=40&width=40`} />
                  <AvatarFallback>{selectedUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.username}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Input
                  id="message"
                  placeholder="What's this for?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={sendMoney} disabled={loading || !amount} className="flex-1">
                  {loading ? "Sending..." : `Send $${amount || "0.00"}`}
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)} className="bg-transparent">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
