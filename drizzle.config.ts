import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Load .env then .env.local (override, same priority as Next.js)
config({ path: ".env" })
config({ path: ".env.local", override: true })

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
