"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Users, UserCheck, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SignupRecord {
  id: string
  username: string
  account_id: string
  created_at: string
  status: "active" | "pending" | "rejected"
  balance: number
  last_active?: string
}

export default function SignupManagement() {
  const [signups, setSignups] = useState<SignupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadSignups()
  }, [])

  const loadSignups = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error

      const transformedData: SignupRecord[] = (data || []).map((user) => ({
        id: user.id,
        username: user.username || "Unknown",
        account_id: user.account_id || "N/A",
        created_at: user.created_at,
        status: "active", // Default status since we removed validation
        balance: user.balance || 25,
        last_active: user.last_active,
      }))

      setSignups(transformedData)
    } catch (error) {
      console.error("Error loading signups:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSignups = signups.filter(
    (signup) =>
      signup.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signup.account_id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "pending":
        return "secondary"
      case "rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  const totalSignups = signups.length
  const recentSignups = signups.filter(
    (s) => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length
  const activeUsers = signups.filter((s) => s.status === "active").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Signup Management</h1>
          <p className="text-muted-foreground">Track and manage all user registrations</p>
        </div>
        <Button onClick={loadSignups} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignups}</div>
            <p className="text-xs text-muted-foreground">All time registrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentSignups}</div>
            <p className="text-xs text-muted-foreground">New signups this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">No signup restrictions</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or account ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signups Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Signups</CardTitle>
          <CardDescription>{filteredSignups.length} signups shown</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading signups...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Details</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          {signup.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{signup.username}</div>
                          <div className="text-sm text-muted-foreground">ID: {signup.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{signup.account_id || "Not provided"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(signup.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(signup.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${signup.balance.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(signup.status)}>{signup.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {signup.last_active ? new Date(signup.last_active).toLocaleDateString() : "Never"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signup Activity</CardTitle>
          <CardDescription>Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {signups.slice(0, 5).map((signup) => (
              <div key={signup.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {signup.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{signup.username}</p>
                    <p className="text-sm text-muted-foreground">Account ID: {signup.account_id || "Not provided"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{new Date(signup.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">Started with ${signup.balance.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
