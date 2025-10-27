import React, { useEffect, useState } from 'react'
import Hero from '../components/Hero'
import CategoryCard, { type Category, type CategoryKey } from '../components/CategoryCard'
import CalendarSection from '../components/CalendarSection'
import CommunitySection from '../components/CommunitySection'
import Container from '../components/Container'

// Import Provider type from App.tsx to ensure consistency
type Provider = {
  id: string
  name: string
  slug: string
  category_key: CategoryKey
  tags: string[]
  rating?: number
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
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
  featured_since?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
  bonita_resident_discount?: string | null
}

const categories: Category[] = [
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
    icon: '/images/categories/Building2.png',
  },
  {
    key: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Fitness, medical, dental, and wellness services for a healthier you.',
    icon: '/images/categories/HeartPulse.png',
  },
  {
    key: 'real-estate',
    name: 'Real Estate',
    description: 'Find your dream home or sell with Bonita\'s top real estate professionals.',
    icon: '/images/categories/Home.png',
  },
  {
    key: 'professional-services',
    name: 'Professional Services',
    description: 'Legal, accounting, consulting, and other professional services.',
    icon: '/images/categories/Briefcase.png',
  },
]

/**
 * Reusable container component
 */
// Container moved to src/components/CommunitySection.tsx

/**
 * Reusable loading spinner component
 */
// LoadingSpinner moved to src/components/CalendarSection.tsx

/**
 * Category card component for the home page
 */
// CategoryCard moved to src/components/CategoryCard.tsx

/**
 * Calendar section component
 */
// CalendarSection moved to src/components/CalendarSection.tsx

/**
 * Community section component
 */
// CommunitySection moved to src/components/CommunitySection.tsx

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

interface HomePageProps {
  providersByCategory: Record<CategoryKey, Provider[]>
}

/**
 * Main Home page component
 */
export default function HomePage({ providersByCategory }: HomePageProps) {
  const [, setVersion] = useState(0)
  const [showMoreCategories, setShowMoreCategories] = useState(false)
  
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
            <div className="rounded-2xl p-4 bg-white">
              <button 
                onClick={() => setShowMoreCategories(!showMoreCategories)}
                className="cursor-pointer select-none text-sm w-full text-left flex items-center gap-2" 
                style={{ color: '#7070e3' }}
              >
                <svg 
                  className="w-3 h-3 transition-transform" 
                  style={{ transform: showMoreCategories ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                {showMoreCategories ? 'See less' : 'See more'}
              </button>
              {showMoreCategories && (
                <div className="mt-3">
                  {categories.slice(4).map((c) => (
                    <div key={c.key} className="mt-2">
                      <CategoryCard cat={c} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>
      <CalendarSection />
      <CommunitySection />
    </>
  )
}
