import { getUsersWithBalances } from "@/lib/db/queries/credits"
import { CreditsAdmin } from "@/components/admin/credits-admin"

export const dynamic = "force-dynamic"

export default async function AdminCreditsPage() {
  let users: Awaited<ReturnType<typeof getUsersWithBalances>> = []
  try {
    users = await getUsersWithBalances()
  } catch {
    // Table may not exist yet — show empty list
  }

  return <CreditsAdmin initialUsers={users} />
}
