/** A short age: "45s", "3m", "5h", "42d", "7mo", "2y"; "—" for an invalid date. */
export function relativeAge(from: string, now: string): string {
  const seconds = Math.floor((Date.parse(now) - Date.parse(from)) / 1000)
  if (Number.isNaN(seconds)) return '—'
  const s = Math.max(0, seconds)
  const minutes = Math.floor(s / 60)
  const hours = Math.floor(s / 3600)
  const days = Math.floor(s / 86400)
  if (s < 60) return `${s}s`
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 60) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}
