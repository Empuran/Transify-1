"use client"

import { useRouter } from "next/navigation"
import { CategorySelectionScreen, type OrgCategory } from "@/components/transify/category-selection"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function CategoryPage() {
    const router = useRouter()

    const handleContinue = (category: OrgCategory, orgCode: string) => {
        // Admin categories (school/corporate) → new admin login flow
        if (category === "school" || category === "corporate") {
            router.push(`/admin-login?category=${category}&orgCode=${encodeURIComponent(orgCode)}`)
        } else if (category === "driver" || category === "parent") {
            // Driver & Parent → go through login to establish session
            router.push(`/login?category=${category}&orgCode=${orgCode}`)
        } else {
            // Parent → existing phone-based login
            router.push(`/login?category=${category}&orgCode=${orgCode}`)
        }
    }

    return (
        <ErrorBoundary>
            <CategorySelectionScreen onContinue={handleContinue} />
        </ErrorBoundary>
    )
}
