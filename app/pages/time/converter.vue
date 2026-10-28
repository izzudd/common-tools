<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

interface TimeConverterDraft {
  input: string
  sourceZone: string
  zones: string[]
  hour12: boolean
  live: boolean
}

const { state: draft, clearDraft } = useToolDraft<TimeConverterDraft>('time-converter', () => ({
  input: '',
  sourceZone: 'Asia/Jakarta',
  zones: [...DEFAULT_ZONES],
  hour12: false,
  live: false
}))

const { copyToClipboard } = useClipboardAction()

const tick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

function startTicking() {
  if (timer) return
  tick.value = Date.now()
  timer = setInterval(() => {
    tick.value = Date.now()
  }, 1000)
}

function stopTicking() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

onMounted(() => {
  // Drafts written by older versions of this page may miss fields.
  if (!draft.value.sourceZone || !isValidZone(draft.value.sourceZone)) draft.value.sourceZone = 'Asia/Jakarta'
  const stored = Array.isArray(draft.value.zones) ? draft.value.zones.filter(isValidZone) : []
  draft.value.zones = stored.length > 0 ? stored : [...DEFAULT_ZONES]
  if (draft.value.live) startTicking()
})

onBeforeUnmount(stopTicking)

watch(() => draft.value.live, (live) => {
  if (live) startTicking()
  else stopTicking()
})

const activeZones = computed<string[]>(() => {
  const zones = Array.isArray(draft.value.zones) ? draft.value.zones.filter(isValidZone) : []
  return zones.length > 0 ? zones : [...DEFAULT_ZONES]
})

const parsed = computed(() => parseTimeInput(draft.value.input, draft.value.sourceZone || 'Asia/Jakarta', new Date(tick.value)))

const isEmptyInput = computed(() => !draft.value.input.trim())

/** The instant everything is converted from. Live mode ignores the typed value. */
const reference = computed<Date | null>(() => {
  if (draft.value.live) return new Date(tick.value)
  return parsed.value.ok ? parsed.value.value.instant : null
})

/** Zone the input belongs to: an explicit suffix wins over the picker. */
const anchorZone = computed(() => {
  if (!draft.value.live && parsed.value.ok && parsed.value.value.explicitZone) return parsed.value.value.zone
  return draft.value.sourceZone || 'Asia/Jakarta'
})

const anchor = computed(() => {
  const instant = reference.value
  if (!instant) return null
  const parts = getZoneParts(instant, anchorZone.value)
  return {
    instant,
    parts,
    clock: formatClock(instant, anchorZone.value, { hour12: draft.value.hour12 }),
    date: formatDate(instant, anchorZone.value),
    offset: formatOffset(parts.offsetMinutes),
    iso: formatIsoDateTime(instant, anchorZone.value),
    utcIso: formatIsoDateTime(instant, 'UTC'),
    epochSeconds: Math.floor(instant.getTime() / 1000),
    epochMillis: instant.getTime(),
    relative: formatRelative(instant, new Date(tick.value)),
    dst: isDaylightSaving(instant, anchorZone.value),
    explicit: !draft.value.live && parsed.value.ok && parsed.value.value.explicitZone
  }
})

interface ZoneRow {
  id: string
  city: string
  abbr: string
  clock: string
  date: string
  offset: string
  dayDelta: number
  vsAnchor: string
  dst: boolean
  anchored: boolean
}

const rows = computed<ZoneRow[]>(() => {
  const instant = reference.value
  if (!instant) return []
  const anchorParts = getZoneParts(instant, anchorZone.value)
  return activeZones.value.map((zone) => {
    const parts = getZoneParts(instant, zone)
    const sameZone = parts.offsetMinutes === anchorParts.offsetMinutes && zone === anchorZone.value
    return {
      id: zone,
      city: zoneCity(zone),
      abbr: parts.abbr,
      clock: formatClock(instant, zone, { hour12: draft.value.hour12 }),
      date: formatDate(instant, zone),
      offset: formatOffset(parts.offsetMinutes),
      dayDelta: dayOffset(instant, zone, anchorZone.value),
      vsAnchor: relativeOffsetLabel(instant, zone, anchorZone.value),
      dst: isDaylightSaving(instant, zone),
      anchored: sameZone
    }
  })
})

const summary = computed(() => {
  if (!anchor.value) return ''
  const lines = [
    `${anchor.value.date} ${anchor.value.clock} ${anchor.value.parts.abbr} (${anchorZone.value})`
  ]
  for (const row of rows.value) {
    if (row.id === anchorZone.value) continue
    const dayHint = row.dayDelta === 0 ? '' : ` ${row.dayDelta > 0 ? '(+1 day)' : '(-1 day)'}`
    lines.push(`${row.city}: ${row.date} ${row.clock} ${row.abbr}${dayHint}`)
  }
  return lines.join('\n')
})

const zoneItems = computed(() => listTimeZones().map(id => ({ label: `${zoneCity(id)} — ${id}`, value: id })))
const availableZoneItems = computed(() => zoneItems.value.filter(item => !activeZones.value.includes(item.value)))

const addZoneTarget = ref<string | undefined>(undefined)

function handleAddZone(value: string | undefined) {
  if (!value || activeZones.value.includes(value)) return
  draft.value.zones = [...activeZones.value, value]
  addZoneTarget.value = undefined
}

function removeZone(zone: string) {
  draft.value.zones = activeZones.value.filter(item => item !== zone)
}

function loadSample() {
  draft.value.live = false
  draft.value.input = '9:00 AM SGT'
  draft.value.sourceZone = 'Asia/Singapore'
}

function clearAll() {
  clearDraft()
  draft.value.live = false
  stopTicking()
}

function useNow() {
  const now = new Date()
  draft.value.live = false
  draft.value.sourceZone = anchorZone.value
  draft.value.input = `${formatIsoDate(now, anchorZone.value)} ${formatClock(now, anchorZone.value)}`
}

function toggleLive() {
  draft.value.live = !draft.value.live
}

/** Shift the reference instant and write the result back as a readable input. */
function nudge(milliseconds: number) {
  const instant = reference.value
  if (!instant) return
  const shifted = new Date(instant.getTime() + milliseconds)
  draft.value.live = false
  // Keep reading the written wall clock in the same zone it was rendered in.
  draft.value.sourceZone = anchorZone.value
  draft.value.input = `${formatIsoDate(shifted, anchorZone.value)} ${formatClock(shifted, anchorZone.value)}`
}

const anchorDayHours = computed(() => {
  const instant = reference.value
  if (!instant) return []
  const parts = getZoneParts(instant, anchorZone.value)
  const midnight = wallClockToInstant(
    { year: parts.year, month: parts.month, day: parts.day, hour: 0, minute: 0, second: 0 },
    anchorZone.value
  )
  return Array.from({ length: 24 }, (_, hour) => new Date(midnight.getTime() + hour * 3_600_000))
})

const overlapCells = computed(() => {
  if (anchorDayHours.value.length === 0) return []
  return rows.value.map(row => ({
    id: row.id,
    city: row.city,
    abbr: row.abbr,
    cells: anchorDayHours.value.map((instant) => {
      const hour = getZoneParts(instant, row.id).hour
      return { hour, tone: hourTone(hour), label: compactHour(hour, draft.value.hour12) }
    })
  }))
})

function toneClass(tone: 'core' | 'edge' | 'off'): string {
  if (tone === 'core') return 'bg-emerald-500/35 text-emerald-800 dark:text-emerald-100 font-semibold'
  if (tone === 'edge') return 'bg-emerald-500/15 text-emerald-700/90 dark:text-emerald-300/80'
  return 'bg-neutral-500/10 text-muted/70'
}

function copyRow(row: ZoneRow) {
  copyToClipboard(`${row.date} ${row.clock} ${row.abbr} (${row.city})`, `${row.city} time copied!`)
}
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      tool-id="time-converter"
      title="Time Zone Converter"
      description="Turn any timestamp into WIB, SGT, PT, or any of 445 zones — with DST handled, day shifts flagged, and a working-hours overlap grid for scheduling."
      icon="i-lucide-globe-2"
      category="Time Tools"
      badge="DST-aware"
      :copy-text="summary"
      :disable-copy="!summary"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Input zone:</span>
            <USelectMenu
              v-model="draft.sourceZone"
              :items="zoneItems"
              value-key="value"
              placeholder="Search a zone..."
              icon="i-lucide-map-pin"
              size="sm"
              class="w-64"
            />
          </div>

          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Clock:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="!draft.hour12 ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.hour12 = false"
              >
                24h
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="draft.hour12 ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.hour12 = true"
              >
                12h
              </button>
            </div>
          </div>

          <UButton
            :icon="draft.live ? 'i-lucide-pause' : 'i-lucide-radio'"
            :label="draft.live ? 'Live clock on' : 'Live clock'"
            :color="draft.live ? 'primary' : 'neutral'"
            :variant="draft.live ? 'solid' : 'outline'"
            size="sm"
            @click="toggleLive"
          />
        </div>
      </template>
    </ToolHeader>

    <!-- Input + anchor result -->
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div class="xl:col-span-2 flex flex-col rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-clock"
              class="size-4"
            />
            Time or epoch to convert
          </span>
          <span class="font-mono text-[11px]">{{ draft.live ? 'live' : 'editable' }}</span>
        </div>

        <div class="p-3.5 space-y-3">
          <UInput
            v-model="draft.input"
            :disabled="draft.live"
            placeholder="9:00 AM SGT  ·  2026-10-28 14:30  ·  2026-10-28T14:30:00+08:00  ·  1793169000"
            icon="i-lucide-keyboard"
            size="lg"
            class="w-full font-mono"
            autocomplete="off"
            spellcheck="false"
          />

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              icon="i-lucide-clock-arrow-down"
              label="Now"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="draft.live"
              @click="useNow"
            />
            <UButton
              icon="i-lucide-minus"
              label="1h"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!reference"
              title="Move the time back 1 hour"
              @click="nudge(-3_600_000)"
            />
            <UButton
              icon="i-lucide-plus"
              label="1h"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!reference"
              title="Move the time forward 1 hour"
              @click="nudge(3_600_000)"
            />
            <UButton
              icon="i-lucide-sunrise"
              label="Tomorrow"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!reference"
              @click="nudge(86_400_000)"
            />
          </div>

          <div class="text-[11px] text-muted leading-relaxed border-t border-default/60 pt-2.5 space-y-1">
            <p>
              Accepted: <code class="font-mono text-highlighted">14:30</code>,
              <code class="font-mono text-highlighted">2:30pm</code>,
              <code class="font-mono text-highlighted">2026-10-28 14:30</code>,
              <code class="font-mono text-highlighted">28 Oct 2026 14:30</code>,
              ISO 8601, and epoch seconds / ms / µs / ns.
            </p>
            <p>
              Add a zone suffix to override the picker:
              <code class="font-mono text-highlighted">SGT</code>,
              <code class="font-mono text-highlighted">PDT</code>,
              <code class="font-mono text-highlighted">WIB</code>,
              <code class="font-mono text-highlighted">UTC</code>,
              or an offset like <code class="font-mono text-highlighted">+08:00</code>.
            </p>
          </div>
        </div>
      </div>

      <!-- Anchor result -->
      <div class="xl:col-span-3 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div
          v-if="anchor"
          class="space-y-3"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
              class="font-mono"
            >
              <UIcon
                name="i-lucide-map-pin"
                class="size-3.5 mr-1"
              />
              {{ anchorZone }}
            </UBadge>
            <UBadge
              v-if="anchor.explicit"
              color="success"
              variant="subtle"
              size="sm"
            >
              zone read from input
            </UBadge>
            <UBadge
              v-if="anchor.dst"
              color="warning"
              variant="subtle"
              size="sm"
            >
              DST active
            </UBadge>
            <span class="text-muted">{{ anchor.relative }}</span>
          </div>

          <div class="flex flex-wrap items-end gap-x-3 gap-y-1">
            <div class="text-4xl sm:text-5xl font-bold tracking-tight font-mono text-highlighted">
              {{ anchor.clock }}
            </div>
            <div class="pb-1.5 space-y-0.5">
              <div class="font-mono text-sm text-primary font-semibold">
                {{ anchor.parts.abbr }} · {{ anchor.offset }}
              </div>
              <div class="text-xs text-muted">
                {{ anchor.date }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="space-y-2 py-6"
        >
          <div class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-info"
              class="size-4 text-primary"
            />
            {{ isEmptyInput ? 'Enter a time to convert' : 'Input not recognised' }}
          </div>
          <p class="text-xs text-muted max-w-md leading-relaxed">
            {{ isEmptyInput
              ? 'Type a clock time, a date-time, or paste an epoch value. Picking a zone suffix such as SGT or PDT overrides the input zone.'
              : (!parsed.ok ? parsed.error : '') }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <UButton
              label="Now"
              size="xs"
              color="neutral"
              variant="outline"
              @click="useNow"
            />
            <UButton
              label="9:00 AM SGT"
              size="xs"
              color="neutral"
              variant="outline"
              @click="draft.input = '9:00 AM SGT'"
            />
            <UButton
              label="2026-10-28 14:30 PDT"
              size="xs"
              color="neutral"
              variant="outline"
              @click="draft.input = '2026-10-28 14:30 PDT'"
            />
          </div>
        </div>

        <!-- Machine-readable values -->
        <div
          v-if="anchor"
          class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
        >
          <button
            v-for="item in [
              { label: 'Epoch (s)', value: String(anchor.epochSeconds) },
              { label: 'Epoch (ms)', value: String(anchor.epochMillis) },
              { label: 'ISO 8601 (UTC)', value: anchor.utcIso },
              { label: 'ISO 8601 (local)', value: anchor.iso },
              { label: 'Date', value: anchor.date },
              { label: 'Zone', value: `${anchorZone} (${anchor.parts.abbr}) ${anchor.offset}` }
            ]"
            :key="item.label"
            type="button"
            :title="`${item.label}: ${item.value}`"
            class="group text-left px-2.5 py-2 rounded-lg border border-default/70 bg-neutral-100/60 dark:bg-neutral-900/60 hover:border-primary/50 transition-colors"
            @click="copyToClipboard(item.value, `${item.label} copied!`)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] uppercase tracking-wide text-muted">{{ item.label }}</span>
              <UIcon
                name="i-lucide-copy"
                class="size-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div class="font-mono text-[11px] text-highlighted truncate mt-0.5">
              {{ item.value }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Zone cards -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon
            name="i-lucide-languages"
            class="size-4 text-primary"
          />
          Same instant, other zones
        </h3>
        <div class="flex items-center gap-2">
          <USelectMenu
            :model-value="addZoneTarget"
            :items="availableZoneItems"
            value-key="value"
            placeholder="Add a zone..."
            icon="i-lucide-plus"
            size="xs"
            class="w-56"
            @update:model-value="handleAddZone"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <div
          v-for="row in rows"
          :key="row.id"
          class="group relative rounded-xl border bg-neutral-100/40 dark:bg-neutral-900/40 p-3.5 transition-colors"
          :class="row.id === anchorZone ? 'border-primary/50' : 'border-default hover:border-primary/30'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-semibold text-highlighted truncate">{{ row.city }}</span>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="font-mono"
                >
                  {{ row.abbr }}
                </UBadge>
                <UBadge
                  v-if="row.dayDelta !== 0"
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  {{ row.dayDelta > 0 ? '+1 day' : '−1 day' }}
                </UBadge>
              </div>
              <div class="text-[10px] text-muted font-mono mt-0.5">
                {{ row.offset }} · {{ row.vsAnchor }}
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                class="p-1 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                :title="`Copy ${row.city} time`"
                @click="copyRow(row)"
              >
                <UIcon
                  name="i-lucide-copy"
                  class="size-3.5"
                />
              </button>
              <button
                type="button"
                class="p-1 rounded-md text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                :title="`Remove ${row.city}`"
                @click="removeZone(row.id)"
              >
                <UIcon
                  name="i-lucide-x"
                  class="size-3.5"
                />
              </button>
            </div>
          </div>

          <div class="mt-2 flex items-baseline gap-2">
            <span class="font-mono text-2xl font-bold tracking-tight text-highlighted">
              {{ row.clock }}
            </span>
            <span class="text-[11px] text-muted truncate">{{ row.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlap planner -->
    <div
      v-if="overlapCells.length > 0"
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon
            name="i-lucide-calendar-clock"
            class="size-4 text-primary"
          />
          Overlap planner
        </h3>
        <div class="flex items-center gap-3 text-[10px] text-muted">
          <span class="flex items-center gap-1">
            <span class="size-2.5 rounded-sm bg-emerald-500/40" />
            09–18 local
          </span>
          <span class="flex items-center gap-1">
            <span class="size-2.5 rounded-sm bg-emerald-500/15" />
            07–09 / 18–22
          </span>
          <span class="flex items-center gap-1">
            <span class="size-2.5 rounded-sm bg-neutral-500/10" />
            night
          </span>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/30 overflow-x-auto">
        <div class="min-w-[640px] p-3 space-y-1">
          <div
            class="grid items-center gap-1 text-[10px] text-muted font-mono"
            :style="{ gridTemplateColumns: `110px repeat(24, minmax(0, 1fr))` }"
          >
            <span class="pl-1 truncate">{{ zoneCity(anchorZone) }} time</span>
            <span
              v-for="(instant, hour) in anchorDayHours"
              :key="`head-${hour}`"
              class="text-center"
            >
              {{ compactHour(getZoneParts(instant, anchorZone).hour, draft.hour12) }}
            </span>
          </div>

          <div
            v-for="row in overlapCells"
            :key="`lane-${row.id}`"
            class="grid items-center gap-1"
            :style="{ gridTemplateColumns: `110px repeat(24, minmax(0, 1fr))` }"
          >
            <span
              class="pl-1 text-[11px] font-medium truncate"
              :class="row.id === anchorZone ? 'text-primary' : 'text-highlighted'"
            >
              {{ row.city }}
              <span class="text-muted font-mono text-[10px]">{{ row.abbr }}</span>
            </span>
            <div
              v-for="(cell, index) in row.cells"
              :key="`${row.id}-${index}`"
              class="h-6 rounded-sm flex items-center justify-center font-mono text-[10px]"
              :class="toneClass(cell.tone)"
              :title="`${row.city} ${String(cell.hour).padStart(2, '0')}:00`"
            >
              {{ cell.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
