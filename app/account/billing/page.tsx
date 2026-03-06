"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function BillingPage() {
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

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#f5f5f5]">Plan & Billing</h1>
          <p className="mt-1 text-sm text-[#737373]">Manage your subscription and payment methods</p>
        </div>

        {/* Current Plan */}
        <div className="mb-6 rounded-xl border border-[#c9a227]/30 bg-[#c9a227]/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#f5f5f5]">Pro Plan</p>
                <span className="rounded bg-[#c9a227]/20 px-2 py-0.5 text-[10px] font-bold text-[#c9a227]">ACTIVE</span>
              </div>
              <p className="mt-1 text-sm text-[#737373]">Unlimited signals, all strategies, priority support</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#f5f5f5]">$49<span className="text-sm font-normal text-[#737373]">/mo</span></p>
              <p className="text-xs text-[#737373]">Next billing: Apr 5, 2026</p>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Usage This Period</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[#737373]">API Calls</span>
                <span className="text-[#f5f5f5]">12,450 / Unlimited</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                <div className="h-full w-1/4 rounded-full bg-[#22c55e]" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[#737373]">Swarm Queries</span>
                <span className="text-[#f5f5f5]">847 / Unlimited</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                <div className="h-full w-1/6 rounded-full bg-[#22c55e]" />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Payment Method</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded bg-[#1a1a1a]">
                <span className="text-xs font-bold text-[#737373]">VISA</span>
              </div>
              <div>
                <p className="text-sm text-[#f5f5f5]">•••• •••• •••• 4242</p>
                <p className="text-xs text-[#737373]">Expires 12/27</p>
              </div>
            </div>
            <button className="text-sm text-[#22c55e] hover:text-[#16a34a]">Update</button>
          </div>
        </div>
      </div>
    </div>
  )
}
