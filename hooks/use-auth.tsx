"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

export type UserRole = "admin" | "driver" | "guardian"

export interface UserProfile {
    id: string
    phone: string
    globalName: string
    roles: {
        [orgId: string]: UserRole
    }
    activeOrgId: string | null
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
    setActiveOrg: (orgId: string) => void
    loginMock: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    currentRole: null,
    activeOrgId: null,
    setActiveOrg: () => { },
    loginMock: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

    const loginMock = (role: UserRole) => {
        const mockProfile: UserProfile = {
            id: "test_user_id",
            phone: "+919999999999",
            globalName: "Test User",
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

    useEffect(() => {
        // Check if Firebase is properly configured
        const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

        if (!isConfigured) {
            // Mock data for development when Firebase is not configured
            console.warn("Firebase not configured. Mock mode active.");
            setLoading(false)
            return () => { }
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                try {
                    // Fetch user profile from Firestore
                    const docRef = doc(db, "users", firebaseUser.uid)
                    const docSnap = await getDoc(docRef)

                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserProfile
                        setProfile(data)
                        // Default to first organization or activeOrgId from profile
                        setActiveOrgId(data.activeOrgId || Object.keys(data.roles)[0] || null)
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error)
                }
            } else {
                setProfile(null)
                setActiveOrgId(null)
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
                setActiveOrg: setActiveOrgId,
                loginMock,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
