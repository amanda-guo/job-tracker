const pad = (n: number) => String(n).padStart(2, '0')

/** Monday of the week containing `now`, in local time, as `YYYY-MM-DD`. */
export function currentWeekStart(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
