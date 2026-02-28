"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

interface DemoContextValue {
  isDemoMode: boolean
  setDemoMode: (value: boolean) => void
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  setDemoMode: () => {},
})

export function DemoProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const [isDemoMode, setDemoMode] = useState(false)

  useEffect(() => {
    // Check for ?demo=1 in URL
    const demoParam = searchParams.get("demo")
    if (demoParam === "1" || demoParam === "true") {
      setDemoMode(true)
    }
  }, [searchParams])

  return (
    <DemoContext.Provider value={{ isDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return useContext(DemoContext)
}
