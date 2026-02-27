import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "TradeSwarm - Algorithmic Trading Dashboard",
  description: "Real-time algorithmic trading dashboard with growth score analysis, regime detection, and Kelly-optimized position sizing.",
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
