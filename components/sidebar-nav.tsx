"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { 
  NAV_PRIMARY, 
  NAV_SECONDARY, 
  TAG_COLORS, 
  isPriorityScreen,
  getTotalScreens,
  type NavGroup,
  type NavScreen,
  type NavTag
} from "@/lib/nav-config"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

interface SidebarNavProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function TagBadge({ tag }: { tag: NavTag }) {
  const colors = TAG_COLORS[tag]
  return (
    <span
      className="whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-medium tracking-wider"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      {tag}
    </span>
  )
}

function NavGroupItem({ 
  group, 
  isActive, 
  isExpanded, 
  onToggle,
  collapsed 
}: { 
  group: NavGroup
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  collapsed: boolean
}) {
  const pathname = usePathname()
  
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
          "hover:bg-[var(--bg-hover)]",
          isActive && "border-l-2 border-[var(--gold-400)] bg-[var(--bg-elevated)]",
          !isActive && "border-l-2 border-transparent"
        )}
      >
        <span className={cn(
          "text-sm",
          isActive ? "text-[var(--gold-400)]" : "text-[var(--gray-500)]"
        )}>
          {group.icon}
        </span>
        {!collapsed && (
          <>
            <span className={cn(
              "flex-1 text-xs font-medium tracking-wide",
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}>
              {group.label}
            </span>
            {group.badge && (
              <span className="rounded bg-[var(--green-900)] px-1 py-0.5 text-[7px] font-bold tracking-wider text-[var(--green-400)]">
                {group.badge}
              </span>
            )}
            <span className="text-[9px] text-[var(--gray-600)]">{group.screens.length}</span>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--gray-600)]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--gray-600)]" />
            )}
          </>
        )}
      </button>
      
      {!collapsed && isExpanded && (
        <div className="border-l border-[var(--border-subtle)] ml-4 pl-2">
          {group.screens.map((screen, idx) => {
            const isScreenActive = pathname === screen.route
            const isPriority = isPriorityScreen(screen.label)
            
            return (
              <Link
                key={screen.id}
                href={screen.route}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 transition-colors",
                  "hover:bg-[var(--bg-hover)]",
                  isScreenActive && "bg-[var(--bg-elevated)]",
                  isPriority && "border-l border-[var(--green-700)]"
                )}
              >
                <span className="text-[9px] text-[var(--gray-700)] w-4">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className={cn(
                  "flex-1 text-[11px]",
                  isScreenActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]",
                  screen.urgent && "text-[var(--red-400)]"
                )}>
                  {screen.label}
                </span>
                <TagBadge tag={screen.tag} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["home"])
  
  // Determine which group is active based on current route
  const activeGroupId = [...NAV_PRIMARY, ...NAV_SECONDARY].find(g => 
    g.screens.some(s => pathname.startsWith(s.route.split("/").slice(0, 2).join("/")))
  )?.id || "home"
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }
  
  return (
    <aside 
      className={cn(
        "flex h-full flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        collapsed ? "w-14" : "w-[188px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[52px] items-center gap-2 border-b border-[var(--border-subtle)] px-3">
        <Logo size="xs" />
        {!collapsed && (
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs font-semibold tracking-wider text-[var(--green-500)]">TRADE</span>
            <span className="text-xs font-semibold tracking-wider text-[var(--gold-400)]">SWARM</span>
          </div>
        )}
      </div>
      
      {/* Primary Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 pb-2">
          <span className="text-[9px] font-medium tracking-widest text-[var(--gray-600)]">PRIMARY</span>
        </div>
        {NAV_PRIMARY.map(group => (
          <NavGroupItem
            key={group.id}
            group={group}
            isActive={activeGroupId === group.id}
            isExpanded={expandedGroups.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            collapsed={collapsed}
          />
        ))}
        
        {/* Separator */}
        <div className="my-3 mx-3 h-px bg-[var(--border-subtle)]" />
        
        {/* Secondary Nav */}
        <div className="px-3 pb-2">
          <span className="text-[9px] font-medium tracking-widest text-[var(--gray-600)]">SYSTEM</span>
        </div>
        {NAV_SECONDARY.map(group => (
          <NavGroupItem
            key={group.id}
            group={group}
            isActive={activeGroupId === group.id}
            isExpanded={expandedGroups.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            collapsed={collapsed}
          />
        ))}
      </div>
      
      {/* Footer Stats */}
      {!collapsed && (
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className="text-[9px] tracking-wider text-[var(--gray-600)]">SYSTEM TOTAL</div>
          <div className="text-xl font-light text-[var(--gold-400)]">{getTotalScreens()}</div>
          <div className="text-[9px] tracking-wider text-[var(--gray-600)]">SCREENS MAPPED</div>
        </div>
      )}
    </aside>
  )
}
