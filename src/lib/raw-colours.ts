export type RawColour = { line: number; match: string }

// #RGB, #RGBA, #RRGGBB or #RRGGBBAA. Not part of a word (`a#fff`) or an HTML
// entity (`&#123;`), and not followed by more word characters (`#root`).
const HEX =
  /(?<![&\w])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi

const COLOUR_UTILITIES = [
  'bg',
  'text',
  'border(?:-[xytrblse])?',
  'outline',
  'ring(?:-offset)?',
  'inset-ring',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'text-shadow',
  'decoration',
  'divide',
  'fill',
  'stroke',
  'from',
  'via',
  'to',
  'accent',
  'caret',
  'placeholder',
].join('|')

const TAILWIND_COLOURS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'taupe',
  'mauve',
  'mist',
  'olive',
  'black',
  'white',
].join('|')

// Optional variants, a colour utility, a built-in colour, then an optional
// shade and opacity. Examples are in raw-colours.test.ts.
const TAILWIND_COLOUR = new RegExp(
  `(?<![\\w:-])(?:[\\w-]+:)*(?:${COLOUR_UTILITIES})-(?:${TAILWIND_COLOURS})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
  'g',
)

/** Blank out `@theme` blocks (where tokens are defined), keeping line numbers. */
function withoutThemeBlocks(source: string): string {
  return source.replace(/@theme[^{]*\{[^}]*\}/g, (block) =>
    block.replace(/[^\n]/g, ' '),
  )
}

/**
 * Hex colours and built-in Tailwind colour classes in `source`, in order.
 * Colours inside `@theme` blocks are allowed: that is where tokens live.
 */
export function findRawColours(source: string): RawColour[] {
  return withoutThemeBlocks(source)
    .split('\n')
    .flatMap((text, index) =>
      [...text.matchAll(HEX), ...text.matchAll(TAILWIND_COLOUR)]
        .sort((a, b) => a.index - b.index)
        .map((m) => ({ line: index + 1, match: m[0] })),
    )
}
