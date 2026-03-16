/**
 * Quick usage analysis. Run via: npx tsx --env-file=.env src/lib/db/seed/query-usage.ts
 */
import { desc } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { usageLogs } from "@/lib/db/schema/usage-logs"
import { creditTransactions } from "@/lib/db/schema/credit-transactions"

async function main() {
  const db = getDb()

  console.log("\n=== Letzte 15 Usage Logs ===\n")
  const logs = await db.select().from(usageLogs).orderBy(desc(usageLogs.createdAt)).limit(15)
  for (const r of logs) {
    const m = (r.modelId ?? "?").split("/").pop()!.padEnd(22)
    console.log(
      `${m} in:${String(r.inputTokens).padStart(7)}  out:${String(r.outputTokens).padStart(6)}  cached:${String(r.cachedInputTokens ?? 0).padStart(6)}  steps:${r.stepCount}  ${r.createdAt?.toISOString().slice(0, 19)}`
    )
  }

  console.log("\n=== Letzte 15 Credit Transactions ===\n")
  const txs = await db.select().from(creditTransactions).orderBy(desc(creditTransactions.createdAt)).limit(15)
  for (const t of txs) {
    const model = (t.modelId ?? "").split("/").pop() ?? ""
    console.log(
      `${t.type.padEnd(12)} ${String(t.amount).padStart(8)}  balance:${String(t.balanceAfter).padStart(9)}  ${model.padEnd(22)} ${t.description ?? ""}  ${t.createdAt?.toISOString().slice(0, 19)}`
    )
  }

  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
