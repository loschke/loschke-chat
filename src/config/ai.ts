import { getDefaultModel } from "./models"

/**
 * Shared AI defaults used by both chat and assistant configs.
 */
export const aiDefaults = {
  get model() {
    return getDefaultModel().id
  },
  temperature: 0.7,
} as const
