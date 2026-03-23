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

interface CentreInfo {
  city: string
  address: string
}

interface Schedule {
  generated_at: string
  total_events: number
  centres: Record<string, CentreInfo>
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
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
    border: 'border-l-blue-500',
  },
  Burlington: {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10',
    border: 'border-l-emerald-500',
  },
  Mississauga: {
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-700/10',
    border: 'border-l-rose-500',
  },
}

const DEFAULT_STYLE = {
  badge: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-700/10',
  border: 'border-l-slate-400',
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

function EventCard({ event, highlight, address }: { event: SwimEvent; highlight?: 'now' | 'soon'; address?: string }) {
  const style = CITY_STYLES[event.city] ?? DEFAULT_STYLE
  const sensory = isSensoryActivity(event.activity)

  return (
    <div
      className={[
        'rounded-xl border border-l-[6px] p-4 shadow-sm hover:shadow-md transition-shadow bg-white',
        style.border,
        sensory ? 'ring-2 ring-amber-300 bg-amber-50/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Sensory badge */}
      {sensory && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold tracking-wide uppercase text-amber-800 border border-amber-200">
          <Sparkles className="w-3 h-3" />
          SENSORY SWIM
        </div>
      )}

      {/* Activity name */}
      <div className="font-semibold text-slate-900 text-base leading-tight mb-2">
        {event.activity}
      </div>

      {/* Center name */}
      <div className="flex items-start gap-1.5 text-slate-600 text-sm mb-4">
        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        {address ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="leading-snug hover:text-blue-600 hover:underline"
          >
            {event.center}
          </a>
        ) : (
          <span className="leading-snug">{event.center}</span>
        )}
      </div>

      {/* Bottom row: city badge + time */}
      <div className="flex items-center justify-between gap-2 flex-wrap mt-auto pt-2 border-t border-slate-100">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.badge}`}>
          {event.city}
        </span>
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Clock className="w-4 h-4 text-slate-400" />
          {formatTime(event.start_time)} – {formatTime(event.end_time)}
        </div>
      </div>

      {/* Status badge */}
      {highlight === 'now' && (
        <div className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          OPEN NOW
        </div>
      )}
      {highlight === 'soon' && (
        <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
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
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading swim schedule…
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 text-center px-4">
        <div>
          <div className="text-4xl mb-2">⚠️</div>
          <p>Could not load schedule.</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
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
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Droplets className="w-6 h-6 text-blue-500" />
          Swim Dashboard
        </h1>

        {/* Mode toggle */}
        <div className="bg-slate-100/80 p-1 rounded-xl flex items-center">
          <button
            onClick={() => setMode('family')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'family'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Family
          </button>
          <button
            onClick={() => setMode('adult')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'adult'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Adult
          </button>
        </div>
      </div>

      {/* Date tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedDate === date
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 ring-1 ring-inset ring-slate-200'
            }`}
          >
            {formatDateTab(date)}
          </button>
        ))}
      </div>

      {/* City filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {cities.map((city) => {
          const isActive = selectedCity === city
          const style = city !== 'All' ? (CITY_STYLES[city] ?? DEFAULT_STYLE) : null
          return (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? city === 'All'
                    ? 'bg-slate-900 text-white'
                    : `${style?.badge} ring-2 ring-offset-1`
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {city}
            </button>
          )
        })}
      </div>

      {/* Data freshness */}
      <p className="text-xs text-gray-400 mb-5">
        Updated {new Date(schedule.generated_at).toLocaleDateString('en-CA', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Toronto'
        })}
      </p>

      {/* Content */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarX2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-500">No {mode} swims on this day</p>
          <p className="text-sm mt-1">Try a different date or city.</p>
        </div>
      ) : (
        <>
          {/* Open now / Starting soon section */}
          {isToday && hasHighlighted && (
            <section className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                🟡 Open Now / Starting Soon
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeNow.map((e, i) => (
                  <EventCard key={`now-${i}`} event={e} highlight="now" address={schedule.centres?.[e.center]?.address} />
                ))}
                {startingSoon.map((e, i) => (
                  <EventCard key={`soon-${i}`} event={e} highlight="soon" address={schedule.centres?.[e.center]?.address} />
                ))}
              </div>
            </section>
          )}

          {/* All other sessions */}
          {laterEvents.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                {isToday && hasHighlighted ? 'Later today' : 'Sessions'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {laterEvents.map((e, i) => (
                  <EventCard key={`later-${i}`} event={e} address={schedule.centres?.[e.center]?.address} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
