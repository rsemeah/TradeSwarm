import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[380px]">
        <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ff88]/10">
            <svg
              className="h-8 w-8 text-[#00ff88]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white">Check your email</h1>
          <p className="mt-3 text-sm text-[#6b6b6b]">
            We&apos;ve sent you a confirmation link. Please check your email to verify your account before signing in.
          </p>

          <Link
            href="/auth/login"
            className="mt-6 block rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:border-[#00ff88]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
