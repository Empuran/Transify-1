"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { auth, db, signInWithCustomToken, signInAnonymously } from "@/lib/firebase"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
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
    loginMock: (role: UserRole, orgCategory?: OrgCategory, phone?: string, name?: string) => void
    loginAdmin: (customToken: string | null, adminData: AdminSession) => Promise<void>
    logoutMock: (roleToLogout?: UserRole) => void
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

    // Restore session from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedAdmin = sessionStorage.getItem("transify_admin_session")
            if (storedAdmin) {
                try {
                    const parsed = JSON.parse(storedAdmin) as AdminSession
                    setAdminSession(parsed)
                    // ... (restored below in onAuthStateChanged)
                } catch { }
            }

            const storedMock = sessionStorage.getItem("transify_mock_profile")
            if (storedMock) {
                try {
                    const parsed = JSON.parse(storedMock) as UserProfile
                    setProfile(parsed)
                    setUser({ uid: "test_user_id", phoneNumber: parsed.phone } as FirebaseUser)
                    setActiveOrgId(parsed.activeOrgId)
                    setLoading(false)
                } catch { }
            }
        }
    }, [])

    const loginAdmin = async (customToken: string | null, adminData: AdminSession) => {
        try {
            if (customToken) {
                // Sign in with the custom token from the server
                const cred = await signInWithCustomToken(auth, customToken)
                setUser(cred.user)
            } else {
                // Fallback for static mobile build: use anonymous auth
                const cred = await signInAnonymously(auth)
                setUser(cred.user)
            }

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

    const loginMock = (role: UserRole, orgCategory?: OrgCategory, phone?: string, name?: string) => {
        // Normalize phone: strip country code, spaces, dashes → 10-digit local number
        const rawPhone = (phone || "").replace(/\s+/g, "").replace(/-/g, "")
        const digits = rawPhone.replace(/^\+91/, "").replace(/^0/, "")
        // Keep both: 10-digit for query fallback and +91 prefixed for Firestore exact match
        const normalizedPhone = digits.length >= 10 ? digits.slice(-10) : rawPhone
        const phoneWithCC = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : rawPhone

        const displayName = name || (role === "driver" ? "Loading Driver..." : "Parent")
        const mockProfile: UserProfile = {
            id: "test_user_id",
            phone: phoneWithCC || "+919999999999",    // Primary: +91XXXXXXXXXX — matches most Firestore entries
            globalName: displayName,
            orgCategory: orgCategory || "school",
            roles: { "org_123": role },
            activeOrgId: "org_123",
        }
        setUser({ uid: "test_user_id", phoneNumber: phoneWithCC || "+919999999999" } as FirebaseUser)
        setProfile(mockProfile)
        setActiveOrgId("org_123")
        setLoading(false)

        if (typeof window !== "undefined") {
            sessionStorage.setItem("transify_mock_profile", JSON.stringify(mockProfile))
        }

        // Also sign in to Firebase Auth anonymously so Firestore rules don't block writes
        signInAnonymously(auth).catch(err => console.error("Anonymous auth failed:", err))
    }

    const logoutMock = (roleToLogout?: UserRole) => {
        if (typeof window !== "undefined") {
            if (roleToLogout === "admin") {
                sessionStorage.removeItem("transify_admin_session")
                setAdminSession(null)
                // If this was an admin-only session, we can sign out of Firebase
                // But generally, to support multi-tab, we only sign out if NO other role is active in THIS tab
                if (!sessionStorage.getItem("transify_mock_profile")) {
                    auth.signOut().catch(() => {})
                }
                return;
            }
            if (roleToLogout === "driver" || roleToLogout === "guardian") {
                 sessionStorage.removeItem("transify_mock_profile")
                 setProfile(null)
                 setActiveOrgId(null)
                 // Only sign out if NO admin session is active in THIS tab
                 if (!sessionStorage.getItem("transify_admin_session")) {
                     auth.signOut().catch(() => {})
                 }
                 return;
            }
            
            sessionStorage.removeItem("transify_admin_session")
            sessionStorage.removeItem("transify_mock_profile")
        }
        
        setUser(null)
        setProfile(null)
        setActiveOrgId(null)
        setAdminSession(null)
        auth.signOut().catch(() => { })
    }

    useEffect(() => {
        // Safe to assume configured since we hardcoded in lib/firebase.ts for mobile APK
        const isConfigured = true;

        if (!isConfigured) {
            console.warn("Firebase not configured. Mock mode active.");
            setLoading(false)
            return () => { }
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            const storedMock = typeof window !== "undefined" ? sessionStorage.getItem("transify_mock_profile") : null
            const storedAdmin = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null

            if (!firebaseUser) {
                // If this specific tab has a valid stored session (mock or admin), 
                // do NOT clear the React state just because Firebase Auth logged out globally in another tab.
                if (storedMock || storedAdmin) {
                    setLoading(false)
                    return
                }
                
                // Otherwise clear state
                setUser(null)
                setProfile(null)
                setActiveOrgId(null)
                setAdminSession(null)
                setLoading(false)
                return
            }

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
                    // 1. Try fetching from generic users collection
                    const docRef = doc(db, "users", firebaseUser.uid)
                    const docSnap = await getDoc(docRef)

                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserProfile
                        setProfile(data)
                        setActiveOrgId(data.activeOrgId || Object.keys(data.roles)[0] || null)
                    } else if (firebaseUser.phoneNumber) {
                        // 2. If not found and has phone, check drivers collection
                        console.log("[Auth] Checking phone in drivers collection:", firebaseUser.phoneNumber);
                        
                        // Handle multiple phone formats for lookup (including spaces found in DB)
                        const rawPhone = firebaseUser.phoneNumber;
                        const digits = rawPhone.replace(/\D/g, "").slice(-10);
                        const phoneVariants = [
                            rawPhone, 
                            digits, 
                            `+91${digits}`,
                            `+91 ${digits}`, // Format with space: +91 8289871896
                            `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` // Format with multiple spaces
                        ];

                        console.log("[Auth] Searching with variants:", phoneVariants);
                        const driversRef = collection(db, "drivers");
                        const q = query(driversRef, where("phone", "in", phoneVariants));
                        const driverSnap = await getDocs(q);

                        if (!driverSnap.empty) {
                            const driverData = driverSnap.docs[0].data();
                            console.log("[Auth] Found driver profile:", driverData.name);
                            
                            const driverProfile: UserProfile = {
                                id: firebaseUser.uid,
                                phone: rawPhone,
                                globalName: driverData.name,
                                roles: { [driverData.organization_id]: "driver" },
                                activeOrgId: driverData.organization_id,
                            };
                            setProfile(driverProfile);
                            setActiveOrgId(driverData.organization_id);
                        } else {
                            console.warn("[Auth] No driver found for these variants.");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error)
                }
            } else {
                // Ignore clearing state if we already handled above
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
