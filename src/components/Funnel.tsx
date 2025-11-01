import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLocalStorageJSON, type CategoryKey } from '../utils/helpers'
import { getFunnelQuestions, type FunnelOption } from '../utils/funnelQuestions'

// ============================================================================
// TYPES
// ============================================================================

// CategoryKey imported from src/utils/helpers.ts
// FunnelOption and FunnelQuestion imported from src/utils/funnelQuestions.ts

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

// getLocalStorageJSON imported from src/utils/helpers.ts
// getFunnelQuestions imported from src/utils/funnelQuestions.ts

// ============================================================================
// FUNNEL LOGIC FUNCTIONS
// ============================================================================

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
 * Clear funnel response from Supabase for authenticated users
 */
async function clearFunnelResponseForUser(email: string, category: CategoryKey): Promise<void> {
  try {
    const { supabase } = await import('../lib/supabase')
    
    const { error } = await supabase
      .from('funnel_responses')
      .delete()
      .eq('user_email', email)
      .eq('category', category)
    
    if (error) {
      console.warn('[Funnel] Failed to clear funnel response from Supabase:', error)
    }
  } catch (err) {
    console.warn('[Funnel] Exception clearing funnel response (safe to ignore):', err)
  }
}

/**
 * Persist funnel answers per user to Supabase (if tables exist)
 * Also tracks funnel attribution to the last viewed provider
 */
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }): Promise<void> {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return

  try {
    const { supabase } = await import('../lib/supabase')
    const { getLastViewedProvider, trackFunnelAttribution } = await import('../services/analyticsService')
    
    // Check if a record already exists for this user and category
    const { data: existing, error: checkError } = await supabase
      .from('funnel_responses')
      .select('id')
      .eq('user_email', email)
      .eq('category', category)
      .maybeSingle()

    if (checkError) {
      console.warn('[Funnel] Error checking for existing funnel response:', checkError)
      return
    }

    let funnelResponseId: string | null = null
    let isNewResponse = false

    if (existing) {
      // Update existing record (don't track attribution again)
      const { error: updateError } = await supabase
        .from('funnel_responses')
        .update({ answers })
        .eq('id', existing.id)
      
      if (updateError) {
        console.warn('[Funnel] Failed to update existing funnel response:', updateError)
        return
      }
      
      funnelResponseId = existing.id
      isNewResponse = false
    } else {
      // Insert new record and get its ID
      const { data: inserted, error: insertError } = await supabase
        .from('funnel_responses')
        .insert({ user_email: email, category, answers })
        .select('id')
        .single()
      
      if (insertError) {
        console.warn('[Funnel] Failed to insert funnel response:', insertError)
        return
      }
      
      if (inserted) {
        funnelResponseId = inserted.id
        isNewResponse = true
      }
    }

    // Track funnel attribution ONLY for NEW responses (prevents duplicate key violations)
    if (funnelResponseId && isNewResponse) {
      const lastViewedProviderId = getLastViewedProvider(30) // 30 minute attribution window
      
      let attributionResult
      if (lastViewedProviderId) {
        // Track attribution with provider
        attributionResult = await trackFunnelAttribution(funnelResponseId, lastViewedProviderId, document.referrer)
      } else {
        // No recent provider view - track as direct funnel submission
        attributionResult = await trackFunnelAttribution(funnelResponseId, null, document.referrer)
      }
      
      // Log attribution errors for visibility (but don't block the funnel)
      if (!attributionResult.success && !attributionResult.blocked) {
        console.warn('[Funnel] Attribution tracking failed:', attributionResult.error)
      }
    }
  } catch (err) {
    console.warn('[Funnel] Exception persisting funnel response (safe to ignore if table missing):', err)
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
  // Safety check: ensure questions array is not empty and step is valid
  const current = questions.length > 0 && step >= 0 && step < questions.length ? questions[step] : null
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
    if (!current) return // Safety check: don't proceed if current question is undefined
    trackChoice(category.key, current.id, option.id)
    setAnswers((a: Record<string, string>) => ({ ...a, [current.id]: option.id }))
    setAnim('out')
    setTimeout(() => {
      setStep((s: number) => Math.min(s + 1, questions.length))
      setAnim('in')
    }, 120)
  }

  // Debounce persistence to avoid race conditions with rapid answer changes
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Whenever answers change and user is authenticated, persist to Supabase (debounced)
  useEffect(() => {
    if (!auth.email || !Object.keys(answers).length) return
    
    // Clear existing timeout
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current)
    }
    
    // Set new timeout for debouncing (500ms delay)
    persistTimeoutRef.current = setTimeout(() => {
      persistFunnelForUser({ email: auth.email, category: category.key, answers })
    }, 500)
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
    }
  }, [auth.email, category.key, answers])

  // Validate that all questions are answered before showing summary
  const allQuestionsAnswered = questions.length > 0 && questions.every((q) => answers[q.id])
  const done = step >= questions.length && allQuestionsAnswered

  // Safety check: if questions array is empty or invalid, show error message
  if (questions.length === 0) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-red-200 p-5 bg-red-50 elevate">
            <p className="text-red-800">Sorry, there are no questions available for this category.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-md text-center">
        {!done && current ? (
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
        ) : !done && !current ? (
          // Loading or error state - shouldn't normally happen but handle gracefully
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
            <p className="text-neutral-600">Loading questions...</p>
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
                  to={`/book?category=${encodeURIComponent(category.key)}&filters=${encodeURIComponent(JSON.stringify(answers))}`}
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
                  onClick={async () => {
                    const container = (document.querySelector('section') as HTMLElement)
                    if (container) container.classList.add('slide-out-left')
                    
                    // Clear localStorage
                    try { 
                      localStorage.removeItem(`bf-tracking-${category.key}`)
                    } catch {}
                    
                    // Clear Supabase data for authenticated users
                    if (auth.email) {
                      await clearFunnelResponseForUser(auth.email, category.key)
                    }
                    
                    setTimeout(() => {
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

// Types are exported from src/utils/funnelQuestions.ts
