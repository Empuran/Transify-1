"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { auth, db, signInWithCustomToken } from "@/lib/firebase"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import type { AdminRole } from "@/lib/rbac"

export type UserRole = "admin" | "driver" | "guardian"
export type OrgCategory = "school" | "corporate"

export interface AdminSession {
    user_id: string
    email: string
    name: string
    role: AdminRole
    organization_id: string
    organization_name?: string
    organization_category?: OrgCategory
}

export interface UserProfile {
    id: string
    phone: string
    email?: string
    globalName: string
    orgCategory?: OrgCategory
    roles: {
        [orgId: string]: UserRole
    }
    activeOrgId: string | null
    adminSession?: AdminSession
    children?: Array<{
        id: string
        name: string
        school: string
        vehicle: string
        driver: string
        route: string
        status: "on-time" | "delayed" | "emergency"
    }>
}

interface AuthContextType {
    user: FirebaseUser | null
    profile: UserProfile | null
    loading: boolean
    currentRole: UserRole | null
    activeOrgId: string | null
    adminSession: AdminSession | null
    setActiveOrg: (orgId: string) => void
    loginMock: (role: UserRole, orgCategory?: OrgCategory) => void
    loginAdmin: (customToken: string, adminData: AdminSession) => Promise<void>
    logoutMock: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    currentRole: null,
    activeOrgId: null,
    adminSession: null,
    setActiveOrg: () => { },
    loginMock: () => { },
    loginAdmin: async () => { },
    logoutMock: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
    const [adminSession, setAdminSession] = useState<AdminSession | null>(null)

    // Restore admin session from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = sessionStorage.getItem("transify_admin_session")
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as AdminSession
                    setAdminSession(parsed)
                } catch { }
            }
        }
    }, [])

    const loginAdmin = async (customToken: string, adminData: AdminSession) => {
        try {
            // Sign in with the custom token from the server
            const cred = await signInWithCustomToken(auth, customToken)
            setUser(cred.user)

            // Build a profile from admin data
            const adminProfile: UserProfile = {
                id: adminData.user_id,
                phone: "",
                email: adminData.email,
                globalName: adminData.name,
                orgCategory: adminData.organization_category,
                roles: { [adminData.organization_id]: "admin" },
                activeOrgId: adminData.organization_id,
                adminSession: adminData,
            }
            setProfile(adminProfile)
            setActiveOrgId(adminData.organization_id)
            setAdminSession(adminData)

            // Persist admin session in sessionStorage for page reloads
            if (typeof window !== "undefined") {
                sessionStorage.setItem("transify_admin_session", JSON.stringify(adminData))
            }
        } catch (error) {
            console.error("Admin login error:", error)
            throw error
        }
    }

    const loginMock = (role: UserRole, orgCategory?: OrgCategory) => {
        const mockProfile: UserProfile = {
            id: "test_user_id",
            phone: "+919999999999",
            globalName: "Test User",
            orgCategory: orgCategory || "school",
            roles: { "org_123": role },
            activeOrgId: "org_123",
            children: [
                {
                    id: "1",
                    name: "Arya Sharma",
                    school: "Delhi Public School, Koramangala",
                    vehicle: "KA-01-AB-1234",
                    driver: "Rajesh Kumar",
                    route: "Route A12",
                    status: "on-time"
                }
            ]
        }
        setUser({ uid: "test_user_id", phoneNumber: "+919999999999" } as FirebaseUser)
        setProfile(mockProfile)
        setActiveOrgId("org_123")
    }

    const logoutMock = () => {
        setUser(null)
        setProfile(null)
        setActiveOrgId(null)
        setAdminSession(null)
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("transify_admin_session")
        }
        auth.signOut().catch(() => { })
    }

    useEffect(() => {
        const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

        if (!isConfigured) {
            console.warn("Firebase not configured. Mock mode active.");
            setLoading(false)
            return () => { }
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                // Check if we have a stored admin session
                if (typeof window !== "undefined") {
                    const stored = sessionStorage.getItem("transify_admin_session")
                    if (stored) {
                        try {
                            const parsedAdmin = JSON.parse(stored) as AdminSession
                            setAdminSession(parsedAdmin)
                            const adminProfile: UserProfile = {
                                id: parsedAdmin.user_id,
                                phone: "",
                                email: parsedAdmin.email,
                                globalName: parsedAdmin.name,
                                orgCategory: parsedAdmin.organization_category,
                                roles: { [parsedAdmin.organization_id]: "admin" },
                                activeOrgId: parsedAdmin.organization_id,
                                adminSession: parsedAdmin,
                            }
                            setProfile(adminProfile)
                            setActiveOrgId(parsedAdmin.organization_id)
                            setLoading(false)
                            return
                        } catch { }
                    }
                }

                try {
                    const docRef = doc(db, "users", firebaseUser.uid)
                    const docSnap = await getDoc(docRef)

                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserProfile
                        setProfile(data)
                        setActiveOrgId(data.activeOrgId || Object.keys(data.roles)[0] || null)
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error)
                }
            } else {
                setProfile(null)
                setActiveOrgId(null)
                setAdminSession(null)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const currentRole = profile && activeOrgId ? profile.roles[activeOrgId] : null

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                currentRole,
                activeOrgId,
                adminSession,
                setActiveOrg: setActiveOrgId,
                loginMock,
                loginAdmin,
                logoutMock,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
