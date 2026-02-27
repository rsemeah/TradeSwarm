"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { TabId } from "@/lib/types"
import { TabBar } from "@/components/tab-bar"
import { RadarScreen } from "@/components/screens/radar-screen"
import { TradesScreen } from "@/components/screens/trades-screen"
import { MoneyScreen } from "@/components/screens/money-screen"
import { AuthProvider, useAuth } from "@/lib/auth-context"

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("radar")
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content Area - max 420px centered */}
      <main className="mx-auto max-w-[420px] px-4 pb-24 pt-6">
        {activeTab === "radar" && (
          <RadarScreen onNavigateToTrades={() => setActiveTab("trades")} />
        )}
        {activeTab === "trades" && <TradesScreen />}
        {activeTab === "money" && <MoneyScreen />}
      </main>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          Practice mode — no real money
        </p>
      </div>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
