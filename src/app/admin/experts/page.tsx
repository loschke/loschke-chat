import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import { asc } from "drizzle-orm"
import { ExpertsAdmin } from "@/components/admin/experts-admin"

export const dynamic = "force-dynamic"

export default async function AdminExpertsPage() {
  const db = getDb()
  const allExperts = await db
    .select()
    .from(experts)
    .orderBy(asc(experts.sortOrder), asc(experts.name))

  return <ExpertsAdmin initialExperts={allExperts} />
}
