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
  booking_date?: string | null
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

export interface SavedCoupon {
  id: string
  provider_id: string
  code?: string | null
  created_at?: string | null
  provider_name?: string | null
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
}

export interface PendingApplication {
  id: string
  business_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  tier_requested: 'free' | 'featured' | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | null
  created_at: string
  updated_at: string | null
  owner_hidden_at?: string | null
}

export interface MyBusiness {
  id: string
  name: string
  slug?: string | null
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
  savedCoupons: SavedCoupon[]
  myEvents: CalendarEvent[]
  savedEvents: CalendarEvent[]
  pendingApps: PendingApplication[]
  myBusinesses: MyBusiness[]
}

