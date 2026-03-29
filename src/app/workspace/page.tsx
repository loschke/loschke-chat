import { redirect } from "next/navigation"
import { features } from "@/config/features"

export default function WorkspacePage() {
  redirect(features.userSkills.enabled ? "/workspace/skills" : "/workspace/experts")
}
