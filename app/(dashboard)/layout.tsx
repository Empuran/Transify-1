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

    // Admin gets its own full-width desktop layout (see admin/layout.tsx)
    if (pathname.startsWith("/admin")) {
        return <>{children}</>
    }

    // Parent & Driver: centered mobile phone frame
    return (
        <div className="min-h-dvh bg-slate-900 flex items-center justify-center md:p-6">
            {/* Phone frame — visible only on desktop */}
            <div className="relative w-full md:w-[390px] md:h-[844px] md:rounded-[48px] md:overflow-hidden md:shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] bg-background">
                {/* Notch (desktop only) */}
                <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 rounded-b-3xl z-50 items-center justify-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                    <div className="h-2 w-16 rounded-full bg-slate-800" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                </div>

                {/* Status bar (desktop only) */}
                <div className="hidden md:flex absolute top-2 left-6 right-6 z-40 items-center justify-between px-2">
                    <span className="text-[10px] font-semibold text-white/60">9:41</span>
                    <div className="flex items-center gap-1">
                        <svg className="h-2.5 w-3" viewBox="0 0 12 10" fill="currentColor" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <rect x="0" y="4" width="2" height="6" rx="0.5" />
                            <rect x="3" y="2.5" width="2" height="7.5" rx="0.5" />
                            <rect x="6" y="1" width="2" height="9" rx="0.5" />
                            <rect x="9" y="0" width="2" height="10" rx="0.5" />
                        </svg>
                        <svg className="h-2.5 w-3.5" viewBox="0 0 14 10" fill="currentColor" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <path d="M7 2.5C9.2 2.5 11.1 3.6 12.4 5.2L13.7 3.7C12 1.8 9.6 0.5 7 0.5C4.4 0.5 2 1.8 0.3 3.7L1.6 5.2C2.9 3.6 4.8 2.5 7 2.5Z" />
                            <path d="M7 5.5C8.4 5.5 9.6 6.2 10.4 7.3L11.7 5.8C10.5 4.4 8.9 3.5 7 3.5C5.1 3.5 3.5 4.4 2.3 5.8L3.6 7.3C4.4 6.2 5.6 5.5 7 5.5Z" />
                            <circle cx="7" cy="9" r="1.5" />
                        </svg>
                        <div className="flex h-2.5 w-6 items-center gap-0.5">
                            <div className="flex h-2.5 flex-1 items-center rounded-sm border border-white/40 p-px">
                                <div className="h-full w-4/5 rounded-[1px] bg-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable app content */}
                <div className="h-full w-full md:overflow-y-auto md:pt-8 md:pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                    {children}
                </div>

                {/* Home indicator (desktop) */}
                <div className="hidden md:flex absolute bottom-2 left-0 right-0 justify-center">
                    <div className="h-1 w-28 rounded-full bg-white/20" />
                </div>
            </div>
        </div>
    )
}
