/**
 * Time & timezone helpers for the Time Converter.
 *
 * Everything is computed from the browser's built-in `Intl` data, so DST rules
 * stay correct without bundling a timezone database or touching the network.
 */

export interface ZoneOption {
  /** IANA zone identifier, e.g. `Asia/Jakarta` */
  id: string
  /** Human label, e.g. `Jakarta` */
  label: string
  /** Short zone name shown next to times, e.g. `WIB` */
  abbr: string
  /** Abbreviation used while daylight saving is in effect, e.g. `AEDT`. */
  dstAbbr?: string
}

/** Zones that get a friendly name and a stable abbreviation. */
export const CURATED_ZONES: ZoneOption[] = [
  { id: 'Asia/Jakarta', label: 'Jakarta', abbr: 'WIB' },
  { id: 'Asia/Makassar', label: 'Makassar', abbr: 'WITA' },
  { id: 'Asia/Jayapura', label: 'Jayapura', abbr: 'WIT' },
  { id: 'Asia/Singapore', label: 'Singapore', abbr: 'SGT' },
  { id: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur', abbr: 'MYT' },
  { id: 'Asia/Bangkok', label: 'Bangkok', abbr: 'ICT' },
  { id: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City', abbr: 'ICT' },
  { id: 'Asia/Manila', label: 'Manila', abbr: 'PHT' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong', abbr: 'HKT' },
  { id: 'Asia/Shanghai', label: 'Shanghai', abbr: 'CST' },
  { id: 'Asia/Tokyo', label: 'Tokyo', abbr: 'JST' },
  { id: 'Asia/Seoul', label: 'Seoul', abbr: 'KST' },
  { id: 'Asia/Kolkata', label: 'Bengaluru', abbr: 'IST' },
  { id: 'Asia/Dubai', label: 'Dubai', abbr: 'GST' },
  { id: 'Europe/London', label: 'London', abbr: 'BST' },
  { id: 'Europe/Berlin', label: 'Berlin', abbr: 'CET' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam', abbr: 'CET' },
  { id: 'Europe/Warsaw', label: 'Warsaw', abbr: 'CET' },
  { id: 'America/New_York', label: 'New York', abbr: 'ET' },
  { id: 'America/Chicago', label: 'Chicago', abbr: 'CT' },
  { id: 'America/Denver', label: 'Denver', abbr: 'MT' },
  { id: 'America/Los_Angeles', label: 'San Francisco', abbr: 'PT' },
  { id: 'America/Sao_Paulo', label: 'São Paulo', abbr: 'BRT' },
  { id: 'Australia/Sydney', label: 'Sydney', abbr: 'AEST', dstAbbr: 'AEDT' },
  { id: 'Pacific/Auckland', label: 'Auckland', abbr: 'NZST', dstAbbr: 'NZDT' },
  { id: 'UTC', label: 'UTC', abbr: 'UTC' }
]

/** Zones preloaded for a new draft. */
export const DEFAULT_ZONES = ['Asia/Jakarta', 'Asia/Singapore', 'America/Los_Angeles', 'UTC']

/**
 * Abbreviations accepted as a zone suffix in the input, e.g. `9am SGT` or
 * `2026-10-28 14:30 PDT`. Ambiguous names (CST, IST, BST...) are mapped to the
 * zone a developer is most likely to mean.
 */
export const ZONE_ALIASES: Record<string, string> = {
  wib: 'Asia/Jakarta',
  wita: 'Asia/Makassar',
  wit: 'Asia/Jayapura',
  sgt: 'Asia/Singapore',
  sst: 'Asia/Singapore',
  myt: 'Asia/Kuala_Lumpur',
  ict: 'Asia/Bangkok',
  pht: 'Asia/Manila',
  hkt: 'Asia/Hong_Kong',
  jst: 'Asia/Tokyo',
  kst: 'Asia/Seoul',
  ist: 'Asia/Kolkata',
  gst: 'Asia/Dubai',
  utc: 'UTC',
  gmt: 'UTC',
  z: 'UTC',
  bst: 'Europe/London',
  cet: 'Europe/Berlin',
  cest: 'Europe/Berlin',
  et: 'America/New_York',
  est: 'America/New_York',
  edt: 'America/New_York',
  ct: 'America/Chicago',
  cdt: 'America/Chicago',
  mt: 'America/Denver',
  mdt: 'America/Denver',
  pt: 'America/Los_Angeles',
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
  brt: 'America/Sao_Paulo',
  aest: 'Australia/Sydney',
  aedt: 'Australia/Sydney',
  nzst: 'Pacific/Auckland',
  nzdt: 'Pacific/Auckland'
}

const CURATED_BY_ID = new Map(CURATED_ZONES.map(zone => [zone.id, zone]))

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export interface ClockParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: string
  offsetMinutes: number
  abbr: string
}

interface RawParts extends Omit<ClockParts, 'offsetMinutes' | 'abbr'> {
  timeZoneName: string
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string, locale = 'en-GB'): Intl.DateTimeFormat {
  const key = `${locale}::${timeZone}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      timeZoneName: 'short'
    })
    formatterCache.set(key, formatter)
  }
  return formatter
}

function rawParts(instant: Date, timeZone: string): RawParts {
  const parts = formatterFor(timeZone).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
    second: Number(pick('second')),
    weekday: pick('weekday'),
    timeZoneName: pick('timeZoneName')
  }
}

export function isValidZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Offset of `timeZone` from UTC at a given instant, in minutes (may be negative). */
export function getOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = rawParts(instant, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const truncated = Math.round(instant.getTime() / 1000) * 1000
  return Math.round((asUtc - truncated) / MINUTE_MS)
}

/** Wall-clock breakdown of an instant inside a zone, plus its offset and abbreviation. */
export function getZoneParts(instant: Date, timeZone: string): ClockParts {
  const parts = rawParts(instant, timeZone)
  const offsetMinutes = getOffsetMinutes(instant, timeZone)
  return { ...parts, offsetMinutes, abbr: abbrFor(instant, timeZone, parts.timeZoneName, offsetMinutes) }
}

/** `true` when the zone is observing daylight saving time at that instant. */
export function isDaylightSaving(instant: Date, timeZone: string): boolean {
  const offset = getOffsetMinutes(instant, timeZone)
  const earlier = getOffsetMinutes(new Date(instant.getTime() - 183 * DAY_MS), timeZone)
  const later = getOffsetMinutes(new Date(instant.getTime() + 183 * DAY_MS), timeZone)
  // DST always adds an hour, so the yearly minimum offset is the standard one.
  return offset > Math.min(offset, earlier, later)
}

function abbrFor(instant: Date, timeZone: string, intlName: string, offsetMinutes: number): string {
  // `en-GB` spells out zones that have real abbreviations (CET/CEST, BST, GST);
  // `en-US` covers the North-American ones (PST/PDT, EST/EDT, UTC).
  if (/^[A-Z]{2,6}$/.test(intlName)) return intlName
  const usName = formatterFor(timeZone, 'en-US').formatToParts(instant).find(part => part.type === 'timeZoneName')?.value ?? ''
  if (/^[A-Z]{2,6}$/.test(usName)) return usName
  const curated = CURATED_BY_ID.get(timeZone)
  if (curated) {
    return curated.dstAbbr && isDaylightSaving(instant, timeZone) ? curated.dstAbbr : curated.abbr
  }
  return formatOffset(offsetMinutes)
}

/** `+330` -> `UTC+5:30`, `0` -> `UTC`. */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC'
  const sign = offsetMinutes < 0 ? '-' : '+'
  const total = Math.abs(offsetMinutes)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export interface WallClock {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second?: number
}

/**
 * Turns a wall-clock reading inside `timeZone` into a real instant.
 * Iterates because the zone's offset itself depends on the instant (DST edges).
 */
export function wallClockToInstant(wall: WallClock, timeZone: string): Date {
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second ?? 0)
  let timestamp = asUtc
  for (let hop = 0; hop < 3; hop += 1) {
    const offset = getOffsetMinutes(new Date(timestamp), timeZone)
    const next = asUtc - offset * MINUTE_MS
    if (next === timestamp) break
    timestamp = next
  }
  return new Date(timestamp)
}

export type ParsedKind = 'epoch' | 'absolute' | 'wall-clock'

export interface ParsedTime {
  instant: Date
  /** Zone the input was read in. */
  zone: string
  /** True when the input carried its own zone (`SGT`, `Z`, `+07:00`). */
  explicitZone: boolean
  kind: ParsedKind
}

export type ParseResult = { ok: true, value: ParsedTime } | { ok: false, error: string }

const EPOCH_PATTERN = /^(\d{10}|\d{13}|\d{16}|\d{19})$/

function epochToDate(digits: string): Date {
  const value = Number(digits)
  const millis = digits.length === 10
    ? value * 1000
    : digits.length === 13
      ? value
      : digits.length === 16
        ? value / 1000
        : value / 1_000_000
  return new Date(Math.round(millis))
}

/**
 * Parses a developer-ish time string.
 *
 * Accepted: `14:30`, `2:30pm`, `2026-10-28 14:30`, `2026-10-28T14:30:00Z`,
 * `2026-10-28T14:30:00+07:00`, `28 Oct 2026 14:30`, `Oct 28, 2026 14:30`,
 * `1761688800` / `1761688800000` (and µs/ns epochs), each optionally suffixed
 * with a zone shorthard such as `SGT`, `PDT`, `UTC`, `Z`.
 */
export function parseTimeInput(raw: string, fallbackZone: string, now: Date = new Date()): ParseResult {
  const text = raw.trim()
  if (!text) return { ok: false, error: 'Enter a time, a date-time, or an epoch value.' }

  const epochMatch = text.match(EPOCH_PATTERN)
  if (epochMatch) {
    const instant = epochToDate(epochMatch[1]!)
    if (Number.isNaN(instant.getTime())) return { ok: false, error: 'That epoch value is out of range.' }
    return { ok: true, value: { instant, zone: fallbackZone, explicitZone: false, kind: 'epoch' } }
  }

  let zone = fallbackZone
  let explicitZone = false
  let body = text.replace(/(\d)[Tt](\d)/g, '$1 $2').replace(/\s+/g, ' ')

  // Trailing `Z` (ISO UTC marker): `2026-10-28T14:30:00Z`
  if (/[0-9][Zz]$/.test(body)) {
    zone = 'UTC'
    explicitZone = true
    body = body.slice(0, -1)
  }

  // Trailing zone shorthard: `14:30 SGT`, `9am PDT`, `2026-10-28 14:30 UTC`
  const suffix = body.match(/\s+([A-Za-z]{1,5})\.?$/)
  if (suffix) {
    const resolved = ZONE_ALIASES[suffix[1]!.toLowerCase()]
    if (resolved) {
      zone = resolved
      explicitZone = true
      body = body.slice(0, suffix.index).trim()
    }
  }

  // Trailing numeric offset: `09:00:00+08:00`, `14:30 -0700`, `14:30 UTC+7`.
  // The offset must hang off a clock time (or stand after a space) so that a
  // bare date like `2026-10-28` is never read as an offset.
  const attachedOffset = body.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*([+-])(\d{1,2}):?(\d{2})?$/)
  const spacedOffset = attachedOffset ? null : body.match(/\s(?:UTC|GMT)?\s?([+-])(\d{1,2}):?(\d{2})?$/)
  const offsetMatch = attachedOffset
    ? { sign: attachedOffset[2]!, hours: attachedOffset[3]!, minutes: attachedOffset[4], keep: attachedOffset.index! + attachedOffset[1]!.length }
    : spacedOffset
      ? { sign: spacedOffset[1]!, hours: spacedOffset[2]!, minutes: spacedOffset[3], keep: spacedOffset.index! }
      : null

  if (offsetMatch && Number(offsetMatch.hours) <= 14 && Number(offsetMatch.minutes ?? 0) <= 59) {
    const minutes = Number(offsetMatch.hours) * 60 + Number(offsetMatch.minutes ?? 0)
    zone = offsetToZoneName(offsetMatch.sign === '-' ? -minutes : minutes, fallbackZone)
    explicitZone = true
    body = body.slice(0, offsetMatch.keep).trim()
  }

  let year: number | null = null
  let month: number | null = null
  let day: number | null = null
  let hour: number | null = null
  let minute = 0
  let second = 0

  // 1. YYYY-MM-DD (also YYYY/MM/DD, YYYY.MM.DD)
  let match = body.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) {
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
    body = body.replace(match[0], ' ')
  }

  // 2. `28 Oct 2026` / `28 October 2026`
  if (year === null) {
    match = body.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?[\s,-]+(\d{4})/)
    const name = match?.[2]?.slice(0, 3).toLowerCase()
    if (match && name && MONTH_NAMES[name]) {
      day = Number(match[1])
      month = MONTH_NAMES[name]!
      year = Number(match[3])
      body = body.replace(match[0], ' ')
    }
  }

  // 3. `Oct 28, 2026`
  if (year === null) {
    match = body.match(/([A-Za-z]{3,9})\.?[\s-]+(\d{1,2})(?:st|nd|rd|th)?,?[\s-]+(\d{4})/)
    const name = match?.[1]?.slice(0, 3).toLowerCase()
    if (match && name && MONTH_NAMES[name]) {
      month = MONTH_NAMES[name]!
      day = Number(match[2])
      year = Number(match[3])
      body = body.replace(match[0], ' ')
    }
  }

  // 4. `2:30pm` / `2 pm`
  match = body.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i)
  if (match) {
    hour = (Number(match[1]) % 12) + (match[4]!.toLowerCase() === 'p' ? 12 : 0)
    minute = Number(match[2] ?? 0)
    second = Number(match[3] ?? 0)
    body = body.replace(match[0], ' ')
  } else {
    // 5. `14:30[:15]` or a bare hour is *not* accepted (too ambiguous with dates)
    match = body.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      hour = Number(match[1])
      minute = Number(match[2])
      second = Number(match[3] ?? 0)
      body = body.replace(match[0], ' ')
    }
  }

  const leftover = body.replace(/\b(?:on|at|t)\b/gi, ' ').replace(/[\s,]+/g, '')
  if (leftover) {
    return { ok: false, error: `Could not read "${leftover}" — try 14:30, 2026-10-28 14:30, or 2:30pm SGT.` }
  }

  if (year === null && hour === null) {
    return { ok: false, error: 'No time or date found in that input.' }
  }

  const today = getZoneParts(now, zone)

  if (year === null || month === null || day === null) {
    year = today.year
    month = today.month
    day = today.day
  }

  if (hour === null) hour = 0

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return { ok: false, error: 'That clock reading is out of range.' }
  }

  const wall: WallClock = { year, month, day, hour, minute, second }
  const instant = wallClockToInstant(wall, zone)

  // Rejects nonexistent wall times (e.g. 02:30 on a spring-forward night).
  const verify = rawParts(instant, zone)
  if (verify.year !== wall.year || verify.month !== wall.month || verify.day !== wall.day
    || verify.hour !== wall.hour || verify.minute !== wall.minute) {
    return { ok: false, error: `${formatWallClash(wall)} does not exist in ${zone} (daylight saving gap).` }
  }

  return {
    ok: true,
    value: { instant, zone, explicitZone, kind: explicitZone ? 'absolute' : 'wall-clock' }
  }
}

function formatWallClash(wall: WallClock): string {
  return `${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`
}

/**
 * Finds an IANA zone for a raw UTC offset. Whole-hour offsets outside the
 * curated set fall back to an `Etc/GMT±N` zone, which `Intl` understands.
 */
function offsetToZoneName(offsetMinutes: number, fallbackZone: string): string {
  const hit = CURATED_ZONES.find((zone) => {
    const sample = new Date()
    return getOffsetMinutes(sample, zone.id) === offsetMinutes
  })
  if (hit) return hit.id
  if (offsetMinutes === 0) return 'UTC'
  if (offsetMinutes % 60 === 0) {
    // Etc/GMT signs are inverted relative to the offset.
    const hours = -offsetMinutes / 60
    const candidate = `Etc/GMT${hours > 0 ? '+' : '-'}${Math.abs(hours)}`
    if (isValidZone(candidate)) return candidate
  }
  return fallbackZone
}

export interface FormatOptions {
  hour12?: boolean
}

/** `09:05` or `9:05 AM`. */
export function formatClock(instant: Date, timeZone: string, options: FormatOptions = {}): string {
  const parts = getZoneParts(instant, timeZone)
  const minute = String(parts.minute).padStart(2, '0')
  if (!options.hour12) return `${String(parts.hour).padStart(2, '0')}:${minute}`
  const suffix = parts.hour < 12 ? 'AM' : 'PM'
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  return `${hour12}:${minute} ${suffix}`
}

/** `Wed, 28 Oct 2026` */
export function formatDate(instant: Date, timeZone: string): string {
  const parts = getZoneParts(instant, timeZone)
  const month = Object.keys(MONTH_NAMES)[parts.month - 1] ?? ''
  const name = month.charAt(0).toUpperCase() + month.slice(1)
  return `${parts.weekday}, ${parts.day} ${name} ${parts.year}`
}

/** `YYYY-MM-DD` */
export function formatIsoDate(instant: Date, timeZone: string): string {
  const parts = getZoneParts(instant, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/** `2026-10-28T14:30:00+07:00` */
export function formatIsoDateTime(instant: Date, timeZone: string): string {
  const parts = getZoneParts(instant, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')
  const offset = parts.offsetMinutes === 0
    ? 'Z'
    : `${parts.offsetMinutes > 0 ? '+' : '-'}${pad(Math.floor(Math.abs(parts.offsetMinutes) / 60))}:${pad(Math.abs(parts.offsetMinutes) % 60)}`
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${offset}`
}

/** Difference in calendar days between the zone's date and the anchor zone's date. */
export function dayOffset(instant: Date, timeZone: string, anchorZone: string): number {
  const zoneParts = getZoneParts(instant, timeZone)
  const anchor = getZoneParts(instant, anchorZone)
  const zoneDay = Date.UTC(zoneParts.year, zoneParts.month - 1, zoneParts.day)
  const anchorDay = Date.UTC(anchor.year, anchor.month - 1, anchor.day)
  return Math.round((zoneDay - anchorDay) / DAY_MS)
}

/** `+1h`, `-15h`, `+30m`, `same time` — offset relative to the anchor zone. */
export function relativeOffsetLabel(instant: Date, timeZone: string, anchorZone: string): string {
  const diff = getOffsetMinutes(instant, timeZone) - getOffsetMinutes(instant, anchorZone)
  if (diff === 0) return 'same time'
  const sign = diff > 0 ? '+' : '-'
  const total = Math.abs(diff)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${sign}${minutes}m`
  return minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${minutes}m`
}

/** `in 3 hours`, `2 days ago`, `now`. */
export function formatRelative(instant: Date, now: Date = new Date()): string {
  const diff = instant.getTime() - now.getTime()
  const absolute = Math.abs(diff)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (absolute < 45_000) return 'now'
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * DAY_MS],
    ['month', 30 * DAY_MS],
    ['week', 7 * DAY_MS],
    ['day', DAY_MS],
    ['hour', 3_600_000],
    ['minute', MINUTE_MS]
  ]
  for (const [unit, size] of units) {
    if (absolute >= size) return formatter.format(Math.round(diff / size), unit)
  }
  return formatter.format(Math.round(diff / 1000), 'second')
}

/** `Asia/Jakarta` -> `Jakarta`, `America/Argentina/Buenos_Aires` -> `Buenos Aires`. */
export function zoneCity(timeZone: string): string {
  const curated = CURATED_BY_ID.get(timeZone)
  if (curated) return curated.label
  if (timeZone === 'UTC') return 'UTC'
  const tail = timeZone.split('/').pop() ?? timeZone
  return tail.replace(/_/g, ' ')
}

let supportedZonesCache: string[] | null = null

/** Every IANA zone the browser knows about, curated ones first. */
export function listTimeZones(): string[] {
  if (supportedZonesCache) return supportedZonesCache
  let zones: string[] = []
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  if (typeof supported === 'function') {
    try {
      zones = supported('timeZone')
    } catch {
      zones = []
    }
  }
  if (zones.length === 0) zones = CURATED_ZONES.map(zone => zone.id)
  const curated = CURATED_ZONES.map(zone => zone.id).filter(id => zones.includes(id))
  const rest = zones.filter(id => !curated.includes(id))
  supportedZonesCache = [...curated, ...rest]
  return supportedZonesCache
}

/** Hours that are reasonable to meet in, used by the overlap grid to shade cells. */
export function hourTone(hour: number): 'core' | 'edge' | 'off' {
  if (hour >= 9 && hour < 18) return 'core'
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 22)) return 'edge'
  return 'off'
}

/** Compact hour label for the overlap grid: `09`, or `9a` in 12-hour mode. */
export function compactHour(hour: number, hour12: boolean): string {
  if (!hour12) return String(hour).padStart(2, '0')
  const suffix = hour < 12 ? 'a' : 'p'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}${suffix}`
}
