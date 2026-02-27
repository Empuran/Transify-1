"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { LoginScreen, type UserRole } from "@/components/transify/login-screen"
import { Suspense } from "react"
import { useAuth } from "@/hooks/use-auth"

function LoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { loginMock } = useAuth()

    const category = searchParams.get("category") as any
    const _orgCode = searchParams.get("orgCode")

    const roleMap: Record<string, UserRole> = {
        school: "admin",
        corporate: "admin",
        parent: "parent",
        driver: "driver",
    }

    const assignedRole = roleMap[category] || "parent"

    const handleLogin = (role: UserRole) => {
        // Update auth state so layout allows access
        loginMock(role === "parent" ? "guardian" : (role as any), category)

        // Redirect to dashboard
        const rolePath = role === "parent" ? "/parent" : `/${role}`
        router.push(rolePath)
    }

    return <LoginScreen onLogin={handleLogin} assignedRole={assignedRole} orgCategory={category} />
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-dvh items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
