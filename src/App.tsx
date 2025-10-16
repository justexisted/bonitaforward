import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ResetPasswordPage from './pages/ResetPassword'
import './index.css'
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
import CalendarPage from './pages/Calendar'
import NotFoundPage from './pages/NotFound'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ProviderPage from './pages/ProviderPage'
import CategoryPage from './pages/CategoryPage'
import BookPage from './pages/BookPage'
import BusinessPage from './pages/BusinessPage'
import HomePage from './pages/HomePage'
import ThankYouPage from './pages/ThankYouPage'

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
// getLocalStorageJSON moved to pages that use it



// getAllProviders function moved to ProviderPage.tsx

// useProviderUpdates moved to src/pages/HomePage.tsx

// LoadingSpinner moved to src/pages/HomePage.tsx

// Container moved to src/pages/HomePage.tsx








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

// CategoryCard moved to src/pages/HomePage.tsx

// CalendarSection moved to src/pages/HomePage.tsx

// CommunitySection moved to src/pages/HomePage.tsx

// Confetti moved to src/pages/ThankYouPage.tsx

// ThankYouPage moved to src/pages/ThankYouPage.tsx

// HomePage moved to src/pages/HomePage.tsx

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


// ProviderDetails type moved to src/pages/BookPage.tsx

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

// getProviderDetails moved to src/pages/BookPage.tsx

// providersByCategory moved to App component state

async function loadProvidersFromSheet(setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void): Promise<void> {
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
    setProvidersByCategory(ensureDemoMembers(grouped))
    // console.log('[Sheets] Providers loaded from Google Sheets', grouped)
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
}

async function loadProvidersFromSupabase(setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void): Promise<boolean> {
  console.log('[Supabase] Starting to load providers from Supabase...')
  try {
    const rows = await fetchProvidersFromSupabase()
    console.log('[Supabase] fetchProvidersFromSupabase returned:', rows?.length || 0, 'providers')
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
    setProvidersByCategory(grouped)
  
  // Log summary of loaded providers by category
  // Object.keys(grouped).forEach((category) => {
  //   const count = grouped[category as CategoryKey].length
  //   console.log(`[Supabase] ${category}: ${count} providers loaded`)
  // })
  
    // console.log('[Supabase] Providers loaded successfully', grouped)
    try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
    return true
  } catch (error) {
    console.error('[Supabase] Error loading providers:', error)
    return false
  }
}

function scoreProviders(category: CategoryKey, answers: Record<string, string>, providersByCategory: Record<CategoryKey, Provider[]>): Provider[] {
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

// fixImageUrl moved to src/pages/BookPage.tsx

// BookPage moved to src/pages/BookPage.tsx

function AppInit({ setProvidersByCategory }: { setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void }) {
  useEffect(() => {
    ;(async () => {
      console.log('[AppInit] Starting provider data loading...')
      const ok = await loadProvidersFromSupabase(setProvidersByCategory)
      console.log('[AppInit] Supabase loading result:', ok)
      if (!ok) {
        console.log('[AppInit] Supabase failed, trying Google Sheets fallback...')
        await loadProvidersFromSheet(setProvidersByCategory)
        console.log('[AppInit] Google Sheets fallback completed')
      }
    })()
    function onRefresh() {
      ;(async () => {
        console.log('[AppInit] Refreshing provider data...')
        const ok = await loadProvidersFromSupabase(setProvidersByCategory)
        if (!ok) await loadProvidersFromSheet(setProvidersByCategory)
      })()
    }
    window.addEventListener('bf-refresh-providers', onRefresh as EventListener)
    return () => {
      window.removeEventListener('bf-refresh-providers', onRefresh as EventListener)
    }
  }, [setProvidersByCategory])
  return null
}

export default function App() {
  const [providersByCategory, setProvidersByCategory] = useState<Record<CategoryKey, Provider[]>>({
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  })

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInit setProvidersByCategory={setProvidersByCategory} />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage providersByCategory={providersByCategory as any} />} />
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
            <Route path="book" element={<BookPage categories={categories} scoreProviders={(category, answers) => scoreProviders(category, answers, providersByCategory)} providersByCategory={providersByCategory} />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage categories={categories} scoreProviders={(category, answers) => scoreProviders(category, answers, providersByCategory)} />} />
            <Route path="provider/:id" element={<ProviderPage providersByCategory={providersByCategory} />} />
            <Route path="thank-you" element={<ThankYouPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
