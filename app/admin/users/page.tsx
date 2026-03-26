"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import PermissionGuard from "@/components/auth/permission-guard"
import { Search, Shield, User, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false })

        if (data) setUsers(data)
        setLoading(false)
    }

    const toggleAdmin = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "admin" ? "user" : "admin"
        const { error } = await supabase
            .from("users")
            .update({ role: newRole })
            .eq("id", userId)

        if (!error) {
            toast.success(`User updated to ${newRole}`)
            loadUsers()
        } else {
            toast.error("Failed to update user role")
        }
    }

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <PermissionGuard requiredRole="admin">
            <div className="container mx-auto py-10 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">User Management</h1>
                    <p className="text-muted-foreground">Manage user roles and platform access.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by username or email..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={loadUsers}>Refresh</Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Platform Users</CardTitle>
                        <CardDescription>A list of all users registered on TUG Arena.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Account ID</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>ELO</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">Loading users...</TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">No users found.</TableCell>
                                    </TableRow>
                                ) : filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{user.username}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{user.account_id}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                                {user.role || "user"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-green-400">${user.balance?.toFixed(2)}</TableCell>
                                        <TableCell className="font-mono">{user.elo_rating}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleAdmin(user.id, user.role || "user")}
                                            >
                                                <Shield className={`h-4 w-4 mr-2 ${user.role === "admin" ? "text-yellow-500" : ""}`} />
                                                {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    )
}
