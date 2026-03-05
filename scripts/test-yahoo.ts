import { getMarketSnapshot } from "../src/lib/data/yahoo"

async function run() {
  try {
    const { snapshot, snapshotHash } = await getMarketSnapshot("NVDA")
    console.log("Snapshot hash:", snapshotHash)
    console.log("Quote sample:", snapshot.quote)
    console.log("Options expirations:", (snapshot.options || []).length)
  } catch (err) {
    console.error("Error fetching market data:", err)
    process.exit(1)
  }
}

run()
