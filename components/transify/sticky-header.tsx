"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface StickyHeaderProps {
    title: string
    onBack?: () => void
    className?: string
    showBackButton?: boolean
}

export function StickyHeader({ title, onBack, className, showBackButton = true }: StickyHeaderProps) {
    const router = useRouter()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            router.back()
        }
    }

    return (
        <header className={cn(
            "sticky top-0 z-[60] flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-5 backdrop-blur-md",
            className
        )}>
            <div className="flex items-center gap-4">
                {showBackButton && (
                    <button
                        onClick={handleBack}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate max-w-[200px]">
                    {title}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                {/* Space for future actions like profile or notifications */}
            </div>
        </header>
    )
}
