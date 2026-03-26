"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowUpRight, ArrowDownLeft, DollarSign, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface Transaction {
  id: string
  amount: number
  transaction_type: string
  description: string
  created_at: string
  status: string
  other_user?: {
    username: string
    display_name?: string
  }
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          amount,
          transaction_type,
          description,
          created_at,
          status,
          metadata
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error

      // Process transactions to include other user info from metadata
      const processedTransactions =
        data?.map((transaction) => ({
          ...transaction,
          other_user: transaction.metadata?.other_user || null,
        })) || []

      setTransactions(processedTransactions)
    } catch (error) {
      console.error("[v0] Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case "receive":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "send":
      case "withdrawal":
        return "text-red-500"
      case "receive":
      case "deposit":
        return "text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Loading your recent transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>Your recent money transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0">{getTransactionIcon(transaction.transaction_type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{transaction.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type === "send" || transaction.transaction_type === "withdrawal"
                          ? "-"
                          : "+"}
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                      <Badge variant={transaction.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {transaction.other_user && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={`/placeholder_icon.png?height=16&width=16`} />
                          <AvatarFallback className="text-xs">
                            {transaction.other_user.username.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{transaction.other_user.username}</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()} at{" "}
                      {new Date(transaction.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
