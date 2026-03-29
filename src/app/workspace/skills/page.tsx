import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserSkills } from "@/lib/db/queries/skills"
import { WorkspaceSkills } from "@/components/workspace/workspace-skills"
import { features } from "@/config/features"

export const dynamic = "force-dynamic"

export default async function WorkspaceSkillsPage() {
  if (!features.userSkills.enabled) redirect("/workspace")

  const user = await getUser()
  if (!user) redirect("/")

  let skills: Awaited<ReturnType<typeof getUserSkills>> = []
  try {
    skills = await getUserSkills(user.id)
  } catch {
    // Table may not exist yet
  }

  return <WorkspaceSkills initialSkills={skills} />
}
