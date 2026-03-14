import { redirect } from "next/navigation"
import { getUserFull } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin-guard"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserFull()

  if (!user || !isAdminEmail(user.email)) {
    redirect("/")
  }

  return <AdminShell>{children}</AdminShell>
}
