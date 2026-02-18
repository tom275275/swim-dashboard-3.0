'use client'

import { useState, useEffect } from 'react'

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
// Family mode: sessions where you can splash around in the leisure/fun pool area.
// Adult mode: fitness-focused sessions (lane swim, aquafit, etc.).

function isFamilyActivity(activity: string): boolean {
  const a = activity.toLowerCase()
  return (
    a.includes('fun swim') ||
    a.includes('fun & lane swim') ||
    a.includes('lane & fun') ||
    a.includes('parent & tot') ||
    a.includes('sensory') ||
    a.includes('leisure swim') ||
    a.includes('combo swim')
  )
}

function isSensoryActivity(activity: string): boolean {
  return activity.toLowerCase().includes('sensory')
}

function isAdultActivity(activity: string): boolean {
  return !isFamilyActivity(activity)
}

// ── City styling ──────────────────────────────────────────────────────────────

const CITY_STYLES: Record<string, { badge: string; border: string }> = {
  Oakville: {
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-l-blue-400',
  },
  Burlington: {
    badge: 'bg-green-100 text-green-800',
    border: 'border-l-green-400',
  },
  Mississauga: {
    badge: 'bg-purple-100 text-purple-800',
    border: 'border-l-purple-400',
  },
}

const DEFAULT_STYLE = {
  badge: 'bg-gray-100 text-gray-800',
  border: 'border-l-gray-400',
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
        'rounded-xl border border-l-4 p-4 shadow-sm',
        'bg-white',
        style.border,
        sensory ? 'ring-2 ring-amber-300 bg-amber-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Sensory badge */}
      {sensory && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
          ⭐ SENSORY SWIM
        </div>
      )}

      {/* Activity name */}
      <div className="font-semibold text-gray-900 text-sm leading-tight mb-1">
        {event.activity}
      </div>

      {/* Center name */}
      <div className="text-gray-600 text-sm mb-3">{event.center}</div>

      {/* Bottom row: city badge + time */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {event.city}
        </span>
        <span className="text-sm font-mono text-gray-700">
          {formatTime(event.start_time)} – {formatTime(event.end_time)}
        </span>
      </div>

      {/* Status badge */}
      {highlight === 'now' && (
        <div className="mt-2 text-xs font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5 inline-block">
          ● OPEN NOW
        </div>
      )}
      {highlight === 'soon' && (
        <div className="mt-2 text-xs font-bold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5 inline-block">
          ◷ STARTING SOON
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
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🏊 Swim Dashboard</h1>

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm font-medium">
          <button
            onClick={() => setMode('family')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'family'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Family
          </button>
          <button
            onClick={() => setMode('adult')}
            className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${
              mode === 'adult'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedDate === date
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? city === 'All'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : `${style?.badge} border-current font-semibold`
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}
      </p>

      {/* Content */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🏖️</div>
          <p className="font-medium text-gray-500">No {mode} swims on this day</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                {isToday && hasHighlighted ? 'Later today' : 'Sessions'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {laterEvents.map((e, i) => (
                  <EventCard key={`later-${i}`} event={e} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
