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
 * Persist funnel answers per user to Supabase (if tables exist)
 * Also tracks funnel attribution to the last viewed provider
 */
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }) {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return

  try {
    const { supabase } = await import('../lib/supabase')
    const { getLastViewedProvider, trackFunnelAttribution } = await import('../services/analyticsService')
    
    // Check if a record already exists for this user and category
    const { data: existing } = await supabase
      .from('funnel_responses')
      .select('id')
      .eq('user_email', email)
      .eq('category', category)
      .maybeSingle()

    let funnelResponseId: string | null = null
    let isNewResponse = false

    if (existing) {
      // Update existing record (don't track attribution again)
      await supabase
        .from('funnel_responses')
        .update({ answers })
        .eq('id', existing.id)
      
      funnelResponseId = existing.id
      isNewResponse = false
    } else {
      // Insert new record and get its ID
      const { data: inserted, error } = await supabase
        .from('funnel_responses')
        .insert({ user_email: email, category, answers })
        .select('id')
        .single()
      
      if (!error && inserted) {
        funnelResponseId = inserted.id
        isNewResponse = true
      }
    }

    // Track funnel attribution ONLY for NEW responses (prevents duplicate key violations)
    if (funnelResponseId && isNewResponse) {
      const lastViewedProviderId = getLastViewedProvider(30) // 30 minute attribution window
      
      if (lastViewedProviderId) {
        // Track attribution (failures are non-blocking)
        await trackFunnelAttribution(funnelResponseId, lastViewedProviderId, document.referrer)
      } else {
        // No recent provider view - track as direct funnel submission
        await trackFunnelAttribution(funnelResponseId, null, document.referrer)
      }
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

// Types are exported from src/utils/funnelQuestions.ts
