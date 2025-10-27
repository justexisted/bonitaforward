import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { fixImageUrl } from '../utils/imageUtils'
import { useHideDock } from '../hooks/useHideDock'

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

type Provider = {
  id: string
  name: string
  slug: string // URL-friendly version of the business name (e.g., "flora-cafe")
  category_key: CategoryKey
  description?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  google_maps_url?: string | null
  images?: string[] | null
  rating?: number | null
  tags?: string[]
  specialties?: string[] | null
  service_areas?: string[] | null
  business_hours?: Record<string, string> | null
  social_links?: Record<string, string> | null
  isMember?: boolean
  booking_enabled?: boolean | null
  booking_type?: string | null
  booking_url?: string | null
  booking_instructions?: string | null
  // Contact method toggles
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  // Coupon fields
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
  bonita_resident_discount?: string | null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all providers across all categories
 */
function getAllProviders(providersByCategory: Record<CategoryKey, Provider[]>): Provider[] {
  const keys: CategoryKey[] = ['real-estate', 'home-services', 'health-wellness', 'restaurants-cafes', 'professional-services']
  return keys.flatMap((k) => providersByCategory[k] || [])
}


function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Individual provider detail page with booking, images, coupons
 * 
 * Features:
 * - Hero image with title overlay and save business functionality
 * - Provider details (contact info, specialties, business hours, social links)
 * - Image gallery with modal view
 * - Exclusive coupon display and saving
 * - Booking system for featured providers
 * - Job listings display
 * - Responsive design with mobile optimizations
 */
interface ProviderPageProps {
  providersByCategory: Record<CategoryKey, Provider[]>
}

export default function ProviderPage({ providersByCategory }: ProviderPageProps) {
  const params = useParams()
  const providerIdentifier = params.id as string // Can be either ID or slug
  
  // Listen for provider updates to handle page refreshes
  
  const all: Provider[] = getAllProviders(providersByCategory)
  
  // CRITICAL FIX: Support both ID and slug lookups for backward compatibility
  // This allows URLs like /provider/flora-cafe (slug) or /provider/uuid (ID)
  // Priority: Try slug first (for new URLs), then fall back to ID (for existing bookmarks)
  const provider = all.find((p) => p.slug === providerIdentifier) || all.find((p) => p.id === providerIdentifier)
  const auth = useAuth()
  const navigate = useNavigate()
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [jobs, setJobs] = useState<{ id: string; title: string; description?: string | null; apply_url?: string | null; salary_range?: string | null }[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // Booking modal state
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingDate, setBookingDate] = useState('') // yyyy-mm-dd
  const [bookingTime, setBookingTime] = useState('') // HH:MM
  const [bookingDuration, setBookingDuration] = useState(60)
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingPartySize, setBookingPartySize] = useState<number | ''>('')
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingMsg, setBookingMsg] = useState<string | null>(null)

  // Hide Dock when any modal is open
  const isAnyModalOpen = Boolean(selectedImage || bookingOpen)
  useHideDock(isAnyModalOpen)

  useEffect(() => {
    let cancelled = false
    async function loadJobs() {
      try {
        if (!provider) return
        const { listJobPostsByProvider } = await import('../lib/supabaseData')
        const rows = await listJobPostsByProvider(provider.id)
        if (!cancelled) setJobs(rows)
      } catch {}
    }
    void loadJobs()
    return () => { cancelled = true }
  }, [provider?.id])

  useEffect(() => {
    async function checkSaved() {
      try {
        if (!auth.userId || !provider?.id) return
        // console.log('[Provider] check saved', { userId: auth.userId, providerId: provider.id })
        const { data, error } = await supabase
          .from('saved_providers')
          .select('id')
          .eq('user_id', auth.userId)
          .eq('provider_id', provider.id)
          .maybeSingle()
        if (error) {
          console.warn('[Provider] saved_providers lookup error', error)
          setIsSaved(false)
        } else {
          setIsSaved(!!data)
        }
      } catch (e) {
        console.warn('[Provider] checkSaved failed', e)
        setIsSaved(false)
      }
    }
    void checkSaved()
  }, [auth.userId, provider?.id])

  async function toggleSaveProvider() {
    if (!auth.userId || !provider?.id) { setSaveMsg('Please sign in'); return }
    setSaving(true)
    setSaveMsg(null)
    try {
      if (isSaved) {
        // console.log('[Provider] unsave', { userId: auth.userId, providerId: provider.id })
        const { error } = await supabase
          .from('saved_providers')
          .delete()
          .eq('user_id', auth.userId)
          .eq('provider_id', provider.id)
        if (error) setSaveMsg(error.message)
        else setIsSaved(false)
      } else {
        // console.log('[Provider] save', { userId: auth.userId, providerId: provider.id })
        const { error } = await supabase
          .from('saved_providers')
          .insert([{ user_id: auth.userId, provider_id: provider.id }])
        if (error) setSaveMsg(error.message)
        else setIsSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  async function createBooking() {
    try {
      setBookingMsg(null)
      if (!provider?.id) { setBookingMsg('Provider not found.'); return }
      const name = bookingName || auth.name || 'Customer'
      const email = bookingEmail || auth.email || ''
      if (!bookingDate || !bookingTime) { setBookingMsg('Please choose a date and time.'); return }
      if (!email) { setBookingMsg('Please enter your email.'); return }
      const startIso = new Date(`${bookingDate}T${bookingTime}:00`).toISOString()
      // Append party size for restaurant/cafe category
      const finalNotes = provider.category_key === 'restaurants-cafes' && bookingPartySize
        ? `${bookingNotes ? bookingNotes + '\n' : ''}Party size: ${bookingPartySize}`
        : bookingNotes
      setBookingBusy(true)
      const isLocal = window.location.hostname === 'localhost'
      const url = isLocal ? 'http://localhost:8888/.netlify/functions/google-calendar-create-event' : '/.netlify/functions/google-calendar-create-event'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          customer_email: email,
          customer_name: name,
          booking_date: startIso,
          duration_minutes: bookingDuration,
          notes: finalNotes
        })
      })
      if (!res.ok) {
        const text = await res.text()
        setBookingMsg(`Failed to create booking: ${text}`)
        return
      }
      await res.json()
      setBookingMsg('✅ Booking requested! You will receive a confirmation email if provided.')
      // Close modal and redirect to account page after short delay
      setTimeout(() => {
        setBookingOpen(false)
        setBookingBusy(false)
        setBookingMsg(null)
        // Redirect to account page to show the new booking
        navigate('/account')
      }, 1500)
    } catch (e: any) {
      setBookingMsg(e?.message || 'Failed to create booking')
    } finally {
      setBookingBusy(false)
    }
  }

  async function saveCoupon() {
    if (!auth.userId || !provider?.id) { setCouponMsg('Please sign in'); return }
    
    // Use the provider's coupon code instead of prompting
    const code = provider.coupon_code || 'COMMUNITY'
    
    setCouponBusy(true)
    setCouponMsg(null)
    try {
      // Check if user already saved this coupon
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('user_id', auth.userId)
        .eq('provider_id', provider.id)
        .maybeSingle()
      
      if (existing) {
        setCouponMsg('You already saved this coupon!')
        setCouponBusy(false)
        return
      }

      const { error } = await supabase
        .from('coupon_redemptions')
        .insert([{ user_id: auth.userId, provider_id: provider.id, code }])
      if (error) setCouponMsg(error.message)
      else setCouponMsg('Coupon saved to your account! View it anytime in your Account page.')
    } finally {
      setCouponBusy(false)
    }
  }
  
  return (
    <section className="py-8">
      <Container>
        {all.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-sm text-neutral-600">Loading provider...</div>
            </div>
          </div>
        ) : !provider ? (
          <div className="text-sm text-neutral-600">Provider not found.</div>
        ) : (
          <div>
            {/* Hero Image Section - Show for any image */}
            {(() => {
              const imageUrl = provider.images && provider.images.length > 0 ? fixImageUrl(provider.images[0]) : ''
              return imageUrl ? (
                <div className="relative w-full h-[50vh] max-h-96 mb-6 rounded-2xl overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`${provider.name} - Main Image`}
                    className="w-full h-full object-cover"
                  />
                {/* Enhanced gradient overlay for better text readability and button visibility */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/10 to-black/25"></div>
                {/* Additional gradient from bottom for Save Business button area */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent"></div>
                
                {/* Title overlay - top left */}
                <div className="absolute top-8 left-4 md:top-6 md:left-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6)' }}>
                    {provider.name}
                  </h1>
                  {provider.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.8))' }}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-white font-medium" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6)' }}>{provider.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Featured badge overlay - top right */}
                {provider.isMember && (
                  <div className="absolute top-1 right-1 md:top-6 md:right-6">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)' }}>
                      ⭐ Featured
                    </span>
                  </div>
                )}

                {/* Save Business button overlay - bottom left */}
                {auth.isAuthed && (
                  <div className="absolute bottom-6 left-6">
                    <button
                      onClick={toggleSaveProvider}
                      disabled={saving}
                      className="rounded-full bg-white/95 backdrop-blur-sm text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white transition-colors"
                      style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)' }}
                    >
                      {saving ? 'Please wait…' : isSaved ? 'Saved ✓' : 'Save Business'}
                    </button>
                    {saveMsg && (
                      <div className="mt-2 text-xs text-white bg-black/50 rounded px-2 py-1 backdrop-blur-sm" style={{ textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)' }}>
                        {saveMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
              ) : (
                /* Fallback header when no image */
                <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">
                      {provider.name}
                    </h1>
                    {provider.isMember && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  {auth.isAuthed && (
                    <button
                      onClick={toggleSaveProvider}
                      disabled={saving}
                      className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      {saving ? 'Please wait…' : isSaved ? 'Saved ✓' : 'Save Business'}
                    </button>
                  )}
                </div>
                {provider.rating && (
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-neutral-600 font-medium">{provider.rating.toFixed(1)}</span>
                  </div>
                )}
                {saveMsg && (
                  <div className="mt-2 text-xs text-neutral-600">
                    {saveMsg}
                  </div>
                )}
              </div>
              )
            })()}

            {/* Main content container */}
            <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
              {/* Business Description - First content below image */}
              {provider.description && (
                <div className="mb-6">
                  <p className="text-neutral-700 leading-relaxed text-lg">{provider.description}</p>
                </div>
              )}

              {/* Additional Images Gallery - Show only additional images */}
              {provider.images && provider.images.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">More Photos</h3>
                  
                  {/* Dynamic grid based on remaining image count */}
                  <div className={`grid gap-3 ${
                    (provider.images.length - 1) === 1 ? 'grid-cols-1' :
                    (provider.images.length - 1) === 2 ? 'grid-cols-2' :
                    (provider.images.length - 1) === 3 ? 'grid-cols-3' :
                    'grid-cols-2' // 4 or more remaining images
                  }`}>
                    {provider.images.slice(1).map((image, index) => (
                      <div key={index} className="relative group aspect-video md:aspect-[4/3] overflow-hidden rounded-lg cursor-pointer">
                        <img
                          src={image}
                          alt={`${provider.name} photo ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setSelectedImage(image)}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement
                            img.style.display = 'none'
                            img.parentElement!.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                                <div class="text-center text-neutral-500">
                                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p class="text-xs">Image unavailable</p>
                                </div>
                              </div>
                            `
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provider.phone && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.964 5.964l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${provider.phone}`} className="text-neutral-700 hover:text-neutral-900">
                          {provider.phone}
                        </a>
                      </div>
                    )}
                    
                    {provider.email && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${provider.email}`} className="text-neutral-700 hover:text-neutral-900">
                          {provider.email}
                        </a>
                      </div>
                    )}
                    
                    {provider.website && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <a 
                          href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-neutral-700 hover:text-neutral-900"
                        >
                          {provider.website}
                        </a>
                      </div>
                    )}
                    
                    {provider.address && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-neutral-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-neutral-700">{provider.address}</p>
                          {provider.google_maps_url && (
                            <a 
                              href={provider.google_maps_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              View on Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialties */}
                {provider.specialties && provider.specialties.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.specialties.map((specialty, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Areas */}
                {provider.service_areas && provider.service_areas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Service Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.service_areas.map((area, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Hours & Follow Us Grid - Side by side on desktop */}
                {/* Using grid-cols-3 so business hours takes 1 column (33%) and right side takes 2 columns (66%) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Business Hours - Left Column (1/3 width on desktop) */}
                  {provider.business_hours && Object.keys(provider.business_hours).length > 0 && (
                    <div className="lg:col-span-1">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-3">Business Hours</h3>
                      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                        {/* Business hours in proper day order */}
                        {[
                          { key: 'monday', label: 'Monday' },
                          { key: 'tuesday', label: 'Tuesday' },
                          { key: 'wednesday', label: 'Wednesday' },
                          { key: 'thursday', label: 'Thursday' },
                          { key: 'friday', label: 'Friday' },
                          { key: 'saturday', label: 'Saturday' },
                          { key: 'sunday', label: 'Sunday' }
                        ]
                          .filter(({ key }) => provider.business_hours?.[key]) // Only show days that are set
                          .map(({ key, label }, index, array) => (
                            <div 
                              key={key} 
                              className={`flex items-center gap-4 px-4 py-3 ${
                                index !== array.length - 1 ? 'border-b border-neutral-100' : ''
                              } hover:bg-neutral-50 transition-colors`}
                            >
                              <span className="font-medium text-neutral-800 w-24">{label}</span>
                              <span className="text-neutral-600 font-mono text-sm">{provider.business_hours?.[key]}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Right Column - Follow Us + Coupon (2/3 width on desktop, full width if no business hours) */}
                  <div className={`space-y-6 ${provider.business_hours && Object.keys(provider.business_hours).length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    {/* Social Media Links */}
                    {provider.social_links && Object.keys(provider.social_links).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Follow Us</h3>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(provider.social_links).map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url.startsWith('http') ? url : `https://${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                            >
                              <span className="capitalize">{platform}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exclusive Coupon Display - Below Follow Us (Featured Accounts Only) */}
                    {provider.isMember && provider.coupon_code && provider.coupon_discount && (
                      <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-green-900">Exclusive Coupon</h3>
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            <span className="text-lg font-bold text-green-700">{provider.coupon_discount}</span>
                          </div>
                          {provider.coupon_expires_at && new Date(provider.coupon_expires_at) > new Date() && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                              Expires {new Date(provider.coupon_expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-green-800 font-medium">Code:</span>
                          <code className="bg-white border border-green-300 px-3 py-1 rounded text-green-900 font-mono font-semibold text-sm">
                            {provider.coupon_code}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(provider.coupon_code || '')
                              alert('Coupon code copied to clipboard!')
                            }}
                            className="text-xs text-green-700 hover:text-green-900 underline"
                          >
                            Copy
                          </button>
                        </div>
                        
                        {/* Description and Save Button Row */}
                        {/* Description (full width on mobile, aligned right on desktop) */}
                        {provider.coupon_description && (
                          <div className="mb-3">
                            <p className="text-xs text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-2 break-words">
                              {provider.coupon_description}
                            </p>
                          </div>
                        )}
                        
                        {/* Save button (full width on mobile) */}
                        {auth.isAuthed && (
                          <div className="mb-3">
                            <button
                              onClick={saveCoupon}
                              disabled={couponBusy}
                              className="w-full md:w-auto px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                              {couponBusy ? (
                                'Saving…'
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                  </svg>
                                  Save to My Account
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {auth.isAuthed && couponMsg && (
                          <p className="text-xs text-green-700 mt-2">{couponMsg}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking System - Featured Providers Only */}
              {provider.isMember && (provider.booking_enabled || provider.enable_calendar_booking || provider.enable_call_contact || provider.enable_email_contact) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Book with {provider.name}</h3>
                  <div className="rounded-xl border border-neutral-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-neutral-900">
                        {provider.booking_type === 'appointment' && 'Book an Appointment'}
                        {provider.booking_type === 'reservation' && 'Make a Reservation'}
                        {provider.booking_type === 'consultation' && 'Schedule a Consultation'}
                        {provider.booking_type === 'walk-in' && 'Walk-in Information'}
                        {!provider.booking_type && 'Book Online'}
                      </h4>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                        
                        
                        {provider.booking_url && provider.booking_url.trim() ? (
                          <div className="space-y-3">
                            <p className="text-neutral-700">
                              Click the button below to book online through our booking platform.
                            </p>
                            <a
                              href={provider.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Book Now
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {provider.booking_instructions && (
                              <div className="p-2 bg-white rounded-lg border border-neutral-200">
                                <h5 className="font-medium text-neutral-900 mb-2">Booking Instructions</h5>
                                <p className="text-neutral-700 whitespace-pre-wrap">{provider.booking_instructions}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-3">
                              {/* Primary booking action - show if calendar booking is enabled AND user is signed in */}
                              {provider.enable_calendar_booking && auth.isAuthed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingOpen(true)
                                    // Prefill from auth if available
                                    setBookingName(auth.name || '')
                                    setBookingEmail(auth.email || '')
                                  }}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                  Book Appointment
                                </button>
                              )}
                              
                              {/* Show sign-in prompt for non-authenticated users when booking is available */}
                              {provider.enable_calendar_booking && !auth.isAuthed && (
                                <Link
                                  to="/sign-in"
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                  Sign In to Book
                                </Link>
                              )}
                              
                              {provider.phone && provider.enable_call_contact && (
                                <a
                                  href={`tel:${provider.phone}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.964 5.964l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  Call {provider.phone}
                                </a>
                              )}
                              
                              {provider.email && provider.enable_email_contact && (
                                <a
                                  href={`mailto:${provider.email}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Email {provider.email}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {jobs.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium">Open Jobs</div>
                  <div className="mt-2 space-y-2">
                    {jobs.map((j) => (
                      <div key={j.id} className="rounded-xl border border-neutral-200 p-3">
                        <div className="font-medium text-sm">Title: {j.title}</div>
                        {j.salary_range && <div className="text-xs text-neutral-600">{j.salary_range}</div>}
                        {j.description && <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{j.description}</div>}
                        {j.apply_url && <div className="mt-1"><a className="text-xs underline" href={j.apply_url} target="_blank" rel="noreferrer">Apply</a></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>

      {/* Full-screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt={`${provider?.name} full-size image`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
              aria-label="Close image"
            >
              <X className="w-6 h-6 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBookingOpen(false)}></div>
          <div className="relative bg-white rounded-2xl border border-neutral-200 p-5 w-[90%] max-w-md shadow-xl">
            <div className="text-lg font-semibold text-neutral-900">Book with {provider?.name}</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Date</label>
                  <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Time</label>
                  <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Your Name</label>
                  <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Your Email</label>
                  <input type="email" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Duration (minutes)</label>
                  <input type="number" min={15} step={15} value={bookingDuration} onChange={(e) => setBookingDuration(parseInt(e.target.value || '60'))} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              {provider?.category_key === 'restaurants-cafes' && (
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Party Size</label>
                  <input type="number" min={1} value={bookingPartySize} onChange={(e) => setBookingPartySize(e.target.value ? parseInt(e.target.value) : '')} className="w-full rounded-lg border border-neutral-300 px-3 py-2" placeholder="e.g., 4" />
                </div>
              )}
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Notes (optional)</label>
                <textarea rows={3} value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" placeholder="Anything the business should know before your appointment" />
              </div>
              {bookingMsg && <div className="text-xs text-neutral-700">{bookingMsg}</div>}
              <div className="mt-2 flex items-center justify-end gap-2">
                <button onClick={() => setBookingOpen(false)} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm">Cancel</button>
                <button onClick={createBooking} disabled={bookingBusy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                  {bookingBusy ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
