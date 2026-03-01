import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const now = new Date().toISOString()

  return NextResponse.json({
    ok: true,
    service: "engine-health",
    ts: now,
    diagnostics: {
      build: "green-required",
      notes: "Minimal health payload. Expand after repo builds.",
    },
  })
}
