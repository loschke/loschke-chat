/**
 * Seed-Script: Test-Memories in Mem0 anlegen.
 *
 * Nutzung:
 *   npx tsx scripts/seed-memories.ts
 *
 * Voraussetzungen:
 *   - MEM0_API_KEY in .env gesetzt
 *   - User-ID (Logto Sub) als Argument oder interaktiv
 *
 * Das Script legt Beispiel-Memories an, die beim nächsten Chat-Start
 * über den Memory-Retrieval-Flow gefunden werden sollten.
 */

import MemoryClient from "mem0ai"
import { readFileSync } from "fs"
import { resolve } from "path"
import { getErrorMessage } from "@/lib/errors"

// .env manuell laden (kein dotenv-Dependency nötig)
const envPath = resolve(__dirname, "../.env")
try {
  const envContent = readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  // .env nicht vorhanden — ENV muss direkt gesetzt sein
}

const apiKey = process.env.MEM0_API_KEY
if (!apiKey) {
  console.error("MEM0_API_KEY nicht in .env gesetzt!")
  process.exit(1)
}

const userId = process.argv[2]
if (!userId) {
  console.error("Usage: npx tsx scripts/seed-memories.ts <LOGTO_USER_ID>")
  console.error("")
  console.error("Die Logto User-ID findest du in der DB:")
  console.error("  SELECT logto_id, email FROM users;")
  console.error("")
  console.error("Oder im Browser: Logto Dashboard → Users → User Details → User ID")
  process.exit(1)
}

const client = new MemoryClient({ apiKey })

// Test-Memories: Fakten die bei verschiedenen Chat-Themen matchen sollten
const memories = [
  [
    { role: "user" as const, content: "Ich bin Rico Loschke, AI Transformation Consultant aus Dresden. Ich bin Solo-Selbständig seit Januar 2026." },
    { role: "assistant" as const, content: "Hallo Rico! Ich merke mir, dass du als AI Transformation Consultant in Dresden arbeitest." },
  ],
  [
    { role: "user" as const, content: "Meine Hauptmarke ist loschke.ai, daneben betreibe ich unlearn.how für B2B-Beratung und lernen.diy für Self-Service-Lerninhalte." },
    { role: "assistant" as const, content: "Verstanden — drei Brands mit unterschiedlichen Zielgruppen und Tonalitäten." },
  ],
  [
    { role: "user" as const, content: "Ich bevorzuge TypeScript und Next.js für Webprojekte. Mein Tech-Stack ist Vercel, Neon Postgres, Drizzle ORM." },
    { role: "assistant" as const, content: "Notiert! TypeScript/Next.js auf Vercel mit Neon und Drizzle." },
  ],
  [
    { role: "user" as const, content: "Bitte antworte immer auf Deutsch, es sei denn ich schreibe auf Englisch. Kein Bullshit, direkt auf den Punkt." },
    { role: "assistant" as const, content: "Verstanden — Deutsch als Default, direkte Kommunikation ohne Floskeln." },
  ],
  [
    { role: "user" as const, content: "Ich arbeite gerade an einer AI Chat Plattform (loschke-chat). Das Projekt ist bei Meilenstein 8 — Memory System." },
    { role: "assistant" as const, content: "Spannend! Das Memory System ist der aktuelle Fokus." },
  ],
]

async function main() {
  console.log(`Seeding ${memories.length} Memories für User: ${userId}\n`)

  for (let i = 0; i < memories.length; i++) {
    const msgs = memories[i]
    try {
      const result = await client.add(msgs, { user_id: userId })
      console.log(`✓ Memory ${i + 1}/${memories.length} angelegt:`, JSON.stringify(result).slice(0, 120))
    } catch (err) {
      console.error(`✗ Memory ${i + 1} fehlgeschlagen:`, getErrorMessage(err))
    }
  }

  console.log("\n--- Verifikation: Suche nach 'Rico' ---\n")

  try {
    const results = await client.search("Wer ist Rico?", { user_id: userId, limit: 5 })
    if (Array.isArray(results) && results.length > 0) {
      for (const r of results) {
        console.log(`  [${r.score?.toFixed(2) ?? "?"}] ${r.memory}`)
      }
      console.log(`\n${results.length} Memories gefunden. Retrieval funktioniert!`)
    } else {
      console.log("Keine Ergebnisse. Mem0 braucht evtl. ein paar Sekunden zum Indexieren.")
      console.log("Versuch es gleich nochmal mit: npx tsx scripts/seed-memories.ts", userId, "--search-only")
    }
  } catch (err) {
    console.error("Suche fehlgeschlagen:", getErrorMessage(err))
  }
}

main()
