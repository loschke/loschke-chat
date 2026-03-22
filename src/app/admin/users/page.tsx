import { listUsersWithRoles } from "@/lib/db/queries/users"
import { UsersAdmin } from "@/components/admin/users-admin"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  let users: Awaited<ReturnType<typeof listUsersWithRoles>> = []
  try {
    users = await listUsersWithRoles()
  } catch {
    // Table may not have role column yet — show empty list
  }

  return <UsersAdmin initialUsers={users} />
}
