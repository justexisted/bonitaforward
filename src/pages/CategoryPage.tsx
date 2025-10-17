import { useState, useEffect } from 'react'
import Funnel, { type CategoryKey, getFunnelQuestions } from '../components/Funnel'
import CategoryFilters from '../components/CategoryFilters'

// ============================================================================
// TYPES
// ============================================================================

// CategoryKey type imported from Funnel component

type Provider = {
  id: string
  name: string
  slug: string
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
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
  bonita_resident_discount?: string | null
}

// FunnelOption and FunnelQuestion types imported from Funnel component

type ProviderDetails = {
  phone?: string
  email?: string
  website?: string
  address?: string
  images?: string[]
  reviews?: { author: string; rating: number; text: string }[]
  posts?: { id: string; title: string; url?: string }[]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================


function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

/**
 * Get JSON from localStorage with error handling
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


function isFeaturedProvider(p: Provider): boolean {
  return Boolean(p.isMember)
}

function getProviderDetails(p: Provider): ProviderDetails {
  return {
    phone: p.phone || undefined,
    email: p.email || undefined,
    website: p.website || undefined,
    address: p.address || undefined,
    images: p.images && p.images.length > 0 
      ? p.images.filter(img => img && typeof img === 'string' && img.trim().length > 0)
      : undefined,
    reviews: undefined,
    posts: undefined,
  }
}

// ============================================================================
// FUNNEL CONFIGURATION
// ============================================================================

// Funnel configuration moved to Funnel component
// getFunnelQuestions imported from Funnel component
// trackChoice function moved to Funnel component
// scoreProviders function is passed as a prop from the parent component
// persistFunnelForUser function moved to Funnel component

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Funnel component for collecting user preferences
 */
// Funnel component moved to src/components/Funnel.tsx

/**
 * CategoryFilters component for displaying filtered results
 */
// CategoryFilters moved to src/components/CategoryFilters.tsx

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Category listing page with funnel and filtering functionality
 * 
 * Features:
 * - Dynamic category detection from URL
 * - Multi-step funnel for collecting user preferences
 * - Filtered results display with provider cards
 * - Local storage persistence for user answers
 * - Supabase integration for authenticated users
 * - Responsive design with mobile optimizations
 */
interface CategoryPageProps {
  categories: Array<{
    key: CategoryKey
    name: string
    description: string
    icon: string
  }>
  scoreProviders: (category: CategoryKey, answers: Record<string, string>) => Provider[]
}

export default function CategoryPage({ 
  categories, 
  scoreProviders 
}: CategoryPageProps) {
  const path = window.location.pathname.split('/').pop() as CategoryKey
  const category = categories.find((c) => c.key === path)
  if (!category) return <Container className="py-10">Category not found.</Container>
  
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false)
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({})

  // Check if user has completed questionnaire for this category
  useEffect(() => {
    try {
      const key = `bf-tracking-${category.key}`
      const existing = getLocalStorageJSON<Record<string, string>>(key, {})
      // Clear old localStorage data for restaurants-cafes due to question structure change
      if (category.key === 'restaurants-cafes' && existing && Object.keys(existing).length > 0) {
        const questions = getFunnelQuestions(category.key, {})
        const hasOldAnswers = Object.keys(existing).some(answerKey => 
          !questions.some(q => q.id === answerKey)
        )
        if (hasOldAnswers) {
          localStorage.removeItem(key)
          setHasCompletedQuestionnaire(false)
          setQuestionnaireAnswers({})
          return
        }
      }
      
      if (existing && typeof existing === 'object') {
        const questions = getFunnelQuestions(category.key, existing)
        const isComplete = questions.every((q) => existing[q.id])
        setHasCompletedQuestionnaire(isComplete)
        setQuestionnaireAnswers(existing)
      }
    } catch {}
  }, [category.key])
  
  return (
    <section className="py-4 px-4">
      {/* Content */}
      {hasCompletedQuestionnaire ? (
        <CategoryFilters 
          category={category} 
          answers={questionnaireAnswers}
          scoreProviders={scoreProviders as any}
          getFunnelQuestions={getFunnelQuestions}
          getProviderDetails={getProviderDetails as any}
          isFeaturedProvider={isFeaturedProvider as any}
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-2">
              Let's find the best match for you in {category.name}
            </h2>
          </div>
          <Funnel category={category} />
        </div>
      )}
    </section>
  )
}
