import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ResetPasswordPage from './pages/ResetPassword'
import './index.css'
import { ArrowRight } from 'lucide-react'
// import CreateBusinessForm from './pages/CreateBusinessForm'
// import { supabase } from './lib/supabase'
import { fetchSheetRows, mapRowsToProviders, type SheetProvider } from './lib/sheets.ts'
import { fetchProvidersFromSupabase } from './lib/supabaseData.ts'
import SignInPage from './pages/SignIn'
import OnboardingPage from './pages/Onboarding'
import AccountPage from './pages/Account'
import { CommunityIndex, CommunityPost } from './pages/Community'
import AdminPage from './pages/Admin'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import OwnerPage from './pages/Owner'
import MyBusinessPage from './pages/MyBusiness'
import PricingPage from './pages/Pricing'
import JobsPage from './pages/Jobs'
import CalendarPage, { fetchCalendarEvents, type CalendarEvent } from './pages/Calendar'
import Calendar from './components/Calendar'
import NotFoundPage from './pages/NotFound'
// import SplitText from './components/SplitText'
import GlareHover from './components/GlareHover'
import ScrollFloat from './components/ScrollFloat'
import GradientText from './components/GradientText'
// import CountUp from './components/CountUp'
// import ScrollStack, { ScrollStackItem } from './components/ScrollStack'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Hero from './components/Hero'
import ProviderPage from './pages/ProviderPage'
import CategoryPage from './pages/CategoryPage'
import BusinessPage from './pages/BusinessPage'

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

const categories: {
  key: CategoryKey
  name: string
  description: string
  icon: string
}[] = [
  {
    key: 'restaurants-cafes',
    name: 'Restaurants & Cafés',
    description: 'Local dining spots and trending food experiences around Bonita.',
    icon: '/images/categories/Utensils.png',
  },
  {
    key: 'home-services',
    name: 'Home Services',
    description: 'Landscaping, solar, cleaning, and remodeling by trusted local pros.',
    icon: '/images/categories/Home.png',
  },
  {
    key: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Chiropractors, gyms, salons, and med spas to keep Bonita thriving.',
    icon: '/images/categories/HeartPulse.png',
  },
  {
    key: 'real-estate',
    name: 'Real Estate',
    description: 'Agents, brokerages, and property managers helping Bonita residents move forward.',
    icon: '/images/categories/Building2.png',
  },
  {
    key: 'professional-services',
    name: 'Professional Services',
    description: 'Attorneys, accountants, and consultants serving the community.',
    icon: '/images/categories/Briefcase.png',
  },
]

// ============================================================================
// UTILITY FUNCTIONS - Extracted from duplicate code for maintainability
// ============================================================================


/**
 * Safely get and parse JSON from localStorage with type safety
 */
function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item) as T
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e)
    return defaultValue
  }
}



// getAllProviders function moved to ProviderPage.tsx

/**
 * Custom hook for listening to provider updates
 */
function useProviderUpdates(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    function onUpdate() { callback() }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, deps)
}

/**
 * Reusable loading spinner component
 */
function LoadingSpinner({ message = 'Loading...', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
      <p className="mt-4 text-neutral-600">{message}</p>
    </div>
  )
}

function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}








/**
 * PROVIDER PAGE
 * 
 * This page displays comprehensive business information for community users.
 * It shows all the enhanced business details that business owners can manage
 * through their "My Business" dashboard.
 * 
 * Features:
 * - Business description and images
 * - Contact information (phone, email, website, address)
 * - Specialties and service areas
 * - Business hours and social media links
 * - Featured business badge and rating display
 * - Job postings (if any)
 * - Save business and coupon functionality for community users
 */
// ProviderPage component has been moved to src/pages/ProviderPage.tsx

function CategoryCard({ cat }: { cat: typeof categories[number] }) {
  return (
    <GlareHover
      width="auto"
      height="auto"
      background="#ffffff"
      glareColor="#999999"
      glareOpacity={0.3}
      glareAngle={-33}
      glareSize={300}
      transitionDuration={800}
      playOnce={false}
    >
    <Link to={`/category/${cat.key}`} className="block rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-20 w-25 items-center justify-center rounded-2xl bg-neutral-50">
          <img 
            src={cat.icon} 
            alt={`${cat.name} icon`}
            className="h-20 w-25 object-contain"
          />
        </span>
      <div>
          <div className="font-medium text-neutral-900">{cat.name}</div>
          <div className="text-sm text-neutral-600">{cat.description}</div>
      </div>
        <ArrowRight className="ml-auto h-4 w-4 text-neutral-400" />
      </div>
    </Link>
    </GlareHover>
  )
}

function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const calendarEvents = await fetchCalendarEvents()
        setEvents(calendarEvents)
      } catch (error) {
        console.error('Error loading calendar events:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="container-px mx-auto max-w-6xl">
          <LoadingSpinner message="Loading calendar events..." />
        </div>
      </section>
    )
  }

  return <Calendar events={events} />
}

function CommunitySection() {
  const cards = [
    { category_key: 'restaurants-cafes', title: 'Top 5 Restaurants This Month', excerpt: 'Discover trending dining spots loved by Bonita locals.' },
    { category_key: 'home-services', title: 'Bonita Home Service Deals', excerpt: 'Seasonal offers from trusted local pros.' },
    { category_key: 'health-wellness', title: 'Wellness Spotlight', excerpt: 'Chiropractors, gyms, and med spas to try now.' },
    { category_key: 'real-estate', title: 'Property Opportunities in Bonita', excerpt: 'Latest properties and market highlights.' },
    { category_key: 'professional-services', title: 'Top Professional Services of Bonita', excerpt: 'Standout legal, accounting, and consulting pros.' },
  ]
  return (
    <section className="py-8">
      <Container>
        <ScrollFloat
          animationDuration={1}
          ease='back.inOut(2)'
          scrollStart='center bottom+=50%'
          scrollEnd='bottom bottom-=40%'
          stagger={0.03}
          textClassName="text-2xl md:text-4xl font-semibold tracking-tight text-neutral-900 font-display"
        >
          Community Blogs
        </ScrollFloat>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => {
            const bgMap: Record<string, string> = {
              'restaurants-cafes': "/images/community/restaurants-cafes.png",
     'home-services': "/images/community/home-services.png",
     'health-wellness': "/images/community/health-wellness.png",
     'real-estate': "/images/community/real-estate.png",
     'professional-services': "/images/community/professional-services.png",
            }
            const bg = bgMap[c.category_key as CategoryKey]
            return (
              <Link key={c.title} to={`/community/${c.category_key}`} className="relative rounded-2xl overflow-hidden block hover:shadow-sm border border-white/40">
                <img
                  src={bg}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.onerror = null
                    img.src = `/images/community/{c.category_key}-fallback.png`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/60 via-transparent to-neutral-900/60" aria-hidden></div>
                <div className="relative z-10 p-4 min-h-[160px] flex flex-col justify-between">
                  <div>
                    <GradientText
                      colors={["#313672", "#8cd884", "#ffe3c6", "#fcddff", "#914471"]}
                      animationSpeed={6}
                      showBorder={false}
                      className="animated-gradient-text font-medium"
                    >{c.title}
                    </GradientText>
                    <div className="text-sm text-neutral-100 mt-1">{c.excerpt}</div>
                  </div>
                  <span className="mt-3 inline-block text-sm px-2 py-2 text-center full-w-bg self-center" style={{ color: 'white' }}>Read more</span>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

function Confetti() {
  // simple CSS confetti using pseudo-random gradients
  const pieces = Array.from({ length: 40 })
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-3 rounded-sm opacity-80"
            style={{
              left: Math.random() * 100 + '%',
              top: '-10px',
              background: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `confetti-fall ${2000 + Math.random() * 1200}ms ease-in forwards`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ThankYouPage() {
  return (
    <section className="py-12">
      <Container>
        <div className="relative rounded-2xl border border-neutral-100 p-8 bg-white text-center elevate form-fade">
          <Confetti />
          <h1 className="text-2xl font-semibold tracking-tight">Thanks! 🎉</h1>
          <p className="mt-2 text-neutral-600">Your request to be featured was successfully submitted.</p>
          <div className="mt-5">
            <Link to="/" className="btn btn-primary">Back to Home</Link>
          </div>
        </div>
      </Container>
    </section>
  )
}

function HomePage() {
  const [, setVersion] = useState(0)
  
  // Listen for provider updates to trigger re-renders when data loads
  useProviderUpdates(() => { setVersion((v: number) => v + 1) }, [])

  return (
    <>
      <Hero providersByCategory={providersByCategory} useProviderUpdates={useProviderUpdates} />
      <section id="categories" className="py-2">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.slice(0, 4).map((c) => (
              <CategoryCard cat={c} key={c.key} />
            ))}
            <details className="rounded-2xl p-4 bg-white">
              <summary className="cursor-pointer select-none text-sm" style={{ color: '#7070e3' }}>See more</summary>
              <div className="mt-3">
                {categories.slice(4).map((c) => (
                  <div key={c.key} className="mt-2">
                    <CategoryCard cat={c} />
                  </div>
                ))}
              </div>
            </details>
          </div>
        </Container>
      </section>
      <CalendarSection />
      <CommunitySection />
    </>
  )
}

// Removed old LeadForm in favor of the new 4-step Funnel

// FunnelOption type has been moved to src/pages/CategoryPage.tsx

// FunnelQuestion type has been moved to src/pages/CategoryPage.tsx

// funnelConfig has been moved to src/pages/CategoryPage.tsx

type Provider = {
  id: string
  name: string
  slug: string // URL-friendly version of the business name (e.g., "flora-cafe")
  category_key: CategoryKey // FIXED: Use category_key to match database schema
  tags: string[]
  rating?: number
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
  // Enhanced business fields from database
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  images?: string[] | null
  badges?: string[] | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  // Missing fields:
  featured_since?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
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
function ensureDemoMembers(input: Record<CategoryKey, Provider[]>): Record<CategoryKey, Provider[]> {
  const out: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  };
  (Object.keys(input) as CategoryKey[]).forEach((k: CategoryKey) => {
    const key = k
    const arr = input[key] || []
    out[key] = arr.map((p: Provider, idx: number) => ({ ...p, isMember: Boolean(p.isMember) || idx < 3 }))
  })
  return out
}


type ProviderDetails = {
  phone?: string
  email?: string
  website?: string
  address?: string
  images?: string[]
  reviews?: { author: string; rating: number; text: string }[]
  posts?: { id: string; title: string; url?: string }[]
}

// Removed unused providerDescriptions/getProviderDescription to satisfy TypeScript build

/**
 * SLUG GENERATION FUNCTION
 * 
 * Creates URL-friendly slugs from business names for cleaner URLs.
 * Example: "Flora Cafe" -> "flora-cafe"
 * 
 * This enables professional URLs like /provider/flora-cafe instead of /provider/uuid
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

function isFeaturedProvider(p: Provider): boolean {
  // Only check the isMember field to ensure consistency with admin page
  // This prevents discrepancies where providers show as featured on provider page
  // but not on admin page due to different logic
  return Boolean(p.isMember)
}

function getProviderDetails(p: Provider): ProviderDetails {
  // Use actual business data from database instead of placeholder data
  return {
    phone: p.phone || undefined,
    email: p.email || undefined,
    website: p.website || undefined,
    address: p.address || undefined,
    // Use actual business images from database if available, otherwise show no images
    // Filter out empty or invalid image URLs
    images: p.images && p.images.length > 0 
      ? p.images.filter(img => img && typeof img === 'string' && img.trim().length > 0)
      : undefined,
    // Only show reviews if they exist in the database (currently no reviews table exists)
    // TODO: Add reviews table to database and fetch actual reviews
    reviews: undefined, // Remove placeholder reviews until reviews system is implemented
    // Only show related posts if they exist in the database (currently no posts table exists)
    // TODO: Add posts table to database and fetch actual related posts
    posts: undefined, // Remove placeholder posts until posts system is implemented
  }
}

let providersByCategory: Record<CategoryKey, Provider[]> = {
  'real-estate': [],
  'home-services': [],
  'health-wellness': [],
  'restaurants-cafes': [],
  'professional-services': [],
}

async function loadProvidersFromSheet(): Promise<void> {
  try {
    const rows = await fetchSheetRows()
    const mapped = mapRowsToProviders(rows)
    const grouped: Record<CategoryKey, Provider[]> = {
      'real-estate': [],
      'home-services': [],
      'health-wellness': [],
      'restaurants-cafes': [],
      'professional-services': [],
    }
    mapped.forEach((sp: SheetProvider) => {
      const cat = (sp.category_key as CategoryKey)
      if (grouped[cat]) {
        grouped[cat].push({ id: sp.id, name: sp.name, slug: generateSlug(sp.name), category_key: cat, tags: sp.tags.length ? sp.tags : (sp.details.badges || []), rating: sp.rating })
      }
    })
    providersByCategory = ensureDemoMembers(grouped)
    // console.log('[Sheets] Providers loaded from Google Sheets', grouped)
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
}

async function loadProvidersFromSupabase(): Promise<boolean> {
  const rows = await fetchProvidersFromSupabase()
  if (!rows || rows.length === 0) {
    console.warn('[Supabase] No providers found or failed to load')
    return false
  }
  console.log(`[Supabase] Loaded ${rows.length} providers from database`)
  
  const grouped: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  }
  function coerceIsMember(r: any): boolean {
    // CRITICAL FIX: Match Admin page logic EXACTLY - only check for boolean true values
    // Admin page uses: provider.is_featured === true || provider.is_member === true
    // This ensures perfect consistency between admin page and provider page featured status
    // We only check for boolean true, not string 'true' or numeric 1, to match admin page exactly
    const isFeatured = r.is_featured === true
    const isMember = r.is_member === true
    
    // Return true if EITHER field indicates featured status (matching Admin page logic exactly)
    return isFeatured || isMember
  }

  rows.forEach((r) => {
    const key = (r.category_key as CategoryKey)
    if (!grouped[key]) return
    // Combine tags and badges to preserve featured/member flags
    const combinedTags = Array.from(new Set([...
      (((r.tags as string[] | null) || []) as string[]),
      (((r.badges as string[] | null) || []) as string[]),
    ].flat().map((s) => String(s).trim()).filter(Boolean)))

    // Debug: Only log health-wellness providers to avoid spam
    // if (key === 'health-wellness') {
    //   console.log(`[Supabase] Loading health-wellness provider: ${r.name} (published: ${r.published})`)
    // }

    grouped[key].push({
      id: r.id,
      name: r.name,
      slug: generateSlug(r.name), // Generate URL-friendly slug from business name
      category_key: key,
      tags: combinedTags,
      rating: r.rating ?? undefined,
      phone: r.phone ?? null,
      email: r.email ?? null,
      website: r.website ?? null,
      address: r.address ?? null,
      isMember: coerceIsMember(r),
      // Enhanced business fields
      description: r.description ?? null,
      specialties: r.specialties ?? null,
      social_links: r.social_links ?? null,
      business_hours: r.business_hours ?? null,
      service_areas: r.service_areas ?? null,
      google_maps_url: r.google_maps_url ?? null,
      images: r.images ?? null,
      badges: r.badges ?? null,
      published: r.published ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      // Booking system fields
      booking_enabled: r.booking_enabled ?? null,
      booking_type: r.booking_type ?? null,
      booking_instructions: r.booking_instructions ?? null,
      booking_url: r.booking_url ?? null,
      // Contact method toggles
      enable_calendar_booking: r.enable_calendar_booking ?? null,
      enable_call_contact: r.enable_call_contact ?? null,
      enable_email_contact: r.enable_email_contact ?? null,
      // Coupon fields
      coupon_code: r.coupon_code ?? null,
      coupon_discount: r.coupon_discount ?? null,
      coupon_description: r.coupon_description ?? null,
      coupon_expires_at: r.coupon_expires_at ?? null,
      bonita_resident_discount: r.bonita_resident_discount ?? null,
    })
  })
  providersByCategory = grouped
  
  // Log summary of loaded providers by category
  // Object.keys(grouped).forEach((category) => {
  //   const count = grouped[category as CategoryKey].length
  //   console.log(`[Supabase] ${category}: ${count} providers loaded`)
  // })
  
  // console.log('[Supabase] Providers loaded successfully', grouped)
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
  return true
}

function scoreProviders(category: CategoryKey, answers: Record<string, string>): Provider[] {
  // CRITICAL FIX: Only get providers from the specified category
  const providers = providersByCategory[category] || []
  
  // Remove console spam - no logging here
  
  if (category === 'health-wellness') {
    const type = answers['type']
    const goal = answers['goal'] || answers['salon_kind']
    const when = answers['when']
    const payment = answers['payment']
    
    // Comprehensive synonym mapping for health-wellness provider types
    const getProviderSynonyms = (providerType: string): string[] => {
      const synonymMap: Record<string, string[]> = {
        // Dental
        'dental': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
        'dentist': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
        
        // Gym/Fitness
        'gym': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
        'fitness': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
        
        // Salon/Beauty
        'salon': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
        'beauty': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
        
        // Spa/Med Spa
        'spa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
        'medspa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
        
        // Chiropractor
        'chiro': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
        'chiropractor': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
        
        // Medical
        'medical': ['medical', 'doctor', 'physician', 'clinic', 'healthcare', 'primary care', 'family medicine', 'internal medicine', 'pediatrics', 'urgent care'],
        
        // Therapy
        'therapy': ['therapy', 'therapist', 'physical therapy', 'pt', 'occupational therapy', 'ot', 'speech therapy', 'rehabilitation', 'rehab', 'counseling', 'mental health', 'psychology', 'psychiatry'],
        
        // Naturopathic
        'naturopathic': ['naturopath', 'naturopathic', 'nd', 'natural medicine', 'holistic', 'alternative medicine', 'functional medicine', 'integrative medicine'],
        
        // Vision/Eye Care
        'vision': ['optometry', 'optometrist', 'vision', 'eye care', 'eyewear', 'glasses', 'contacts', 'ophthalmology', 'ophthalmologist'],
        
        // Mental Health
        'mental': ['mental health', 'psychology', 'psychiatrist', 'psychologist', 'counseling', 'therapist', 'therapy', 'depression', 'anxiety', 'counselor'],
        
        // Physical Therapy
        'physical': ['physical therapy', 'pt', 'physiotherapy', 'rehabilitation', 'rehab', 'sports medicine', 'injury recovery'],
        
        // Podiatry
        'podiatry': ['podiatrist', 'foot care', 'foot doctor', 'ankle', 'foot surgery'],
        
        // Dermatology
        'dermatology': ['dermatologist', 'skin care', 'dermatology', 'skin doctor', 'acne', 'moles', 'skin cancer'],
        
        // Acupuncture
        'acupuncture': ['acupuncture', 'acupuncturist', 'traditional chinese medicine', 'tcm'],
      }
      
      return synonymMap[providerType.toLowerCase()] || [providerType]
    }
    
    // Enhanced matching function that checks synonyms
    const tagsMatchSynonyms = (tags: string[], targetType: string): boolean => {
      if (!tags || !targetType) return false
      const synonyms = getProviderSynonyms(targetType)
      const lowerTags = tags.map(tag => tag.toLowerCase())
      
      return synonyms.some(synonym => 
        lowerTags.some(tag => 
          tag.includes(synonym.toLowerCase()) || 
          synonym.toLowerCase().includes(tag)
        )
      )
    }
    
    // Helper function for simple keyword matching (for secondary criteria)
    const tagsContainKeyword = (tags: string[], keyword: string): boolean => {
      if (!keyword || !tags) return false
      const lowerKeyword = keyword.toLowerCase()
      return tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    }
    
    // Enhanced scoring with synonym matching
    const scoredProviders = providers
      .map((p) => {
        let score = 0
        
        // Primary type matching with synonyms
        if (type && tagsMatchSynonyms(p.tags, type)) {
          score += 5 // High priority for exact type match
        }
        
        // Goal matching with synonyms
        if (goal && tagsMatchSynonyms(p.tags, goal)) {
          score += 3 // Medium-high priority for goal match
        }
        
        // Secondary criteria
        if (when && tagsContainKeyword(p.tags, when)) score += 1
        if (payment && tagsContainKeyword(p.tags, payment)) score += 1
        
        // If no specific criteria selected, give all providers a base score
        if (!type && !goal && !when && !payment) {
          score = 1 // Base score so all providers show up when no filters applied
        }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected type with synonyms
        const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(a.p.tags, type)) || (goal && tagsMatchSynonyms(a.p.tags, goal))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(b.p.tags, type)) || (goal && tagsMatchSynonyms(b.p.tags, goal))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!type && !goal) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        // Sort by score (highest first)
        if (b.score !== a.score) return b.score - a.score
        
        // Then by rating
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        
        // Finally by name
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
    
    return scoredProviders
  }
  if (category === 'real-estate') {
    const values = new Set<string>(Object.values(answers))
    const need = answers['need']
    const propertyType = answers['property_type']
    const wantsStaging = answers['staging'] === 'yes'
    const stagerTags = new Set(['stager','staging'])
    return providers
      .filter((p) => {
        const isStager = (p.tags || []).some((t) => stagerTags.has(t))
        return wantsStaging ? true : !isStager
      })
      .map((p) => {
        let score = 0
        // Strong signals
        if (need && p.tags.includes(need)) score += 2
        if (propertyType && p.tags.includes(propertyType)) score += 2
        // Moderate signals
        if (answers['timeline'] && p.tags.includes(answers['timeline'])) score += 1
        if (answers['move_when'] && p.tags.includes(answers['move_when'])) score += 1
        if (answers['budget'] && p.tags.includes(answers['budget'])) score += 1
        if (answers['beds'] && p.tags.includes(answers['beds'])) score += 1
        if (wantsStaging && (p.tags.includes('staging') || p.tags.includes('stager'))) score += 1
        // Generic tag match fallback
        p.tags.forEach((t) => { if (values.has(t)) score += 0 })
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // For real-estate, check if featured providers match the selected need/property type
        const aFeaturedMatchesCriteria = aIsFeatured && (need || propertyType) ? 
          ((need && a.p.tags.includes(need)) || (propertyType && a.p.tags.includes(propertyType))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (need || propertyType) ? 
          ((need && b.p.tags.includes(need)) || (propertyType && b.p.tags.includes(propertyType))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!need && !propertyType) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
  }
  
  // FIXED: Add specific logic for restaurants-cafes category
  if (category === 'restaurants-cafes') {
    const values = new Set<string>(Object.values(answers).map(v => v.toLowerCase()))
    const cuisine = answers['cuisine']?.toLowerCase()
    const occasion = answers['occasion']?.toLowerCase()
    const price = answers['price']?.toLowerCase()
    const service = answers['service']?.toLowerCase()
    
    // CUISINE SYNONYMS: Map cuisine selections to related terms
    const getCuisineSynonyms = (cuisineType: string) => {
      const synonyms: Record<string, string[]> = {
        'mexican': ['mexican', 'mexican restaurant', 'tacos', 'taco', 'burrito', 'burritos', 'mexican food', 'tex-mex', 'texmex'],
        'asian': ['asian', 'asian restaurant', 'chinese', 'japanese', 'thai', 'vietnamese', 'korean', 'indian', 'asian food', 'sushi', 'ramen', 'pho'],
        'american': ['american', 'american restaurant', 'burger', 'burgers', 'bbq', 'barbecue', 'steak', 'steakhouse', 'american food'],
        'cafes': ['cafes', 'cafe', 'coffee', 'coffee shop', 'coffeeshop', 'coffeehouse', 'espresso', 'latte', 'cappuccino', 'breakfast', 'brunch'],
        'italian': ['italian', 'italian restaurant', 'pizza', 'pasta', 'italian food', 'trattoria', 'ristorante'],
        'mediterranean': ['mediterranean', 'greek', 'middle eastern', 'mediterranean food', 'falafel', 'hummus', 'gyro'],
        'seafood': ['seafood', 'fish', 'lobster', 'crab', 'shrimp', 'oyster', 'seafood restaurant'],
        'vegetarian': ['vegetarian', 'vegan', 'plant-based', 'vegetarian restaurant', 'vegan restaurant'],
        'fast food': ['fast food', 'quick service', 'drive-thru', 'fast casual'],
        'fine dining': ['fine dining', 'upscale', 'gourmet', 'fine restaurant', 'elegant dining']
      }
      return synonyms[cuisineType] || [cuisineType]
    }
    
    // Get all related terms for the selected cuisine
    const cuisineSynonyms = cuisine ? getCuisineSynonyms(cuisine) : []
    const allCuisineTerms = new Set([...cuisineSynonyms, ...values])
    
    // console.log('[Restaurant Filter] Answers:', { cuisine, occasion, price, service })
    // console.log('[Restaurant Filter] Cuisine synonyms:', cuisineSynonyms)
    // console.log('[Restaurant Filter] All answer values:', Array.from(values))
    
    return providers
      .map((p) => {
        let score = 0
        
        // CUISINE MATCHING: Check for exact cuisine match first, then synonyms
        if (cuisine) {
          // Exact match gets highest score
          if (p.tags.some(t => t.toLowerCase() === cuisine)) {
            score += 4
          } else {
            // Check for cuisine synonyms
            const cuisineMatch = p.tags.some(t => {
              const tagLower = t.toLowerCase()
              return cuisineSynonyms.some(synonym => 
                tagLower === synonym || 
                tagLower.includes(synonym) || 
                synonym.includes(tagLower)
              )
            })
            if (cuisineMatch) score += 3
          }
        }
        
        // OTHER MATCHES: Occasion, price, service
        if (occasion && p.tags.some(t => t.toLowerCase() === occasion)) score += 2
        if (price && p.tags.some(t => t.toLowerCase() === price)) score += 2
        if (service && p.tags.some(t => t.toLowerCase() === service)) score += 2
        
        // GENERAL TAG MATCHES: Check all answer values and cuisine terms
        p.tags.forEach((t) => { 
          const tagLower = t.toLowerCase()
          if (allCuisineTerms.has(tagLower)) score += 1
        })
        
        // Debug: Log scoring for restaurants
        // if (score > 0) {
        //   console.log('[Restaurant Filter] Scored:', { 
        //     name: p.name, 
        //     tags: p.tags, 
        //     score: score 
        //   })
        // }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected cuisine
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected cuisine
        const aFeaturedMatchesCuisine = aIsFeatured && cuisine ? 
          (a.p.tags.some(t => t.toLowerCase() === cuisine) || 
           a.p.tags.some(t => {
             const tagLower = t.toLowerCase()
             return cuisineSynonyms.some(synonym => 
               tagLower === synonym || 
               tagLower.includes(synonym) || 
               synonym.includes(tagLower)
             )
           })) : false
           
        const bFeaturedMatchesCuisine = bIsFeatured && cuisine ? 
          (b.p.tags.some(t => t.toLowerCase() === cuisine) || 
           b.p.tags.some(t => {
             const tagLower = t.toLowerCase()
             return cuisineSynonyms.some(synonym => 
               tagLower === synonym || 
               tagLower.includes(synonym) || 
               synonym.includes(tagLower)
             )
           })) : false
        
        // Only prioritize featured providers that match the cuisine
        const am = aFeaturedMatchesCuisine ? 1 : 0
        const bm = bFeaturedMatchesCuisine ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no cuisine selected, fall back to original featured logic
        if (!cuisine) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
  }
  
  // FIXED: Add comprehensive logic for home-services category
  if (category === 'home-services') {
    const type = answers['type']
    const goal = answers['goal'] || answers['urgency']
    const when = answers['urgency']
    const budget = answers['budget']
    
    // Comprehensive synonym mapping for home-services provider types
    const getProviderSynonyms = (serviceType: string): string[] => {
      const synonymMap: Record<string, string[]> = {
        // Landscaping
        'landscaping': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
        'landscape': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
        
        // Cleaning Services
        'cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
        'house cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
        
        // Solar/Energy
        'solar': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
        'solar installation': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
        
        // Remodeling/Construction
        'remodeling': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
        'renovation': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
        
        // Plumbing
        'plumbing': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
        'plumber': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
        
        // Electrical
        'electrical': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
        'electrician': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
        
        // HVAC
        'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        'heating': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        'cooling': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        
        // Roofing
        'roofing': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
        'roofer': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
        
        // Flooring
        'flooring': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
        'floor': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
        
        // Painting
        'painting': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
        'painter': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
        
        // Handyman
        'handyman': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
        'handy man': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
        
        // Pool Services
        'pool': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
        'pool service': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
        
        // Pest Control
        'pest control': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
        'exterminator': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
        
        // Security
        'security': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
        'alarm': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
        
        // Windows & Doors
        'windows': ['windows', 'window', 'window replacement', 'window installation', 'window repair', 'window contractor', 'glass', 'glass repair', 'window company'],
        'doors': ['doors', 'door', 'door replacement', 'door installation', 'door repair', 'door contractor', 'garage door', 'garage door repair', 'door company'],
        
        // Insulation
        'insulation': ['insulation', 'insulate', 'insulation installation', 'insulation contractor', 'attic insulation', 'wall insulation', 'energy efficiency'],
        
        // Concrete/Masonry
        'concrete': ['concrete', 'concrete work', 'concrete contractor', 'concrete repair', 'concrete installation', 'driveway', 'patio', 'sidewalk', 'foundation'],
        'masonry': ['masonry', 'mason', 'stone work', 'brick', 'brick work', 'stone', 'fireplace', 'chimney', 'masonry contractor'],
      }
      
      return synonymMap[serviceType.toLowerCase()] || [serviceType]
    }
    
    // Enhanced matching function that checks synonyms
    const tagsMatchSynonyms = (tags: string[], targetType: string): boolean => {
      if (!tags || !targetType) return false
      const synonyms = getProviderSynonyms(targetType)
      const lowerTags = tags.map(tag => tag.toLowerCase())
      
      return synonyms.some(synonym => 
        lowerTags.some(tag => 
          tag.includes(synonym.toLowerCase()) || 
          synonym.toLowerCase().includes(tag)
        )
      )
    }
    
    // Helper function for simple keyword matching (for secondary criteria)
    const tagsContainKeyword = (tags: string[], keyword: string): boolean => {
      if (!keyword || !tags) return false
      const lowerKeyword = keyword.toLowerCase()
      return tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    }
    
    // Enhanced scoring with synonym matching
    const scoredProviders = providers
      .map((p) => {
        let score = 0
        
        // Primary type matching with synonyms
        if (type && tagsMatchSynonyms(p.tags, type)) {
          score += 5 // High priority for exact type match
        }
        
        // Goal matching with synonyms
        if (goal && tagsMatchSynonyms(p.tags, goal)) {
          score += 3 // Medium-high priority for goal match
        }
        
        // Secondary criteria
        if (when && tagsContainKeyword(p.tags, when)) score += 1
        if (budget && tagsContainKeyword(p.tags, budget)) score += 1
        
        // If no specific criteria selected, give all providers a base score
        if (!type && !goal && !when && !budget) {
          score = 1 // Base score so all providers show up when no filters applied
        }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected type with synonyms
        const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(a.p.tags, type)) || (goal && tagsMatchSynonyms(a.p.tags, goal))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(b.p.tags, type)) || (goal && tagsMatchSynonyms(b.p.tags, goal))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!type && !goal) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        // Sort by score (highest first)
        if (b.score !== a.score) return b.score - a.score
        
        // Then by rating
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        
        // Finally by name
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
    
    return scoredProviders
  }
  
  const values = new Set<string>(Object.values(answers))
  const withScores = providers.map((p) => {
    const matches = p.tags.reduce((acc, t) => acc + (values.has(t) ? 1 : 0), 0)
    return { p, score: matches }
  })
  withScores.sort((a, b) => {
    // Featured providers first, but ONLY if they match the selected criteria
    const aIsFeatured = isFeaturedProvider(a.p)
    const bIsFeatured = isFeaturedProvider(b.p)
    
    // For generic categories, check if featured providers match any selected criteria
    const aFeaturedMatchesCriteria = aIsFeatured && values.size > 0 ? 
      a.p.tags.some(t => values.has(t)) : false
    const bFeaturedMatchesCriteria = bIsFeatured && values.size > 0 ? 
      b.p.tags.some(t => values.has(t)) : false
    
    // Only prioritize featured providers that match the criteria
    const am = aFeaturedMatchesCriteria ? 1 : 0
    const bm = bFeaturedMatchesCriteria ? 1 : 0
    if (bm !== am) return bm - am
    
    // If no specific criteria selected, fall back to original featured logic
    if (values.size === 0) {
      const amFallback = aIsFeatured ? 1 : 0
      const bmFallback = bIsFeatured ? 1 : 0
      if (bmFallback !== amFallback) return bmFallback - amFallback
    }
    
    if (b.score !== a.score) return b.score - a.score
    const ar = a.p.rating ?? 0
    const br = b.p.rating ?? 0
    if (br !== ar) return br - ar
    return a.p.name.localeCompare(b.p.name)
  })
  return withScores.map((s) => s.p)
}

// persistFunnelForUser function has been moved to src/pages/CategoryPage.tsx

// Removed createBookingRow function - no longer needed since form submission is removed

/**
 * BUSINESS APPLICATION SUBMISSION
 * 
 * This function handles business application submissions from the /business page.
 * It stores applications in the 'business_applications' table for admin review.
 * 
 * NOTE: The tier parameter is captured but not stored in database yet.
 * You need to add 'tier_requested' and 'status' columns to business_applications table.
 * 
 * Current flow:
 * 1. User fills form on /business page (selects free or featured tier)
 * 2. Application is submitted to business_applications table
 * 3. User is redirected to create business account
 * 4. User can then go to My Business page to request free listings
 */
// createBusinessApplication moved to src/pages/BusinessPage.tsx

// (Kept for backward compatibility with older forms)
// Removed unused createContactLead implementation after migrating contact to general user form

// getFunnelQuestions function has been moved to src/pages/CategoryPage.tsx

// trackChoice function has been moved to src/pages/CategoryPage.tsx

// Funnel component has been moved to src/pages/CategoryPage.tsx

// CategoryFilters component has been moved to src/pages/CategoryPage.tsx

// CategoryPage component has been moved to src/pages/CategoryPage.tsx
// AboutPage component has been moved to src/pages/AboutPage.tsx
// ContactPage component has been moved to src/pages/ContactPage.tsx

// BusinessPage moved to src/pages/BusinessPage.tsx

// Utility function to fix malformed image URLs
function fixImageUrl(url: string): string {
  if (!url) return ''
  
  // If URL is already complete with extension, return as-is
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return url
  }
  
  // If URL ends with a filename but no extension, try common extensions
  if (url.includes('/business-images/')) {
    const baseUrl = url
    // For now, default to .jpg as it's most common
    return baseUrl + '.jpg'
  }
  
  return url
}

function BookPage() {
  const params = new URLSearchParams(window.location.search)
  const categoryKey = (params.get('category') as CategoryKey) || 'real-estate'
  const category = categories.find((c) => c.key === categoryKey)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Provider[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [claimAsk, setClaimAsk] = useState<Record<string, boolean>>({})
  // Removed contact toggle for top matches (always expanded)
  const answers = useMemo(() => {
    // First try to get filter answers from URL parameters (from CategoryFilters)
    const urlFilters = params.get('filters')
    if (urlFilters) {
      try {
        const parsedFilters = JSON.parse(decodeURIComponent(urlFilters))
        if (parsedFilters && typeof parsedFilters === 'object') {
          return parsedFilters
        }
      } catch (e) {
        console.warn('Failed to parse URL filters:', e)
      }
    }
    // Fallback to localStorage answers (from questionnaire)
    return getLocalStorageJSON<Record<string, string>>(`bf-tracking-${categoryKey}`, {})
  }, [categoryKey, params.get('filters')])
  const auth = useAuth()

  function recompute() {
    const ranked = scoreProviders(categoryKey, answers)
    const fallback = providersByCategory[categoryKey] || []
    setResults(ranked.length ? ranked : fallback)
  }

  useEffect(() => {
    recompute()
    // Always show results immediately - no authentication or form submission required
    setSubmitted(true)
  }, [categoryKey, answers])

  useProviderUpdates(() => { recompute() }, [categoryKey, answers])
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl bg-white max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold tracking-tight">Bonita's top {category?.name.toLowerCase() || 'providers'}</h2>
          {auth.isAuthed || submitted || results.length > 0 ? (
            <div className="mt-5 text-left">
              <div className="mt-4 text-sm text-neutral-500">Top matches</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {results.slice(0, 3).map((r) => {
                  const d = getProviderDetails(r)
                  const canShowRich = Boolean(r.isMember)
                  return (
                    <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                      {/* Business Image with Overlays */}
                      <div className="relative mb-3">
                        {d.images && d.images.length > 0 ? (
                          <img 
                            src={fixImageUrl(d.images?.[0] || '')} 
                            alt={`${r.name} business photo`} 
                            className="w-full h-40 object-cover rounded-lg border border-neutral-100"
                            onError={(e) => {
                              console.warn(`[BookPage] Failed to load image for ${r.name}:`, fixImageUrl(d.images?.[0] || ''))
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = 'none'
                              img.parentElement!.innerHTML = `
                                <div class="w-full h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                                  <div class="text-center text-neutral-500">
                                    <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <p class="text-xs">No image available</p>
                                  </div>
                                </div>
                              `
                            }}
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                            <div className="text-center text-neutral-500">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs">No image available</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Featured Badge - Top Right Over Image */}
                        {isFeaturedProvider(r) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Tag - Positioned between image and title, half on image */}
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm mt-[-1rem]">
                            {r.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Business Name and Rating */}
                      <div className="flex items-center justify-between">
                        <Link to={`/provider/${r.slug}`} className="font-medium cursor-pointer hover:underline">
                          {r.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {/* Coupon discount display */}
                          {r.coupon_code && r.coupon_discount && (
                            <div className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                              {r.coupon_discount}
                            </div>
                          )}
                          {/* Debug: Show coupon data for troubleshooting */}
                          {r.name.toLowerCase().includes('thai') && (
                            <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                              Debug: coupon_code="{r.coupon_code}", coupon_discount="{r.coupon_discount}", hasCode={!!r.coupon_code}, hasDiscount={!!r.coupon_discount}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {r.rating?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      
                      {canShowRich && d.reviews && d.reviews.length > 0 && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Reviews</div>
                          <ul className="mt-1 space-y-1 text-sm">
                            {d.reviews.map((rv, idx) => (
                              <li key={idx} className="text-neutral-700">
                                <span className="text-neutral-500">{rv.author}</span> — <span className="flex items-center gap-1 inline-flex"><span>{rv.rating.toFixed(1)}</span><svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span> — {rv.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {canShowRich && d.posts && d.posts.length > 0 && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Related Posts</div>
                          <ul className="mt-1 list-disc list-inside text-sm">
                            {d.posts.map((ps) => (
                              <li key={ps.id}><a className="text-neutral-700 hover:underline" href={ps.url || '#'}>{ps.title}</a></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3 text-sm">
                        {d.phone && <div>📞 {d.phone}</div>}
                        {canShowRich && d.email && <div>✉️ {d.email}</div>}
                        {canShowRich && d.website && (
                          <div>🔗 <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                        )}
                        {d.address && <div>📍 {d.address}</div>}
                        <div className="mt-2 flex justify-end">
                          <button
                            title="Claim this business"
                            className="text-[11px] text-neutral-600 hover:text-neutral-900"
                            onClick={() => {
                              if (claimAsk[r.id]) {
                                const catLabel = ((): string => {
                                  switch (categoryKey) {
                                    case 'restaurants-cafes': return 'Restaurants'
                                    case 'home-services': return 'Home Services'
                                    case 'health-wellness': return 'Health & Wellness'
                                    case 'real-estate': return 'Real Estate'
                                    case 'professional-services': return 'Professional Services'
                                    default: return ''
                                  }
                                })()
                                const q = new URLSearchParams({
                                  business_name: r.name,
                                  email: d.email || '',
                                  phone: d.phone || '',
                                  challenge: `I would like to claim ${r.name}.`,
                                  category: catLabel,
                                })
                                window.location.assign(`/business?${q.toString()}#apply`)
                              } else {
                                setClaimAsk((m) => ({ ...m, [r.id]: true }))
                              }
                            }}
                          >
                            {claimAsk[r.id] ? 'Claim this business' : '🏢'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {results.length > 3 && (
                <>
                  <div className="mt-5 text-sm text-neutral-500">Other providers</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {results.slice(3).map((r) => {
                      const open = !!expanded[r.id]
                      const d = getProviderDetails(r)
                      return (
                        <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                          {/* Business Image */}
                          {d.images && d.images.length > 0 ? (
                            <div className="mb-3">
                              <img 
                                src={fixImageUrl(d.images?.[0] || '')} 
                                alt={`${r.name} business photo`} 
                                className="w-full h-24 object-cover rounded-lg border border-neutral-100"
                                onError={(e) => {
                                  console.warn(`[BookPage] Failed to load image for ${r.name}:`, fixImageUrl(d.images?.[0] || ''))
                                  const img = e.currentTarget as HTMLImageElement
                                  img.style.display = 'none'
                                  img.parentElement!.innerHTML = `
                                    <div class="w-full h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                                      <div class="text-center text-neutral-500">
                                        <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p class="text-xs">No image</p>
                                      </div>
                                    </div>
                                  `
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3 h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                              <div className="text-center text-neutral-500">
                                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-xs">No image</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <Link to={`/provider/${r.slug}`} className="font-medium flex items-center gap-2 cursor-pointer hover:underline">
                              <div className="font-medium flex items-center gap-2">
                                {r.name}
                                {isFeaturedProvider(r) && (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">Featured</span>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-2">
                              {/* Coupon discount display */}
                              {r.coupon_code && r.coupon_discount && (
                                <div className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                                  {r.coupon_discount}
                                </div>
                              )}
                              {/* Debug: Show coupon data for troubleshooting */}
                              {r.name.toLowerCase().includes('thai') && (
                                <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                                  Debug: coupon_code="{r.coupon_code}", coupon_discount="{r.coupon_discount}", hasCode={!!r.coupon_code}, hasDiscount={!!r.coupon_discount}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-neutral-500">
                                <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {r.rating?.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          {/* Show category only */}
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              {r.category_key.replace('-', ' ')}
                            </span>
                          </div>
                          <button onClick={() => setExpanded((e: Record<string, boolean>) => ({ ...e, [r.id]: !open }))} className="mt-2 text-sm rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5">{open ? 'Hide' : 'View'}</button>
                          <div className="collapsible mt-3 text-sm" data-open={open ? 'true' : 'false'}>
                              {r.isMember && d.reviews && d.reviews.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Reviews</div>
                                  <ul className="mt-1 space-y-1">
                                    {d.reviews.map((rv, idx) => (
                                      <li key={idx} className="text-neutral-700">
                                        <span className="text-neutral-500">{rv.author}</span> — <span className="flex items-center gap-1 inline-flex"><span>{rv.rating.toFixed(1)}</span><svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span> — {rv.text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.isMember && d.posts && d.posts.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Related Posts</div>
                                  <ul className="mt-1 list-disc list-inside">
                                    {d.posts.map((ps) => (
                                      <li key={ps.id}><a className="text-neutral-700 hover:underline" href={ps.url || '#'}>{ps.title}</a></li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="mt-2">
                                {d.phone && <div>📞 {d.phone}</div>}
                                {r.isMember && d.email && <div>✉️ {d.email}</div>}
                                {r.isMember && d.website && (
                                  <div>🔗 <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                                )}
                                {d.address && <div>📍 {d.address}</div>}
                                <div className="mt-2 flex justify-end">
                                  <button
                                    title="Claim this business"
                                    className="text-[11px] text-neutral-600 hover:text-neutral-900"
                                    onClick={() => {
                                      if (claimAsk[r.id]) {
                                        const catLabel = ((): string => {
                                          switch (categoryKey) {
                                            case 'restaurants-cafes': return 'Restaurants'
                                            case 'home-services': return 'Home Services'
                                            case 'health-wellness': return 'Health & Wellness'
                                            case 'real-estate': return 'Real Estate'
                                            case 'professional-services': return 'Professional Services'
                                            default: return ''
                                          }
                                        })()
                                        const q = new URLSearchParams({
                                          business_name: r.name,
                                          email: d.email || '',
                                          phone: d.phone || '',
                                          challenge: `I would like to claim ${r.name}.`,
                                          category: catLabel,
                                        })
                                        window.location.assign(`/business?${q.toString()}#apply`)
                                      } else {
                                        setClaimAsk((m) => ({ ...m, [r.id]: true }))
                                      }
                                    }}
                                  >
                                    {claimAsk[r.id] ? 'Claim this business' : '🏢'}
                                  </button>
                                </div>
                              </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 text-center">
              <p className="text-neutral-600">Loading the best {category?.name.toLowerCase() || 'providers'} for you...</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

function AppInit() {
  useEffect(() => {
    ;(async () => {
      const ok = await loadProvidersFromSupabase()
      if (!ok) await loadProvidersFromSheet()
    })()
    function onRefresh() {
      ;(async () => {
        const ok = await loadProvidersFromSupabase()
        if (!ok) await loadProvidersFromSheet()
      })()
    }
    window.addEventListener('bf-refresh-providers', onRefresh as EventListener)
    return () => {
      window.removeEventListener('bf-refresh-providers', onRefresh as EventListener)
    }
  }, [])
  return null
}

export default function App() {
  const [, setVersion] = useState(0)
  
  // Listen for provider updates to trigger re-renders when data loads
  useProviderUpdates(() => { setVersion((v: number) => v + 1) }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInit />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="signin" element={<SignInPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="community" element={<CommunityIndex />} />
            <Route path="community/:category" element={<CommunityPost />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="owner" element={
              <ProtectedRoute allowedRoles={['business']}>
                <OwnerPage />
              </ProtectedRoute>
            } />
            <Route path="my-business" element={
              <ProtectedRoute allowedRoles={['business']}>
                <MyBusinessPage />
              </ProtectedRoute>
            } />
            <Route path="pricing" element={
              <ProtectedRoute allowedRoles={['business']}>
                <PricingPage />
              </ProtectedRoute>
            } />
            <Route path="account" element={<AccountPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage categories={categories} scoreProviders={scoreProviders} />} />
            <Route path="provider/:id" element={<ProviderPage providersByCategory={providersByCategory} />} />
            <Route path="thank-you" element={<ThankYouPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
