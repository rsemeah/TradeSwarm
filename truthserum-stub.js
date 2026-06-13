/**
 * truthserum-stub.js
 * Lightweight TruthSerum stub for local paper trading.
 * Runs on port 8787. Returns ok=true for all valid score requests.
 *
 * Usage: node truthserum-stub.js
 *
 * Replace with real TruthSerum model when T33 gate begins.
 */

const http = require("http")

const PORT = process.env.TRUTHSERUM_PORT ?? 8787

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json")

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200)
    res.end(JSON.stringify({ ok: true, mode: "stub", version: "0.0.1-stub" }))
    return
  }

  if (req.method === "POST" && req.url === "/v1/score") {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        JSON.parse(body) // validate it's parseable, don't validate schema
      } catch (_) {
        res.writeHead(400)
        res.end(JSON.stringify({ ok: false, score: 0, reasons: ["bad_json"], warnings: [] }))
        return
      }

      res.writeHead(200)
      res.end(
        JSON.stringify({
          ok: true,
          score: 0.82,
          reasons: [],
          warnings: ["stub_mode_score_not_real"],
          model: { name: "stub", version: "0.0.1" },
          determinism_hash: "stub",
        })
      )
    })
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: "not_found" }))
})

server.listen(PORT, () => {
  console.log(`[TruthSerum stub] running on http://localhost:${PORT}`)
  console.log(`[TruthSerum stub] /health + /v1/score active`)
  console.log(`[TruthSerum stub] WARNING: scores are synthetic — replace before T33 gate`)
})
