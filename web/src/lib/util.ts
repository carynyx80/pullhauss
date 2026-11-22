const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export const hex = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
export const b58 = (n: number) =>
  Array.from({ length: n }, () => B58[Math.floor(Math.random() * B58.length)]).join('')
export const rid = () => hex(12)
export const short = (s: string, a = 4, b = 4) => (s.length <= a + b + 1 ? s : `${s.slice(0, a)}…${s.slice(-b)}`)

export const fmt = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const usd = (n: number) => '$' + fmt(n, 2)

export function ago(t: number) {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
export function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}
