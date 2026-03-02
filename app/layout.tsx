import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "TradeSwarm - Regime-Aware AI Trading",
  description: "AI-powered options trading assistant with multi-model consensus, deterministic receipts, and safety-gated execution. Paper trading mode.",
  icons: {
    icon: "/images/tradeswarm-logo.jpg",
    apple: "/images/tradeswarm-logo.jpg",
  },
  openGraph: {
    title: "TradeSwarm - Regime-Aware AI Trading",
    description: "AI-powered options trading assistant with multi-model consensus and safety-gated execution.",
    images: ["/images/tradeswarm-logo.jpg"],
  },
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
