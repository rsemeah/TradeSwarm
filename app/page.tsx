import dynamic from "next/dynamic"

const App = dynamic(() => import("@/components/app").then(mod => ({ default: mod.App })), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00ff88] border-t-transparent" />
    </div>
  ),
})

export default function Home() {
  return <App />
}
