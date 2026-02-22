"use client"

import { useRouter } from "next/navigation"
import { CategorySelectionScreen, type OrgCategory } from "@/components/transify/category-selection"

export default function CategoryPage() {
    const router = useRouter()

    const handleContinue = (category: OrgCategory, orgCode: string) => {
        // Store category in session/cookie or pass via query param
        // For now, let's use query params for simplicity in this flow
        router.push(`/login?category=${category}&orgCode=${orgCode}`)
    }

    return <CategorySelectionScreen onContinue={handleContinue} />
}
