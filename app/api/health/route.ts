import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {}

  // Check Supabase connection
  try {
    const supabase = await createClient()
    const dbStart = Date.now()
    const { error } = await supabase.from("user_preferences").select("count").limit(1)
    checks.database = {
      status: error ? "error" : "ok",
      latency: Date.now() - dbStart,
      error: error?.message,
    }
  } catch (e) {
    checks.database = { status: "error", error: String(e) }
  }

  // Check Groq API
  try {
    const groqStart = Date.now()
    const hasGroqKey = !!process.env.GROQ_API_KEY
    checks.groq = {
      status: hasGroqKey ? "ok" : "error",
      latency: Date.now() - groqStart,
      error: hasGroqKey ? undefined : "GROQ_API_KEY not configured",
    }
  } catch (e) {
    checks.groq = { status: "error", error: String(e) }
  }

  // Check OpenAI/AI Gateway
  try {
    const hasOpenAI = !!process.env.AI_GATEWAY_API_KEY || !!process.env.OPENAI_API_KEY
    checks.openai = {
      status: hasOpenAI ? "ok" : "error",
      error: hasOpenAI ? undefined : "No OpenAI/AI Gateway key configured",
    }
  } catch (e) {
    checks.openai = { status: "error", error: String(e) }
  }

  // Overall health
  const allOk = Object.values(checks).every((c) => c.status === "ok")
  const criticalOk = checks.database?.status === "ok" && checks.groq?.status === "ok"

  return Response.json({
    status: allOk ? "healthy" : criticalOk ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    totalLatency: Date.now() - startTime,
    checks,
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  })
}
