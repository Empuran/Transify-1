"use client"

import { useRouter } from "next/navigation"
import { CategorySelectionScreen, type OrgCategory } from "@/components/transify/category-selection"

export default function CategoryPage() {
    const router = useRouter()

    const handleContinue = (category: OrgCategory, orgCode: string) => {
        // Admin categories (school/corporate) → new admin login flow
        if (category === "school" || category === "corporate") {
            router.push(`/admin-login?category=${category}`)
        } else {
            // Parent/Driver → existing phone-based login
            router.push(`/login?category=${category}&orgCode=${orgCode}`)
        }
    }

    return <CategorySelectionScreen onContinue={handleContinue} />
}
