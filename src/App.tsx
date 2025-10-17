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
import { type CategoryKey, type Provider, generateSlug, ensureDemoMembers } from './utils/helpers'
import { scoreProviders } from './utils/providerScoring'

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

// Provider type imported from src/utils/helpers.ts
// ensureDemoMembers imported from src/utils/helpers.ts


// ProviderDetails type moved to src/pages/BookPage.tsx

// Removed unused providerDescriptions/getProviderDescription to satisfy TypeScript build

// generateSlug imported from src/utils/helpers.ts
// isFeaturedProvider imported from src/utils/helpers.ts

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

// ============================================================================
// PROVIDER SCORING LOGIC
// ============================================================================

// scoreProviders function moved to src/utils/providerScoring.ts

/*
// OLD IMPLEMENTATION - Now in src/utils/providerScoring.ts
// This 540-line function has been extracted for better maintainability
// See src/utils/providerScoring.ts for the complete implementation
function scoreProviders(...) { ... }
*/

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
