"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { auth } from "@/lib/firebase"
import { ParentHomeScreen } from "@/components/transify/home-screen"
import { ParentTripsScreen } from "@/components/transify/trips-screen"
import { ParentAlertsScreen } from "@/components/transify/alerts-screen"
import { ParentReportsScreen } from "@/components/transify/reports-screen"
import { ParentProfileScreen } from "@/components/transify/profile-screen"
import { PremiumScreen } from "@/components/transify/premium-screen"
import { BottomNav, type ParentTab } from "@/components/transify/bottom-nav"
import { useRouter } from "next/navigation"

export default function ParentDashboardPage() {
    const [activeTab, setActiveTab] = useState<ParentTab>("home")
    const [isPremium, setIsPremium] = useState(true)
    const [showPremium, setShowPremium] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        await auth.signOut()
        router.push("/category")
    }

    return (
        <>
            {activeTab === "home" && (
                <ParentHomeScreen isPremium={isPremium} />
            )}
            {activeTab === "trips" && <ParentTripsScreen />}
            {activeTab === "alerts" && <ParentAlertsScreen />}
            {activeTab === "reports" && (
                <ParentReportsScreen
                    isPremium={isPremium}
                    onUpgrade={() => setShowPremium(true)}
                />
            )}
            {activeTab === "profile" && (
                <ParentProfileScreen
                    isPremium={isPremium}
                    onUpgrade={() => setShowPremium(true)}
                    onLogout={handleLogout}
                />
            )}

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
        </>
    )
}
