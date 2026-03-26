"use client"

import { AdminDashboard } from "@/components/transify/admin-dashboard"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function AdminDashboardPage() {
    return (
        <ErrorBoundary>
            <AdminDashboard />
        </ErrorBoundary>
    )
}
