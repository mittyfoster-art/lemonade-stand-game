import { z } from 'zod'

// ============================================================================
// Input Validation Schemas
// Validates all user-facing inputs before they reach the game engine.
// ============================================================================

/** HTML tag pattern for sanitisation checks */
const HTML_TAG_PATTERN = /<[^>]*>/

/** Game decision: the three choices a player makes each level */
export const gameDecisionSchema = z.object({
  price: z.number().min(0.25).max(2.0),
  quality: z.number().int().min(1).max(5),
  marketing: z.number().min(0).max(30),
})

export type ValidatedGameDecision = z.infer<typeof gameDecisionSchema>

/** Player display name: 1-20 chars, no HTML tags */
export const playerNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(20, 'Name must be 20 characters or less')
  .refine((val) => !HTML_TAG_PATTERN.test(val), {
    message: 'Name cannot contain HTML tags',
  })

/** Room code: 6+ letters followed by 4 digits (e.g. "CoolLemons4821") */
export const roomCodeSchema = z
  .string()
  .trim()
  .min(1, 'Room code is required')
  .regex(/^[A-Za-z]{6,}[0-9]{4}$/, {
    message: 'Room code must be 6+ letters followed by 4 digits (e.g. CoolRoom1234)',
  })

/**
 * Validate a game decision. Returns the parsed decision or null if invalid.
 * Logs a warning on validation failure for debugging.
 */
export function validateDecision(
  decision: unknown
): ValidatedGameDecision | null {
  const result = gameDecisionSchema.safeParse(decision)
  if (!result.success) {
    console.warn('[Validation] Invalid decision:', result.error.flatten().fieldErrors)
    return null
  }
  return result.data
}

/**
 * Validate a player name. Returns the trimmed name or an error message.
 */
export function validatePlayerName(
  name: unknown
): { success: true; name: string } | { success: false; error: string } {
  const result = playerNameSchema.safeParse(name)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Invalid name' }
  }
  return { success: true, name: result.data }
}

/**
 * Validate a room code. Returns the trimmed code or an error message.
 */
export function validateRoomCode(
  code: unknown
): { success: true; code: string } | { success: false; error: string } {
  const result = roomCodeSchema.safeParse(code)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Invalid room code' }
  }
  return { success: true, code: result.data }
}
