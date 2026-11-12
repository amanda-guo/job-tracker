const HEX_6 = /^#[0-9a-f]{6}$/i

/** Relative luminance of a `#RRGGBB` colour, as defined by WCAG 2. */
function relativeLuminance(hex: string): number {
  if (!HEX_6.test(hex)) {
    throw new Error(`Expected a 6-digit hex colour (#RRGGBB), got "${hex}"`)
  }
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * WCAG 2 contrast ratio between two `#RRGGBB` colours, from 1 to 21.
 * The order of the two colours does not matter.
 */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Colour tokens (`--color-<name>: #hex;`) defined inside `@theme` blocks,
 * keyed by name without the `--color-` prefix.
 */
export function readColourTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const block of css.matchAll(/@theme[^{]*\{([^}]*)\}/g)) {
    for (const [, name, value] of block[1].matchAll(
      /--color-([a-z0-9-]+)\s*:\s*(#[0-9a-f]+)\s*;/gi,
    )) {
      tokens[name] = value
    }
  }
  return tokens
}
