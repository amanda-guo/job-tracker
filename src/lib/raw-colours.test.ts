import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findRawColours } from './raw-colours'

describe('findRawColours', () => {
  it('finds hex colours of every length', () => {
    const found = findRawColours(
      `const a = '#fff'; const b = '#ffff'; const c = '#3E6A93'; const d = '#3E6A9380'`,
    )
    expect(found.map((f) => f.match)).toEqual([
      '#fff',
      '#ffff',
      '#3E6A93',
      '#3E6A9380',
    ])
  })

  it('finds hex colours inside inline styles and arbitrary Tailwind values', () => {
    const found = findRawColours(
      `<p style={{ color: '#ff0000' }} className="bg-[#3E6A93]" />`,
    )
    expect(found.map((f) => f.match)).toEqual(['#ff0000', '#3E6A93'])
  })

  it.each([
    'text-red-500',
    'bg-slate-100',
    'border-gray-200',
    'border-t-zinc-300',
    'ring-blue-400',
    'fill-emerald-600',
    'hover:bg-blue-600',
    'bg-red-500/50',
    'bg-white',
    'text-black',
  ])('finds the built-in Tailwind colour %s', (className) => {
    const found = findRawColours(`<div className="p-4 ${className}" />`)
    expect(found.map((f) => f.match)).toEqual([className])
  })

  it('allows the palette tokens', () => {
    const source = `<div className="bg-canvas bg-surface border-border text-ink text-muted bg-accent text-on-accent text-accent-ink bg-accent-soft text-attention-ink bg-attention-soft text-attention-strong" />`
    expect(findRawColours(source)).toEqual([])
  })

  it('allows non-colour Tailwind classes that share a prefix', () => {
    expect(
      findRawColours(
        `<p className="text-lg text-center border-2 bg-transparent" />`,
      ),
    ).toEqual([])
  })

  it('does not mistake other # text for a colour', () => {
    expect(
      findRawColours(`document.getElementById('#root'); const s = '&#123;'`),
    ).toEqual([])
  })

  it('allows hex values inside the @theme block, where tokens are defined', () => {
    const css = `@theme {\n  --color-ink: #172B3E;\n}\nbody { color: var(--color-ink); }`
    expect(findRawColours(css)).toEqual([])
  })

  it('flags hex values in CSS outside @theme', () => {
    const css = `@theme {\n  --color-ink: #172B3E;\n}\nbody { color: #000000; }`
    expect(findRawColours(css)).toEqual([{ line: 4, match: '#000000' }])
  })

  it('reports the line of each match', () => {
    const found = findRawColours(
      `ok\n<p className="text-red-500" />\nok\nconst c = '#fff'`,
    )
    expect(found).toEqual([
      { line: 2, match: 'text-red-500' },
      { line: 4, match: '#fff' },
    ])
  })
})

// The check itself: runs on every `npm run check`.
describe('src/', () => {
  const srcDir = fileURLToPath(new URL('..', import.meta.url))
  const files = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|tsx|css)$/.test(f))
    // Tests hold example colours on purpose (like this file).
    .filter((f) => !/\.test\.tsx?$/.test(f))

  it('has files to check', () => {
    expect(files).toContain('App.tsx')
    expect(files).toContain('index.css')
  })

  it('uses only colour tokens, never raw colours', () => {
    const problems = files.flatMap((file) =>
      findRawColours(readFileSync(`${srcDir}/${file}`, 'utf8')).map(
        ({ line, match }) => `src/${file}:${line}  ${match}`,
      ),
    )
    expect(problems, 'Use a colour token instead').toEqual([])
  })
})
