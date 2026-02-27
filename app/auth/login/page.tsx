"use client"

import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">TradeSwarm</h1>
          <p className="mt-2 text-sm text-[#6b6b6b]">Sign in to your account</p>
        </div>

        <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 text-base text-white placeholder:text-[#6b6b6b] focus:border-[#00ff88] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 text-base text-white placeholder:text-[#6b6b6b] focus:border-[#00ff88] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-[#ff4444]/10 p-3 text-sm text-[#ff4444]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-12 rounded-lg bg-[#00ff88] font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b6b6b]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-[#00ff88] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
