"use client"

import { SystemMonitoringDashboard } from "@/components/admin/system-monitoring-dashboard"
import PermissionGuard from "@/components/auth/permission-guard"

export default function AdminPage() {
    return (
        <PermissionGuard requiredRole="admin">
            <div className="container mx-auto py-10">
                <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
                <SystemMonitoringDashboard />
            </div>
        </PermissionGuard>
    )
}
