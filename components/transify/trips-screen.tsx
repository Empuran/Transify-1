"use client"

import { Calendar, Clock, ChevronRight, Bus, Filter, Loader2 } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import {
  collection, query, where, getDocs, getDoc, doc,
  orderBy, limit,
} from "firebase/firestore"

interface Trip {
  id: string
  date: string
  route: string
  child: string
  childId: string
  time: string
  duration: string
  status: "on-time" | "delayed" | "completed" | "emergency"
}

function formatDate(ts: any): string {
  if (!ts) return ""
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function formatTime(ts: any): string {
  if (!ts) return ""
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function calcDuration(start: any, end: any): string {
  if (!start || !end) return ""
  const s = start?.toDate ? start.toDate() : new Date(start)
  const e = end?.toDate ? end.toDate() : new Date(end)
  const mins = Math.round(Math.abs(e.getTime() - s.getTime()) / 60000)
  return mins > 0 ? `${mins} min` : ""
}

export function ParentTripsScreen() {
  const { profile } = useAuth()
  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [childNames, setChildNames] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<string>("All")

  useEffect(() => {
    if (!profile?.phone) return

    const fetchTrips = async () => {
      setLoading(true)
      try {
        // 1. Get this parent's children
        const studentsSnap = await getDocs(
          query(collection(db, "students"), where("parent_phone", "==", profile.phone))
        )
        if (studentsSnap.empty) { setLoading(false); return }

        const studentIds = studentsSnap.docs.map(d => d.id)
        const studentMap: Record<string, string> = {}
        studentsSnap.docs.forEach(d => { studentMap[d.id] = d.data().name || "Unknown" })

        // Collect unique first names for filter chips
        const firstNames = Object.values(studentMap).map(n => n.split(" ")[0])
        setChildNames(firstNames)

        // 2. Fetch trips for those students (try trips collection first, fallback to trip_logs)
        const tripResults: Trip[] = []

        for (const sid of studentIds) {
          // Try "trips" collection (student_id field)
          let tSnap = await getDocs(
            query(
              collection(db, "trips"),
              where("student_id", "==", sid),
              orderBy("started_at", "desc"),
              limit(20)
            ).withConverter(null)
          ).catch(() => null)

          // Try "trip_logs" if no results
          if (!tSnap || tSnap.empty) {
            tSnap = await getDocs(
              query(
                collection(db, "trip_logs"),
                where("student_id", "==", sid),
                orderBy("started_at", "desc"),
                limit(20)
              )
            ).catch(() => null)
          }

          if (!tSnap || tSnap.empty) continue

          for (const d of tSnap.docs) {
            const td = d.data()
            tripResults.push({
              id: d.id,
              date: formatDate(td.started_at),
              route: td.route_name || td.route || "Route",
              child: studentMap[sid] || "Student",
              childId: sid,
              time: formatTime(td.started_at),
              duration: calcDuration(td.started_at, td.ended_at || td.completed_at),
              status: td.status === "completed" ? "completed"
                : td.status === "delayed" ? "delayed"
                : td.status === "emergency" ? "emergency"
                : "on-time",
            })
          }
        }

        // Sort newest first
        tripResults.sort((a, b) => {
          const order = ["Today", "Yesterday"]
          const ai = order.indexOf(a.date)
          const bi = order.indexOf(b.date)
          if (ai !== -1 && bi !== -1) return ai - bi
          if (ai !== -1) return -1
          if (bi !== -1) return 1
          return 0
        })

        setAllTrips(tripResults)
      } catch (e) {
        console.error("Trips fetch error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchTrips()
  }, [profile?.phone])

  const filters = ["All", ...childNames]

  const filteredTrips = activeFilter === "All"
    ? allTrips
    : allTrips.filter(t => t.child.startsWith(activeFilter))

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <h1 className="pt-4 text-xl font-bold text-foreground">Trips</h1>
        <p className="text-sm text-muted-foreground">Trip history for your children</p>

        {/* Filter Chips */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading trip history…</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Bus className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No trips yet</p>
            <p className="text-xs text-muted-foreground text-center">Trip history will appear here once your child completes their first ride.</p>
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate w-full">{trip.route}</span>
                <span className="text-xs text-muted-foreground">{trip.child}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {trip.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {trip.date}
                    </span>
                  )}
                  {trip.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {trip.time}
                    </span>
                  )}
                  {trip.duration && <span>{trip.duration}</span>}
                </div>
                <StatusBadge status={trip.status} />
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
