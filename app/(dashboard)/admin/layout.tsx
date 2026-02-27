"use client"

// Admin has its own full-width desktop layout.
// This file intentionally renders children without any phone wrapper.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-background">
            {children}
        </div>
    )
}
