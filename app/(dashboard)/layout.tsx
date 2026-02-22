"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, loading, currentRole } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/category")
            } else if (profile && !currentRole) {
                // Logged in but no role selected/assigned for current org
                router.push("/category")
            } else if (currentRole) {
                // Ensure they are on the right dashboard for their role
                const rolePath = `/${currentRole === 'guardian' ? 'parent' : currentRole}`
                if (!pathname.startsWith(rolePath)) {
                    router.push(rolePath)
                }
            }
        }
    }, [user, profile, loading, currentRole, router, pathname])

    if (loading || !user || !currentRole) {
        return (
            <div className="flex h-dvh items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="mx-auto min-h-dvh max-w-md bg-background shadow-xl ring-1 ring-border/50">
            {children}
        </div>
    )
}
