import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, readColourTokens } from './contrast'

// The real stylesheet, read from disk: the test never holds its own copy
// of the palette values.
const indexCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('contrastRatio (WCAG 2)', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2)
  })

  it('is 1 for a colour on itself', () => {
    expect(contrastRatio('#3E6A93', '#3E6A93')).toBeCloseTo(1, 5)
  })

  it('does not depend on which colour is the text', () => {
    expect(contrastRatio('#172B3E', '#EEF2F8')).toBeCloseTo(
      contrastRatio('#EEF2F8', '#172B3E'),
      10,
    )
  })

  it('matches the known WCAG reference value for #767676 on white', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
  })

  it('ignores letter case', () => {
    expect(contrastRatio('#3e6a93', '#ffffff')).toBe(
      contrastRatio('#3E6A93', '#FFFFFF'),
    )
  })

  it('rejects anything that is not a 6-digit hex colour', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow()
    expect(() => contrastRatio('#FFF', '#FFFFFF')).toThrow()
  })
})

describe('readColourTokens', () => {
  it('reads --color-* tokens from the @theme block', () => {
    const css = `
      @import "tailwindcss";
      @theme {
        --color-*: initial;
        --color-ink: #172B3E;
        --color-accent-soft: #E2EAF3;
        --spacing-page: 1rem;
      }
    `
    expect(readColourTokens(css)).toEqual({
      ink: '#172B3E',
      'accent-soft': '#E2EAF3',
    })
  })

  it('ignores colour variables outside @theme', () => {
    const css = `
      :root { --color-elsewhere: #000000; }
      @theme { --color-ink: #172B3E; }
    `
    expect(readColourTokens(css)).toEqual({ ink: '#172B3E' })
  })
})

describe('palette B in src/index.css', () => {
  const tokens = readColourTokens(indexCss)

  it('defines exactly the palette tokens', () => {
    expect(Object.keys(tokens).sort()).toEqual(
      [
        'canvas',
        'surface',
        'border',
        'ink',
        'muted',
        'accent',
        'accent-ink',
        'accent-soft',
        'on-accent',
        'attention-ink',
        'attention-soft',
        'attention-strong',
      ].sort(),
    )
  })

  // Text / background pairs used in the app. Each must be readable
  // (WCAG AA for normal text: at least 4.5:1).
  it.each([
    ['ink', 'canvas'],
    ['ink', 'surface'],
    ['muted', 'canvas'],
    ['muted', 'surface'],
    ['accent-ink', 'canvas'],
    ['accent-ink', 'surface'],
    ['accent-ink', 'accent-soft'],
    ['on-accent', 'accent'],
    ['attention-ink', 'canvas'],
    ['attention-strong', 'attention-soft'],
  ])('%s on %s is at least 4.5:1', (text, background) => {
    expect(tokens[text], `missing token: ${text}`).toBeDefined()
    expect(tokens[background], `missing token: ${background}`).toBeDefined()
    expect(
      contrastRatio(tokens[text], tokens[background]),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
