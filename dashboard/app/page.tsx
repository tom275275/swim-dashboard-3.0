import { readFile } from 'fs/promises'
import path from 'path'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import SwimDashboardClient from './components/SwimDashboardClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SwimEvent {
  city: string
  center: string
  facility: string
  activity: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  source: string
}

export interface CentreInfo {
  city: string
  address: string
}

export interface Schedule {
  generated_at: string
  total_events: number
  centres: Record<string, CentreInfo>
  events: SwimEvent[]
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function getSchedule(): Promise<Schedule> {
  'use cache'
  cacheLife('days')
  const filePath = path.join(process.cwd(), 'public', 'schedule.json')
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as Schedule
}

// ── Page (Server Component) ───────────────────────────────────────────────────

export default async function SwimDashboardPage() {
  let schedule: Schedule
  try {
    schedule = await getSchedule()
  } catch {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 text-center px-4">
        <div>
          <div className="text-4xl mb-2">⚠️</div>
          <p>Could not load schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense>
      <SwimDashboardClient schedule={schedule} />
    </Suspense>
  )
}
