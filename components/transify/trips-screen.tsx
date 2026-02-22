"use client"

import { Calendar, Clock, ChevronRight, Bus, Filter } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { useState } from "react"
import { cn } from "@/lib/utils"

const trips = [
  { id: 1, date: "Today", route: "Route A12 - Home to School", child: "Arya Sharma", time: "8:15 AM", duration: "32 min", status: "on-time" as const },
  { id: 2, date: "Today", route: "Route B5 - Home to School", child: "Vihaan Sharma", time: "8:30 AM", duration: "28 min", status: "delayed" as const },
  { id: 3, date: "Yesterday", route: "Route A12 - School to Home", child: "Arya Sharma", time: "3:30 PM", duration: "35 min", status: "completed" as const },
  { id: 4, date: "Yesterday", route: "Route A12 - Home to School", child: "Arya Sharma", time: "8:15 AM", duration: "30 min", status: "completed" as const },
  { id: 5, date: "Feb 20", route: "Route B5 - School to Home", child: "Vihaan Sharma", time: "3:45 PM", duration: "25 min", status: "completed" as const },
  { id: 6, date: "Feb 20", route: "Route A12 - Home to School", child: "Arya Sharma", time: "8:15 AM", duration: "31 min", status: "completed" as const },
]

const filters = ["All", "Arya", "Vihaan"] as const

export function ParentTripsScreen() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All")

  const filteredTrips = activeFilter === "All"
    ? trips
    : trips.filter((t) => t.child.includes(activeFilter))

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <h1 className="pt-4 text-xl font-bold text-foreground">Trips</h1>
        <p className="text-sm text-muted-foreground">Trip history for your children</p>

        {/* Filter Chips */}
        <div className="mt-3 flex items-center gap-2">
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
        {filteredTrips.map((trip) => (
          <button
            key={trip.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-secondary/80"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-1 flex-col items-start gap-1">
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{trip.route}</span>
              </div>
              <span className="text-xs text-muted-foreground">{trip.child}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {trip.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {trip.time}
                </span>
                <span>{trip.duration}</span>
              </div>
              <StatusBadge status={trip.status} />
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
