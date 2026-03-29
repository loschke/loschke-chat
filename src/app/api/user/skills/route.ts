import { z } from "zod"
import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getUserSkills, countUserSkills, createSkill } from "@/lib/db/queries/skills"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { features } from "@/config/features"

const MAX_USER_SKILLS = 20

/** GET /api/user/skills — List all skills owned by the current user */
export async function GET() {
  if (!features.userSkills.enabled) {
    return Response.json({ error: "User-Skills sind nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const skills = await getUserSkills(auth.user.id)
  return Response.json(skills)
}

const createSchema = z.object({
  content: z.string().min(10).max(100_000),
})

/** POST /api/user/skills — Create a skill from SKILL.md content */
export async function POST(req: Request) {
  if (!features.userSkills.enabled) {
    return Response.json({ error: "User-Skills sind nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
  }

  const skill = parseSkillMarkdown(parsed.data.content)
  if (!skill) {
    return Response.json(
      { error: "Ungültiges SKILL.md-Format. Pflichtfelder: name, slug, description im Frontmatter." },
      { status: 400 },
    )
  }

  // Enforce per-user skill limit
  const count = await countUserSkills(auth.user.id)
  if (count >= MAX_USER_SKILLS) {
    return Response.json(
      { error: `Maximal ${MAX_USER_SKILLS} Fertigkeiten pro Account. Lösche oder bearbeite bestehende.` },
      { status: 400 },
    )
  }

  const result = await createSkill({
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    content: skill.content,
    mode: skill.mode,
    category: skill.category,
    icon: skill.icon,
    fields: skill.fields,
    outputAsArtifact: skill.outputAsArtifact,
    temperature: skill.temperature,
    modelId: skill.modelId,
    userId: auth.user.id,
    isPublic: false,
    isActive: true,
  })

  return Response.json({
    id: result.id,
    slug: result.slug,
    name: result.name,
    mode: result.mode,
  }, { status: 201 })
}
