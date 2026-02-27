"use client"

import type { TabId } from "@/lib/types"

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "radar", label: "Radar", icon: "\uD83D\uDCE1" },
  { id: "trades", label: "Trades", icon: "\uD83C\uDFAF" },
  { id: "money", label: "My Money", icon: "\uD83D\uDCB0" },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[#0f0f0f]">
      <div className="mx-auto flex max-w-[420px] items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
