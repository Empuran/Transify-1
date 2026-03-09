"use client"

import {
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Download,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { cn } from "@/lib/utils"

interface ParentReportsScreenProps {
  isPremium?: boolean
  onUpgrade?: () => void
}

const reportCards = [
  {
    title: "Monthly Transport Report",
    description: "Feb 2026 - Complete trip analytics",
    icon: BarChart3,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    title: "Driver Performance",
    description: "Safety scores & punctuality ratings",
    icon: Star,
    iconBg: "bg-gold/10",
    iconColor: "text-gold",
  },
  {
    title: "Delay Analytics",
    description: "Patterns and insights on delays",
    icon: Clock,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    title: "Route Efficiency",
    description: "Time vs distance optimization",
    icon: TrendingUp,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
]

export function ParentReportsScreen({ isPremium = false, onUpgrade }: ParentReportsScreenProps) {
  const [driverScore, setDriverScore] = useState("4.8")
  const [onTimeRate, setOnTimeRate] = useState("94%")
  const [totalTrips, setTotalTrips] = useState("42")
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile?.id || !isPremium) return

    // In a real scenario, we'd fetch the student's assigned driver and vehicle
    // For now, we'll try to find any driver for this student's organization to show realistic data
    const orgId = profile.activeOrgId || "default"
    const dQuery = query(collection(db, "drivers"), where("organization_id", "==", orgId))
    
    const unsub = onSnapshot(dQuery, (snap) => {
      const drivers = snap.docs.map(doc => doc.data())
      if (drivers.length > 0) {
        // Average of available drivers
        const avg = drivers.reduce((acc, d) => acc + (d.avg_rating || 0), 0) / drivers.length
        setDriverScore(avg > 0 ? avg.toFixed(1) : "4.8")
      }
    })

    // Trips count from notifications or a trips collection
    const tQuery = query(collection(db, "notifications"), where("organization_id", "==", orgId), where("type", "==", "trip_end"))
    const unsub2 = onSnapshot(tQuery, (snap) => {
      setTotalTrips(snap.size > 0 ? snap.size.toString() : "42")
    })

    return () => { unsub(); unsub2() }
  }, [profile?.id, isPremium])

  const downloadReport = (report: any) => {
    // Mock report generation
    let csv = "Date,Detail,Value\n";
    if (report.title.includes("Driver")) {
      csv += `2026-02-28,Punctuality,Excellent\n2026-02-27,Safety,Good\n2026-02-26,Rating,${driverScore}`;
    } else {
      csv += `2026-02-28,Activity,Daily Trip\n2026-02-27,Duration,15 mins\n2026-02-26,Status,On Time`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${report.title.toLowerCase().replace(/\s/g, '_')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (!isPremium) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
          <h1 className="pt-4 text-xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Premium analytics & insights</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gold/10">
            <Lock className="h-10 w-10 text-gold" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Unlock Reports</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Get detailed analytics, driver performance scores, delay insights, and monthly transport reports with Premium.
          </p>
          <Button
            onClick={onUpgrade}
            className="mt-6 h-12 rounded-xl bg-highlight px-8 text-highlight-foreground font-semibold hover:bg-highlight/90"
          >
            Upgrade to Premium
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Analytics & insights</p>
          </div>
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-gold">
            PREMIUM
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{onTimeRate}</p>
          <p className="text-[10px] text-muted-foreground">On Time Rate</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{driverScore}</p>
          <p className="text-[10px] text-muted-foreground">Driver Score</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{totalTrips}</p>
          <p className="text-[10px] text-muted-foreground">Total Trips</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="flex flex-col gap-3 px-4">
        {reportCards.map((report, i) => {
          const Icon = report.icon
          return (
            <button
              key={i}
              onClick={() => downloadReport(report)}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-secondary/80 text-left"
            >
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", report.iconBg)}>
                <Icon className={cn("h-6 w-6", report.iconColor)} />
              </div>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">{report.title}</span>
                <span className="text-xs text-muted-foreground">{report.description}</span>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
