import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[380px]">
        <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff4444]/10">
            <svg
              className="h-8 w-8 text-[#ff4444]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="mt-3 text-sm text-[#6b6b6b]">
            {params?.error || "An unexpected error occurred during authentication."}
          </p>

          <Link
            href="/auth/login"
            className="mt-6 block rounded-lg bg-[#00ff88] py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}
