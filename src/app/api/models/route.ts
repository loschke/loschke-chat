import { requireAuth } from "@/lib/api-guards"
import { getPublicModels, getModelsByCategory } from "@/config/models"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  return Response.json({
    models: getPublicModels(),
    groups: getModelsByCategory(),
  })
}
