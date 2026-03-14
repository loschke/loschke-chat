import { getAllSkills } from "@/lib/db/queries/skills"
import { SkillsAdmin } from "@/components/admin/skills-admin"

export const dynamic = "force-dynamic"

export default async function AdminSkillsPage() {
  let skills: Awaited<ReturnType<typeof getAllSkills>> = []
  try {
    skills = await getAllSkills()
  } catch {
    // Table may not exist yet — show empty list
  }

  return <SkillsAdmin initialSkills={skills} />
}
