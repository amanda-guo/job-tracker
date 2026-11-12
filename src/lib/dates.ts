const pad = (n: number) => String(n).padStart(2, '0')

/** Monday of the week containing `now`, in local time, as `YYYY-MM-DD`. */
export function currentWeekStart(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Label for the week containing `now`, e.g. "Week of Nov 9" (its Monday,
 * in local time). Fixed English month names, so it reads the same on
 * every device.
 */
export function weekLabel(now: Date = new Date()): string {
  const [, month, day] = currentWeekStart(now).split('-').map(Number)
  return `Week of ${MONTHS[month - 1]} ${day}`
}
