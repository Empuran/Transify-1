"use client"

import DriverDashboard from "@/components/transify/driver-dashboard"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function DriverDashboardPage() {
    return (
        <ErrorBoundary>
            <DriverDashboard />
        </ErrorBoundary>
    )
}
