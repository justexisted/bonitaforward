import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

type FunnelOption = {
  id: string
  label: string
}

type FunnelQuestion = {
  id: string
  prompt: string
  options: FunnelOption[]
}

interface FunnelProps {
  category: {
    key: CategoryKey
    name: string
    description: string
    icon: string
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
        { id: 'solar', label: 'Solar' },
        { id: 'cleaning', label: 'Cleaning' },
        { id: 'remodeling', label: 'Remodeling' },
        { id: 'plumbing', label: 'Plumbing' },
        { id: 'electrical', label: 'Electrical' },
        { id: 'hvac', label: 'HVAC' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'timeline',
      prompt: "What's your timeline?",
      options: [
        { id: 'asap', label: 'ASAP' },
        { id: '1-month', label: 'Within 1 month' },
        { id: '3-months', label: 'Within 3 months' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Approximate budget?',
      options: [
        { id: 'under-1k', label: 'Under $1,000' },
        { id: '1k-5k', label: '$1,000 - $5,000' },
        { id: '5k-10k', label: '$5,000 - $10,000' },
        { id: '10k-plus', label: '$10,000+' },
      ],
    },
    {
      id: 'property-type',
      prompt: 'Property type?',
      options: [
        { id: 'single-family', label: 'Single Family' },
        { id: 'condo', label: 'Condo' },
        { id: 'townhouse', label: 'Townhouse' },
        { id: 'commercial', label: 'Commercial' },
      ],
    },
  ],
  'health-wellness': [
    {
      id: 'type',
      prompt: 'What type of service?',
      options: [
        { id: 'dental', label: 'Dental' },
        { id: 'chiropractor', label: 'Chiropractor' },
        { id: 'gym', label: 'Gym/Fitness' },
        { id: 'salon', label: 'Salon/Beauty' },
        { id: 'spa', label: 'Spa/MedSpa' },
        { id: 'medical', label: 'Medical' },
        { id: 'therapy', label: 'Therapy' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'frequency',
      prompt: 'How often do you need this service?',
      options: [
        { id: 'one-time', label: 'One-time' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'as-needed', label: 'As needed' },
      ],
    },
    {
      id: 'experience',
      prompt: 'Experience level?',
      options: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
        { id: 'any', label: 'Any level' },
      ],
    },
    {
      id: 'location',
      prompt: 'Preferred location?',
      options: [
        { id: 'bonita', label: 'Bonita' },
        { id: 'nearby', label: 'Nearby areas' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
  ],
  'restaurants-cafes': [
    {
      id: 'occasion',
      prompt: 'What\'s the occasion?',
      options: [
        { id: 'casual', label: 'Casual dining' },
        { id: 'date-night', label: 'Date night' },
        { id: 'family', label: 'Family meal' },
        { id: 'business', label: 'Business meeting' },
        { id: 'celebration', label: 'Celebration' },
        { id: 'quick-bite', label: 'Quick bite' },
      ],
    },
    {
      id: 'cuisine',
      prompt: 'Cuisine preference?',
      options: [
        { id: 'american', label: 'American' },
        { id: 'italian', label: 'Italian' },
        { id: 'mexican', label: 'Mexican' },
        { id: 'asian', label: 'Asian' },
        { id: 'mediterranean', label: 'Mediterranean' },
        { id: 'any', label: 'Any cuisine' },
      ],
    },
    {
      id: 'price-range',
      prompt: 'Price range?',
      options: [
        { id: 'budget', label: '$ (Budget-friendly)' },
        { id: 'moderate', label: '$$ (Moderate)' },
        { id: 'upscale', label: '$$$ (Upscale)' },
        { id: 'fine-dining', label: '$$$$ (Fine dining)' },
      ],
    },
    {
      id: 'dietary',
      prompt: 'Dietary restrictions?',
      options: [
        { id: 'none', label: 'None' },
        { id: 'vegetarian', label: 'Vegetarian' },
        { id: 'vegan', label: 'Vegan' },
        { id: 'gluten-free', label: 'Gluten-free' },
        { id: 'keto', label: 'Keto' },
      ],
    },
  ],
  'professional-services': [
    {
      id: 'service',
      prompt: 'What service do you need?',
      options: [
        { id: 'legal', label: 'Legal' },
        { id: 'accounting', label: 'Accounting' },
        { id: 'consulting', label: 'Consulting' },
        { id: 'marketing', label: 'Marketing' },
        { id: 'insurance', label: 'Insurance' },
        { id: 'financial', label: 'Financial Planning' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How urgent is this?',
      options: [
        { id: 'urgent', label: 'Very urgent' },
        { id: 'soon', label: 'Within a month' },
        { id: 'planning', label: 'Planning ahead' },
        { id: 'exploring', label: 'Just exploring' },
      ],
    },
    {
      id: 'business-size',
      prompt: 'Business size?',
      options: [
        { id: 'individual', label: 'Individual' },
        { id: 'small', label: 'Small business' },
        { id: 'medium', label: 'Medium business' },
        { id: 'enterprise', label: 'Enterprise' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget range?',
      options: [
        { id: 'under-1k', label: 'Under $1,000' },
        { id: '1k-5k', label: '$1,000 - $5,000' },
        { id: '5k-15k', label: '$5,000 - $15,000' },
        { id: '15k-plus', label: '$15,000+' },
      ],
    },
  ],
}

// ============================================================================
// FUNNEL LOGIC FUNCTIONS
// ============================================================================

/**
 * Get funnel questions for a specific category
 * EXPORTED for use in CategoryPage and CategoryFilters
 */
export function getFunnelQuestions(categoryKey: CategoryKey, _answers: Record<string, string>): FunnelQuestion[] {
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

/**
 * Track user choices in localStorage
 */
function trackChoice(category: CategoryKey, questionId: string, optionId: string) {
  try {
    const key = `bf-tracking-${category}`
    const existing = getLocalStorageJSON<Record<string, string>>(key, {})
    existing[questionId] = optionId
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {}
}

/**
 * Persist funnel answers per user to Supabase (if tables exist)
 */
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }) {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return

  try {
    const { supabase } = await import('../lib/supabase')
    
    // Check if a record already exists for this user and category
    const { data: existing } = await supabase
      .from('funnel_responses')
      .select('id')
      .eq('user_email', email)
      .eq('category', category)
      .maybeSingle()

    if (existing) {
      // Update existing record
      await supabase
        .from('funnel_responses')
        .update({ answers })
        .eq('id', existing.id)
    } else {
      // Insert new record
      await supabase
        .from('funnel_responses')
        .insert({ user_email: email, category, answers })
    }
  } catch (err) {
    console.warn('[Supabase] persist funnel_responses failed (safe to ignore if table missing)', err)
  }
}

// ============================================================================
// FUNNEL COMPONENT
// ============================================================================

/**
 * Funnel component - Interactive question funnel for category filtering
 * 
 * Displays a multi-step questionnaire with:
 * - Step-by-step question progression
 * - Local storage persistence of answers
 * - Supabase persistence for authenticated users
 * - Animation between steps
 * - Summary display at completion
 * - Navigation to booking page with answers
 * 
 * Used in category pages to help users find the best providers
 * based on their specific needs and preferences.
 * 
 * @param category - Category object with key, name, description, and icon
 */
export default function Funnel({ category }: FunnelProps) {
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

  /**
   * Handle option selection and advance to next step
   */
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

// Export types for use in other components
export type { CategoryKey, FunnelOption, FunnelQuestion }
