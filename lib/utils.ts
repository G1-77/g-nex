/** Tiny className combiner (no external dep). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * crypto.randomUUID() throws on non-secure origins (plain-HTTP LAN testing),
 * which used to silently kill trade submission. Fall back to a v4-formatted
 * id from the same Web Crypto source.
 */
export function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // fall through to manual formatting
    }
  }
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}