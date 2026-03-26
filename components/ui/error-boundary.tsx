"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center bg-destructive/5 rounded-3xl border border-destructive/20 m-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
          <h2 className="text-lg font-black text-destructive uppercase tracking-tight mb-2">Something went wrong</h2>
          <div className="w-full max-h-48 overflow-y-auto bg-black/5 rounded-xl p-4 mb-6">
            <p className="text-xs font-mono text-left text-destructive whitespace-pre-wrap">
              {this.state.error?.name}: {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack?.split("\n").slice(0, 3).join("\n")}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-2xl bg-destructive px-6 py-3 text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
