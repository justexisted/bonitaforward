/**
 * Account Page Types
 */

import { type CalendarEvent } from '../Calendar'

export type DashboardSection = 
  | 'dashboard'
  | 'account' 
  | 'business' 
  | 'bookings' 
  | 'saved-businesses' 
  | 'my-events' 
  | 'applications' 
  | 'security' 
  | 'delete'

export interface SidebarItem {
  id: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export interface Booking {
  id: string
  provider_id?: string | null
  provider_name?: string | null
  time?: string | null
  status?: string | null
  created_at?: string | null
  customer_name?: string | null
  customer_email?: string | null
  booking_duration_minutes?: number | null
  booking_notes?: string | null
  provider_category?: string | null
  provider_address?: string | null
  provider_phone?: string | null
}

export interface SavedBusiness {
  id?: string
  provider_id: string
  created_at?: string | null
  provider_name?: string | null
  provider_category?: string | null
  provider_address?: string | null
  provider_phone?: string | null
  provider_tags?: string[] | null
}

export interface PendingApplication {
  id: string
  business_name: string | null
  created_at: string
}

export interface MyBusiness {
  id: string
  name: string
  category_key: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  published?: boolean | null
  created_at?: string | null
}

export interface AccountData {
  bookings: Booking[]
  savedBusinesses: SavedBusiness[]
  myEvents: CalendarEvent[]
  pendingApps: PendingApplication[]
  myBusinesses: MyBusiness[]
}

