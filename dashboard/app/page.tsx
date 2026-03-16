'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Droplets, Sparkles, AlertCircle, CalendarX2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SwimEvent {
  city: string
  center: string
  facility: string
  activity: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  source: string
}

interface Schedule {
  generated_at: string
  total_events: number
  events: SwimEvent[]
}

// ── Activity classification ────────────────────────────────────────────────────
// Explicit lists reviewed and confirmed 2026-02-18.
// Any activity not in FAMILY_ACTIVITIES is treated as adult.

const FAMILY_ACTIVITIES = new Set([
  'Combo Swim',
  'Combo Swim (slide closed)',
  'Drop In Snoezelen Pool Program',
  'Free Fun Swim: Caribbean Vibes',
  'Fun & Lane Swim For Women & Girls',
  'Fun Swim',
  'Fun Swim For Women and Girls',
  'Fun Swim For Women and Girls - Therapeutic Pool',
  'Fun Swim with Lane For Men and Boys',
  'Fun Swim with Lane For Women and Girls',
  'Lane & Fun Swim',
  'Leisure Swim',
  'Leisure Swim (leisure pool only)',
  'Leisure Swim - Leisure Pool Only',
  'Parent & Tot Swim',
  'Sensory Friendly Swim',
  'Sensory Swim',
])

const SENSORY_ACTIVITIES = new Set([
  'Sensory Swim',
  'Sensory Friendly Swim',
  'Drop In Snoezelen Pool Program',
])

function isFamilyActivity(activity: string): boolean {
  return FAMILY_ACTIVITIES.has(activity)
}

function isSensoryActivity(activity: string): boolean {
  return SENSORY_ACTIVITIES.has(activity)
}

function isAdultActivity(activity: string): boolean {
  return !FAMILY_ACTIVITIES.has(activity)
}

// ── City styling ──────────────────────────────────────────────────────────────

const CITY_STYLES: Record<string, { badge: string; border: string }> = {
  Oakville: {
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400/20',
    border: 'border-l-blue-500 dark:border-l-blue-400',
  },
  Burlington: {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20',
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
  },
  Mississauga: {
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-400/20',
    border: 'border-l-indigo-500 dark:border-l-indigo-400',
  },
}

const DEFAULT_STYLE = {
  badge: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-700/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20',
  border: 'border-l-slate-400 dark:border-l-slate-500',
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getNowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getNextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatDateTab(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const today = getTodayString()
  if (dateStr === today) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isActiveNow(event: SwimEvent, todayStr: string, nowMin: number): boolean {
  if (event.date !== todayStr) return false
  const start = toMinutes(event.start_time)
  const end = toMinutes(event.end_time)
  return nowMin >= start && nowMin < end
}

function isStartingSoon(event: SwimEvent, todayStr: string, nowMin: number): boolean {
  if (event.date !== todayStr) return false
  const start = toMinutes(event.start_time)
  return start > nowMin && start - nowMin <= 90
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event, highlight }: { event: SwimEvent; highlight?: 'now' | 'soon' }) {
  const style = CITY_STYLES[event.city] ?? DEFAULT_STYLE
  const sensory = isSensoryActivity(event.activity)

  return (
    <div
      className={[
        'rounded-xl border border-l-[6px] border-slate-200 p-4 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900/50 dark:border-slate-800 dark:hover:bg-slate-800/80',
        style.border,
        sensory ? 'ring-2 ring-amber-300 bg-amber-50/50 dark:ring-amber-500/50 dark:bg-amber-900/10' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Sensory badge */}
      {sensory && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold tracking-wide uppercase text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50">
          <Sparkles className="w-3 h-3" />
          SENSORY SWIM
        </div>
      )}

      {/* Activity name */}
      <div className="font-semibold text-slate-900 text-base leading-tight mb-2 dark:text-slate-100">
        {event.activity}
      </div>

      {/* Center name */}
      <div className="flex items-start gap-1.5 text-slate-600 text-sm mb-4 dark:text-slate-400">
        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5 dark:text-slate-500" />
        <span className="leading-snug font-medium">{event.center}</span>
      </div>

      {/* Bottom row: city badge + time */}
      <div className="flex items-center justify-between gap-2 flex-wrap mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.badge}`}>
          {event.city}
        </span>
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {formatTime(event.start_time)} – {formatTime(event.end_time)}
        </div>
      </div>

      {/* Status badge */}
      {highlight === 'now' && (
        <div className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse dark:bg-emerald-400" />
          OPEN NOW
        </div>
      )}
      {highlight === 'soon' && (
        <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-inset ring-amber-600/10 dark:ring-amber-400/20">
          <AlertCircle className="w-3.5 h-3.5" />
          STARTING SOON
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SwimDashboard() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'family' | 'adult'>('family')
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [selectedCity, setSelectedCity] = useState<string>('All')

  const dates = getNextDays(4)
  const cities = ['All', 'Oakville', 'Burlington', 'Mississauga']

  useEffect(() => {
    fetch('/schedule.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch schedule (${r.status})`)
        return r.json()
      })
      .then((data: Schedule) => {
        setSchedule(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 dark:text-slate-400 text-lg space-y-4">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin dark:border-slate-800 dark:border-t-blue-500" />
        <p className="font-medium animate-pulse">Loading schedule…</p>
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 dark:text-red-400 text-center px-4">
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl ring-1 ring-inset ring-red-600/10 dark:ring-red-500/20 max-w-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-red-800 dark:text-red-300">Could not load schedule.</p>
          <p className="text-sm mt-2 text-red-600/80 dark:text-red-400/80">{error}</p>
        </div>
      </div>
    )
  }

  // Filter events by date, city, and mode
  const filteredEvents = schedule.events
    .filter((e) => {
      if (e.date !== selectedDate) return false
      if (selectedCity !== 'All' && e.city !== selectedCity) return false
      return mode === 'family' ? isFamilyActivity(e.activity) : isAdultActivity(e.activity)
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Partition into active/soon vs later (only relevant for Today)
  const todayStr = getTodayString()
  const nowMin = getNowMinutes()
  const isToday = selectedDate === todayStr

  const activeNow = isToday ? filteredEvents.filter((e) => isActiveNow(e, todayStr, nowMin)) : []
  const startingSoon = isToday ? filteredEvents.filter((e) => isStartingSoon(e, todayStr, nowMin)) : []
  const laterEvents = filteredEvents.filter(
    (e) => !isActiveNow(e, todayStr, nowMin) && !isStartingSoon(e, todayStr, nowMin)
  )
  const hasHighlighted = activeNow.length > 0 || startingSoon.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl ring-1 ring-inset ring-blue-500/20 dark:ring-blue-400/20">
            <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          Swim Dashboard
        </h1>

        {/* Mode toggle */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center shadow-inner ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
          <button
            onClick={() => setMode('family')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'family'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Family
          </button>
          <button
            onClick={() => setMode('adult')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'adult'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Adult
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {/* Date tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedDate === date
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-[1.02]'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 hover:scale-[1.02]'
              }`}
            >
              {formatDateTab(date)}
            </button>
          ))}
        </div>

        {/* City filter chips */}
        <div className="flex gap-2 flex-wrap">
          {cities.map((city) => {
            const isActive = selectedCity === city
            const style = city !== 'All' ? (CITY_STYLES[city] ?? DEFAULT_STYLE) : null
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? city === 'All'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : `${style?.badge} ring-2 ring-offset-1 dark:ring-offset-slate-900`
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-px'
                }`}
              >
                {city}
              </button>
            )
          })}
        </div>
      </div>

      {/* Data freshness */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-6 bg-slate-50 dark:bg-slate-800/30 w-fit px-3 py-1.5 rounded-md ring-1 ring-inset ring-slate-100 dark:ring-slate-800">
        <Clock className="w-3.5 h-3.5" />
        Updated {new Date(schedule.generated_at).toLocaleDateString('en-CA', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}
      </div>

      {/* Content */}
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 mb-4">
            <CalendarX2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-300 text-lg mb-1">No {mode} swims found</p>
          <p className="text-sm">Try selecting a different date or exploring another city.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Open now / Starting soon section */}
          {isToday && hasHighlighted && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Open Now & Starting Soon
                </h2>
                <div className="flex-1 border-t border-slate-100 dark:border-slate-800 ml-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeNow.map((e, i) => (
                  <EventCard key={`now-${i}`} event={e} highlight="now" />
                ))}
                {startingSoon.map((e, i) => (
                  <EventCard key={`soon-${i}`} event={e} highlight="soon" />
                ))}
              </div>
            </section>
          )}

          {/* All other sessions */}
          {laterEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isToday && hasHighlighted ? 'Later today' : 'Scheduled Sessions'}
                </h2>
                <div className="flex-1 border-t border-slate-100 dark:border-slate-800 ml-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {laterEvents.map((e, i) => (
                  <EventCard key={`later-${i}`} event={e} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
