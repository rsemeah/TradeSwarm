"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function SystemHealthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const services = [
    { name: "Market Data API", status: "operational", latency: "45ms" },
    { name: "Broker Connection", status: "operational", latency: "120ms" },
    { name: "Swarm Engine", status: "operational", latency: "89ms" },
    { name: "TruthSerum", status: "operational", latency: "67ms" },
    { name: "Risk Governor", status: "operational", latency: "23ms" },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#f5f5f5]">System Health</h1>
          <p className="mt-1 text-sm text-[#737373]">Monitor service status and performance</p>
        </div>

        {/* Overall Status */}
        <div className="mb-6 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e]/20">
              <svg className="h-5 w-5 text-[#22c55e]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#22c55e]">All Systems Operational</p>
              <p className="text-xs text-[#737373]">Last checked: Just now</p>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.name} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#f5f5f5]">{service.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  <span className="text-xs text-[#22c55e]">Operational</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#737373]">
                <span>Latency</span>
                <span className="font-mono">{service.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
