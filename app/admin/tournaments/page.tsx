"use client"

import { AuctionSchedulerDashboard } from "@/components/admin/auction-scheduler-dashboard"
import PermissionGuard from "@/components/auth/permission-guard"

export default function AdminTournamentsPage() {
    return (
        <PermissionGuard requiredRole="admin">
            <div className="container mx-auto py-10">
                <h1 className="text-4xl font-bold mb-8">Tournament Management</h1>
                <AuctionSchedulerDashboard />
            </div>
        </PermissionGuard>
    )
}
