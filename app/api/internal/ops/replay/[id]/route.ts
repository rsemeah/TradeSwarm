import { replayTrade } from "@/lib/engine/replayTrade"

function authorized(req: Request) {
  const expected = process.env.INTERNAL_JOBS_TOKEN
  if (!expected) return true
  return req.headers.get("x-internal-token") === expected
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await ctx.params
    const report = await replayTrade(id)
    return Response.json({ success: true, report })
  } catch (error) {
    console.error("Replay trade failed", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
