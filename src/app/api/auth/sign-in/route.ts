import { signIn } from "@logto/next/server-actions"
import { redirect } from "next/navigation"
import { logtoConfig } from "@/lib/logto"

export async function GET() {
  try {
    await signIn(logtoConfig, {
      redirectUri: `${logtoConfig.baseUrl}/api/auth/callback`,
      postRedirectUri: `${logtoConfig.baseUrl}/`,
    })
  } catch (error) {
    // Next.js redirect() throws with a digest property — re-throw it
    if (error && typeof error === "object" && "digest" in error) throw error
    redirect("/")
  }
}
