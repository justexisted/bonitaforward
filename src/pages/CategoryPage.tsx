import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

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

type FunnelOption = {
  id: string
  label: string
}

type FunnelQuestion = {
  id: string
  prompt: string
  options: FunnelOption[]
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

const funnelConfig: Record<CategoryKey, FunnelQuestion[]> = {
  'real-estate': [
    { id: 'need', prompt: 'What do you need help with?', options: [ { id: 'buy', label: 'Buying' }, { id: 'sell', label: 'Selling' }, { id: 'rent', label: 'Renting' } ] },
    { id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] },
    { id: 'budget', prompt: 'Approximate budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] },
    { id: 'beds', prompt: 'Bedrooms', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4', label: '4+' } ] },
  ],
  'home-services': [
    {
      id: 'type',
      prompt: 'Which service do you need?',
      options: [
        { id: 'landscaping', label: 'Landscaping' },
        { id: 'cleaning', label: 'Cleaning' },
        { id: 'solar', label: 'Solar' },
        { id: 'remodeling', label: 'Remodeling' },
        { id: 'plumbing', label: 'Plumbing' },
        { id: 'electrical', label: 'Electrical' },
        { id: 'hvac', label: 'HVAC' },
        { id: 'roofing', label: 'Roofing' },
        { id: 'flooring', label: 'Flooring' },
        { id: 'painting', label: 'Painting' },
        { id: 'handyman', label: 'Handyman' },
        { id: 'pool', label: 'Pool Service' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How urgent is this?',
      options: [
        { id: 'emergency', label: 'Emergency (ASAP)' },
        { id: 'week', label: 'This week' },
        { id: 'month', label: 'This month' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget range?',
      options: [
        { id: 'low', label: 'Under $500' },
        { id: 'med', label: '$500 - $2000' },
        { id: 'high', label: '$2000+' },
      ],
    },
  ],
  'health-wellness': [
    {
      id: 'type',
      prompt: 'What type of service?',
      options: [
        { id: 'dental', label: 'Dental' },
        { id: 'medical', label: 'Medical' },
        { id: 'mental', label: 'Mental Health' },
        { id: 'fitness', label: 'Fitness' },
        { id: 'wellness', label: 'Wellness' },
        { id: 'specialist', label: 'Specialist' },
      ],
    },
    {
      id: 'insurance',
      prompt: 'Insurance type?',
      options: [
        { id: 'private', label: 'Private' },
        { id: 'medicare', label: 'Medicare' },
        { id: 'medicaid', label: 'Medicaid' },
        { id: 'none', label: 'No insurance' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How urgent?',
      options: [
        { id: 'urgent', label: 'Urgent' },
        { id: 'soon', label: 'Within a week' },
        { id: 'routine', label: 'Routine checkup' },
      ],
    },
  ],
  'restaurants-cafes': [
    {
      id: 'cuisine',
      prompt: 'What sounds good?',
      options: [
        { id: 'mexican', label: 'Mexican' },
        { id: 'asian', label: 'Asian' },
        { id: 'american', label: 'American' },
        { id: 'cafes', label: 'Cafés' },
      ],
    },
    {
      id: 'occasion',
      prompt: 'Occasion?',
      options: [
        { id: 'family', label: 'Family' },
        { id: 'casual', label: 'Casual' },
        { id: 'date', label: 'Date' },
      ],
    },
    {
      id: 'price',
      prompt: 'Price range?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
    {
      id: 'mode',
      prompt: 'Dine‑in or takeout?',
      options: [
        { id: 'dine', label: 'Dine‑in' },
        { id: 'takeout', label: 'Takeout' },
      ],
    },
  ],
  'professional-services': [
    {
      id: 'type',
      prompt: 'What service do you need?',
      options: [
        { id: 'legal', label: 'Legal' },
        { id: 'accounting', label: 'Accounting' },
        { id: 'consulting', label: 'Consulting' },
        { id: 'marketing', label: 'Marketing' },
        { id: 'design', label: 'Design' },
        { id: 'tech', label: 'Technology' },
      ],
    },
    {
      id: 'project',
      prompt: 'Project type?',
      options: [
        { id: 'one-time', label: 'One-time project' },
        { id: 'ongoing', label: 'Ongoing service' },
        { id: 'consultation', label: 'Consultation' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
  ],
}

function getFunnelQuestions(categoryKey: CategoryKey, _answers: Record<string, string>): FunnelQuestion[] {
  if (categoryKey === 'real-estate') {
    const list = [
      { id: 'need', prompt: 'What do you need help with?', options: [ { id: 'buy', label: 'Buying' }, { id: 'sell', label: 'Selling' }, { id: 'rent', label: 'Renting' } ] },
      { id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] },
      { id: 'budget', prompt: 'Approximate budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] },
      { id: 'beds', prompt: 'Bedrooms', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4', label: '4+' } ] },
    ]
    return list.slice(0, 4)
  }
  return funnelConfig[categoryKey].slice(0, 4)
}

function trackChoice(category: CategoryKey, questionId: string, optionId: string) {
  try {
    const key = `bf-tracking-${category}`
    const existing = getLocalStorageJSON<Record<string, string>>(key, {})
    existing[questionId] = optionId
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {}
}

// scoreProviders function is passed as a prop from the parent component

// Persist funnel answers per user to Supabase (if tables exist)
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }) {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return

  try {
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('funnel_responses')
      .upsert(
        { user_email: email, category_key: category, responses: answers, updated_at: new Date().toISOString() },
        { onConflict: 'user_email,category_key' }
      )
  } catch (err) {
    console.warn('[Supabase] upsert funnel_responses failed (safe to ignore if table missing)', err)
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Funnel component for collecting user preferences
 */
function Funnel({ category }: { category: { key: CategoryKey; name: string; description: string; icon: string } }) {
  const [step, setStep] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [anim, setAnim] = useState<'in' | 'out'>('in')
  const questions = useMemo(() => getFunnelQuestions(category.key, answers), [category.key, answers])
  const current = questions[step]
  const auth = useAuth()
  const initializedRef = useRef(false)

  // On mount, hydrate answers from localStorage so users never re-enter
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    try {
      const key = `bf-tracking-${category.key}`
      const existing = getLocalStorageJSON<Record<string, string>>(key, {})
      if (existing && typeof existing === 'object') {
        setAnswers(existing)
        // fast-forward step to first unanswered question
        const qs = getFunnelQuestions(category.key, existing)
        const firstUnanswered = qs.findIndex((q) => !existing[q.id])
        if (firstUnanswered >= 0) setStep(firstUnanswered)
        else setStep(qs.length)
      }
    } catch {}
  }, [category.key])

  function choose(option: FunnelOption) {
    trackChoice(category.key, current.id, option.id)
    setAnswers((a: Record<string, string>) => ({ ...a, [current.id]: option.id }))
    setAnim('out')
    setTimeout(() => {
      setStep((s: number) => Math.min(s + 1, questions.length))
      setAnim('in')
    }, 120)
  }

  // Whenever answers change and user is authenticated, persist to Supabase
  useEffect(() => {
    if (!auth.email) return
    persistFunnelForUser({ email: auth.email, category: category.key, answers })
  }, [auth.email, category.key, answers])

  const done = step >= questions.length

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-md text-center">
        {!done ? (
          <div key={current.id} className={`rounded-2xl border border-neutral-100 p-5 bg-white elevate transition-all duration-200 ${anim === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <div className="text-sm text-neutral-500">Step {step + 1} of {questions.length}</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">{current.prompt}</h3>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {current.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => choose(opt)}
                  className="btn btn-secondary sparkle border border-neutral-200"
                >
                  {opt.label}
        </button>
              ))}
      </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Great! Here's your summary</h3>
            <ul className="mt-3 text-sm text-neutral-700 text-left">
              {questions.map((q) => (
                <li key={q.id} className="flex justify-between border-b border-neutral-100 py-2">
                  <span className="text-neutral-500">{q.prompt}</span>
                  <span>{q.options.find((o) => o.id === answers[q.id])?.label || '-'}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <div className="flex flex-col gap-2">
                <Link
                  to={`/book?category=${category.key}`}
                  onClick={(e) => {
                    const card = (e.currentTarget.closest('section') as HTMLElement) || document.body
                    card.classList.add('slide-out-right')
                    setTimeout(() => {
                      // allow navigation after animation; Link will handle it
                    }, 160)
                  }}
                  className="btn btn-primary"
                >
                  Find Best Match
                </Link>
                <button
                  onClick={() => {
                    const container = (document.querySelector('section') as HTMLElement)
                    if (container) container.classList.add('slide-out-left')
                    setTimeout(() => {
                      try { localStorage.removeItem(`bf-tracking-${category.key}`) } catch {}
                      setAnswers({})
                      setStep(0)
                      setAnim('in')
                      if (container) container.classList.remove('slide-out-left')
                    }, 160)
                  }}
                  className="btn btn-secondary"
                >
                  Edit Answers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * CategoryFilters component for displaying filtered results
 */
function CategoryFilters({ 
  category, 
  answers,
  scoreProviders
}: { 
  category: { key: CategoryKey; name: string; description: string; icon: string }
  answers: Record<string, string>
  scoreProviders: (category: CategoryKey, answers: Record<string, string>) => Provider[]
}) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>(answers)
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const auth = useAuth()

  // Get available filter options based on category
  const getFilterOptions = (questionId: string) => {
    const questions = getFunnelQuestions(category.key, {})
    const question = questions.find(q => q.id === questionId)
    return question?.options || []
  }

  const updateFilter = (questionId: string, value: string) => {
    const newFilters = { ...selectedFilters, [questionId]: value }
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  const clearFilter = (questionId: string) => {
    const newFilters = { ...selectedFilters }
    delete newFilters[questionId]
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  // Apply initial filters on mount
  useEffect(() => {
    const scored = scoreProviders(category.key, selectedFilters)
    setFilteredProviders(scored)
  }, [category.key, selectedFilters, scoreProviders])

  const questions = getFunnelQuestions(category.key, {})

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-50">
          <img 
            src={category.icon} 
            alt={`${category.name} icon`}
            className="h-20 w-20 object-contain"
          />
        </span>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          Refine Your {category.name} Search
        </h3>
        <p className="text-sm text-neutral-600">
          Adjust your preferences to find the perfect match
        </p>
      </div>

      {/* Compact Filter Controls - Horizontal Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {questions.map((question) => {
          const options = getFilterOptions(question.id)
          const currentValue = selectedFilters[question.id]
          
          return (
            <div key={question.id} className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 block">
                {question.prompt}
              </label>
              <select
                value={currentValue || ''}
                onChange={(e) => {
                  if (e.target.value === '') {
                    clearFilter(question.id)
                  } else {
                    updateFilter(question.id, e.target.value)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Results - Always Visible */}
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-neutral-900">
            Your Matches ({filteredProviders.length})
          </h4>
        </div>
        
        {filteredProviders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProviders.slice(0, 8).map((provider) => {
                const details = getProviderDetails(provider)
                return (
                  <Link key={provider.id} to={`/provider/${provider.slug}`} className="block">
                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      {/* Provider Image with Overlays */}
                      <div className="relative">
                        {details.images && details.images.length > 0 ? (
                          <div className="aspect-video bg-neutral-100">
                            <img
                              src={details.images[0]}
                              alt={`${provider.name} business photo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement
                                img.style.display = 'none'
                                img.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
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
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                            <div className="text-center text-neutral-500">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs">No image available</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Featured Badge - Top Right Over Image */}
                        {isFeaturedProvider(provider) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Tag - Positioned between image and title, half on image */}
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start ml-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm">
                            {provider.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Provider Info */}
                      <div className="p-2 text-center mt-[-1rem]">
                        <div className="flex flex-col items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-neutral-900 text-lg">{provider.name}</h3>
                        </div>
                        
                        {/* Rating Display */}
                        {provider.rating && (
                          <div className="flex items-center justify-center gap-1 mb-3">
                            <span className="text-sm font-medium text-neutral-900">{provider.rating.toFixed(1)}</span>
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Tags - Only visible to admin, but hidden for restaurants-cafes */}
                        {auth.isAuthed && provider.tags && provider.tags.length > 0 && provider.category_key !== 'restaurants-cafes' && (
                          <div className="flex flex-wrap gap-1 justify-center mb-3">
                            {provider.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {filteredProviders.length > 8 && (
              <div className="text-center mt-6">
                <Link
                  to={`/book?category=${category.key}&filters=${encodeURIComponent(JSON.stringify(selectedFilters))}`}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All {filteredProviders.length} Results
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p>No matches found with your current filters.</p>
            <p className="text-sm mt-1">Try adjusting your preferences or clearing some filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

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
  providersByCategory: Record<CategoryKey, Provider[]>
  useProviderUpdates: (callback: () => void, deps: React.DependencyList) => void
  scoreProviders: (category: CategoryKey, answers: Record<string, string>) => Provider[]
}

export default function CategoryPage({ 
  categories, 
  providersByCategory, 
  useProviderUpdates,
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
          scoreProviders={scoreProviders}
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
