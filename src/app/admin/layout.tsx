import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { getUserRole } from "@/lib/db/queries/users"
import { isAdminRole, isAdminEmail } from "@/lib/admin-guard"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/")
  }

  const role = await getUserRole(user.id)
  const hasAccess = isAdminRole(role) || isAdminEmail(user.email)

  if (!hasAccess) {
    redirect("/")
  }

  return <AdminShell isSuperAdmin={role === "superadmin"}>{children}</AdminShell>
}
