"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { ParentHomeScreen } from "@/components/transify/home-screen"
import { ParentTripsScreen } from "@/components/transify/trips-screen"
import { ParentAlertsScreen } from "@/components/transify/alerts-screen"
import { ParentReportsScreen } from "@/components/transify/reports-screen"
import { ParentProfileScreen } from "@/components/transify/profile-screen"
import { PremiumScreen } from "@/components/transify/premium-screen"
import { BottomNav, type ParentTab } from "@/components/transify/bottom-nav"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function ParentDashboardPage() {
    const [activeTab, setActiveTab] = useState<ParentTab>("home")
    const [isPremium, setIsPremium] = useState(false)
    const [showPremium, setShowPremium] = useState(false)
    const { logoutMock } = useAuth()
    const router = useRouter()

    const handleLogout = () => {
        logoutMock("guardian")
        router.push("/category")
    }

    return (
        <ErrorBoundary>
            <div className={activeTab === "home" ? "block" : "hidden"}>
                <ParentHomeScreen
                    isPremium={isPremium}
                    onUpgrade={() => setShowPremium(true)}
                />
            </div>
            <div className={activeTab === "trips" ? "block" : "hidden"}>
                <ParentTripsScreen />
            </div>
            <div className={activeTab === "alerts" ? "block" : "hidden"}>
                <ParentAlertsScreen />
            </div>
            <div className={activeTab === "reports" ? "block" : "hidden"}>
                <ParentReportsScreen
                    isPremium={isPremium}
                    onUpgrade={() => setShowPremium(true)}
                />
            </div>
            <div className={activeTab === "profile" ? "block" : "hidden"}>
                <ParentProfileScreen
                    isPremium={isPremium}
                    onUpgrade={() => setShowPremium(true)}
                    onLogout={handleLogout}
                />
            </div>

            <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isPremium={isPremium}
            />

            {/* Premium Overlay */}
            {showPremium && (
                <PremiumScreen
                    onClose={() => setShowPremium(false)}
                    onSubscribe={() => {
                        setIsPremium(true)
                        setShowPremium(false)
                    }}
                />
            )}
        </ErrorBoundary>
    )
}
