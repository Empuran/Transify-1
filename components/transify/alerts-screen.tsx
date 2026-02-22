"use client"

import {
  Bell,
  MapPin,
  Clock,
  AlertTriangle,
  Navigation,
  UserX,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AlertType = "arriving" | "delay" | "deviation" | "sos" | "missed-boarding" | "early-arrival"

const alertConfig: Record<
  AlertType,
  { icon: typeof Bell; iconBg: string; iconColor: string }
> = {
  arriving: { icon: Navigation, iconBg: "bg-primary/10", iconColor: "text-primary" },
  delay: { icon: Clock, iconBg: "bg-warning/10", iconColor: "text-warning" },
  deviation: { icon: MapPin, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  sos: { icon: AlertTriangle, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  "missed-boarding": { icon: UserX, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  "early-arrival": { icon: CheckCircle2, iconBg: "bg-success/10", iconColor: "text-success" },
}

const alerts = [
  {
    id: 1,
    type: "early-arrival" as AlertType,
    title: "Early Arrival Alert",
    description: "Arya's bus will arrive 3 minutes early at MG Road stop",
    time: "Just now",
    child: "Arya",
    unread: true,
  },
  {
    id: 2,
    type: "arriving" as AlertType,
    title: "Arriving Soon",
    description: "Bus is 2 minutes away from MG Road stop for Arya",
    time: "2 min ago",
    child: "Arya",
    unread: true,
  },
  {
    id: 3,
    type: "delay" as AlertType,
    title: "Delay Alert",
    description: "Vihaan's Route B5 is running 8 minutes behind schedule due to traffic",
    time: "15 min ago",
    child: "Vihaan",
    unread: true,
  },
  {
    id: 4,
    type: "missed-boarding" as AlertType,
    title: "Missed Boarding Alert",
    description: "Vihaan did not board at the scheduled pickup point this morning",
    time: "Yesterday 8:20 AM",
    child: "Vihaan",
    unread: false,
  },
  {
    id: 5,
    type: "deviation" as AlertType,
    title: "Route Deviation",
    description: "Vehicle on Route A12 has deviated from planned route near Indiranagar",
    time: "Yesterday",
    child: "Arya",
    unread: false,
  },
  {
    id: 6,
    type: "sos" as AlertType,
    title: "SOS Triggered",
    description: "Emergency SOS was triggered by driver on Route B5. Situation resolved.",
    time: "Feb 20",
    child: "Vihaan",
    unread: false,
  },
]

export function ParentAlertsScreen() {
  const unreadCount = alerts.filter((a) => a.unread).length

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Alerts</h1>
            <p className="text-sm text-muted-foreground">Stay updated on transport activity</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex h-8 items-center justify-center rounded-full bg-primary/10 px-3">
              <span className="text-xs font-semibold text-primary">
                {unreadCount} new
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type]
          const Icon = config.icon
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors",
                alert.unread ? "border-primary/20 bg-primary/[0.02]" : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  config.iconBg
                )}
              >
                <Icon className={cn("h-5 w-5", config.iconColor)} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {alert.title}
                    </span>
                    {alert.unread && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {alert.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {alert.child}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">{alert.time}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
