import { useId } from 'react'

/*
 * The pullhaus mark: a can's pull tab, drawn in ink.
 *
 * The finger ring is cut out (mask), and the rivet is the single red "eye"
 * dot: the one point of accent colour in the logo. Helius Privacy Rings red.
 */

export const BRAND_RED = '#e84125'
const INK = '#15130f'
const BODY = 'M32 3 C45 3 52 10 52 19.5 C52 24 50 27.5 47 30 L47 50 C47 56 43 61 37 61 L27 61 C21 61 17 56 17 50 L17 30 C14 27.5 12 24 12 19.5 C12 10 19 3 32 3 Z'

type Props = {
  size?: number
  /** Body colour (ink by default; paper on the dark CTA band). */
  color?: string
  /** The rivet "eye" colour. */
  dot?: string
  className?: string
  /** Accessible name; omit when decorative (e.g. next to the wordmark). */
  title?: string
}

export function Mark({ size = 28, color = INK, dot = BRAND_RED, className, title }: Props) {
  const id = 'ph' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" className={className}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <ellipse cx="32" cy="19.5" rx="9.5" ry="7.5" fill="#000" />
          <circle cx="32" cy="45" r="5.6" fill="#000" />
        </mask>
      </defs>
      <path d={BODY} fill={color} mask={`url(#${id})`} />
      <circle cx="32" cy="45" r="4.2" fill={dot} />
    </svg>
  )
}

/** Mark + serif "pullhaus" wordmark. */
export function Wordmark({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <span className="wordmark" style={{ fontSize: size * 1.12, gap: size * 0.34, color }}>
      <Mark size={size} color={color} />
      <span>pullhaus</span>
    </span>
  )
}
