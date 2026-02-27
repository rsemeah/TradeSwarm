"use client"

import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Logo } from "@/components/logo"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/`,
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="icon" size="xl" />
          <div className="mt-3 text-lg font-bold tracking-wide">
            <span className="text-[#1B5E20]">TRADE</span>
            <span className="text-[#C5A028]">SWARM</span>
          </div>
          <p className="mt-2 text-sm text-[#6b6b6b]">Create your account</p>
        </div>

        <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-white">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b6b6b]">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#00ff88] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
