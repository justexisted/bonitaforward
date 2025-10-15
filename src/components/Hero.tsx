import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitText from './SplitText'

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

type Provider = {
  id: string
  name: string
  slug: string
  category_key: CategoryKey
  rating?: number | null
  tags?: string[] | null
  isMember?: boolean
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Container component for consistent layout spacing
 */
function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

/**
 * Get all providers from all categories as a flat array
 */
function getAllProviders(providersByCategory: Record<CategoryKey, Provider[]>): Provider[] {
  const keys: CategoryKey[] = ['real-estate', 'home-services', 'health-wellness', 'restaurants-cafes', 'professional-services']
  return keys.flatMap((k) => providersByCategory[k] || [])
}

// ============================================================================
// HERO COMPONENT
// ============================================================================

/**
 * Hero component - Main landing page hero section with search functionality
 * 
 * Features:
 * - Hero image with gradient overlay
 * - Animated text with SplitText component
 * - Real-time search with dropdown results
 * - Provider search with name and tag matching
 * - Featured provider prioritization
 * - Responsive design
 * 
 * @param providersByCategory - Global provider data organized by category
 * @param useProviderUpdates - Hook for listening to provider data updates
 */
interface HeroProps {
  providersByCategory: Record<CategoryKey, Provider[]>
  useProviderUpdates: (callback: () => void, deps: React.DependencyList) => void
}

export default function Hero({ providersByCategory, useProviderUpdates }: HeroProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<Provider[]>([])
  const [open, setOpen] = useState<boolean>(false)
  const [version, setVersion] = useState(0)

  // Listen for provider updates to trigger re-renders when data loads
  useProviderUpdates(() => { 
    console.log('[Hero] Provider update event received, incrementing version')
    setVersion((v: number) => v + 1) 
  }, [])

  // Debug: Log providers data on every render
  console.log('[Hero] Render - providersByCategory:', providersByCategory)
  const allProviders = getAllProviders(providersByCategory)
  console.log('[Hero] Render - Total providers:', allProviders.length)

  // Re-run search when providers data changes
  useEffect(() => {
    if (query.trim()) {
      recompute(query)
    }
  }, [providersByCategory, version])

  function recompute(q: string) {
    const text = q.trim().toLowerCase()
    console.log('[Hero] recompute called with:', text)
    if (!text) { setResults([]); return }
    const all = getAllProviders(providersByCategory)
    console.log('[Hero] Total providers for search:', all.length)
    
    // Debug: Show all restaurant providers and their tags
    // const restaurants = all.filter(p => p.category_key === 'restaurants-cafes')
    // console.log('[Search] Restaurant providers:', restaurants.map(p => ({ name: p.name, tags: p.tags })))
    
    const scored = all
      .map((p) => {
        const name = p.name.toLowerCase()
        const matchName = name.includes(text) ? 1 : 0
        const matchTag = (p.tags || []).some((t) => String(t).toLowerCase().includes(text)) ? 2 : 0
        const baseMatch = matchName + matchTag
        // Only give featured bonus if there's an actual match
        const featuredBonus = (baseMatch > 0 && p.isMember) ? 1.5 : 0
        const match = baseMatch + featuredBonus
        
        // Debug: Log any restaurant matches
        // if (p.category_key === 'restaurants-cafes' && (matchName > 0 || matchTag > 0)) {
        //   console.log('[Search] Restaurant match found:', { 
        //     name: p.name, 
        //     tags: p.tags, 
        //     matchName, 
        //     matchTag, 
        //     totalMatch: match 
        //   })
        // }
        
        return { p, match }
      })
      .filter((s) => s.match > 0)
      .sort((a, b) => b.match - a.match || (b.p.rating ?? 0) - (a.p.rating ?? 0) || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((s) => s.p)
    
    console.log('[Hero] Search results:', scored.length, 'matches')
    setResults(scored)
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '33vh', overflow: 'visible' }}>
      <img
        src="/images/bonita-cartoon-hero.jpeg"
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement
          img.onerror = null
          img.src = `https://picsum.photos/seed/landing-hero-fallback/1600/900`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/60 to-transparent" aria-hidden></div>
      <div className="relative" style={{ minHeight: '33vh', alignContent: 'center' }}>
        <Container>
          <div className="py-10 sm:py-12 text-center">
            <SplitText 
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white relative z-1 font-display" 
            text="Discover, Support, and Grow Local Bonita." 
            duration={0.1}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            />
            <p className="mt-3 text-neutral-100" style={{ position: 'relative', zIndex: 2 }}>
              Minimal, modern, and made for our community. Explore top categories and get connected.
            </p>
            <div className="mt-4 mx-auto max-w-md text-left" style={{ position: 'relative', zIndex: 2 }}>
              <div className="relative">
                <div className="flex items-center rounded-full bg-white border-2 border-blue-400 px-4 py-3 shadow-lg focus-within:border-blue-500 focus-within:shadow-xl transition-all duration-300 hover:border-blue-300 search-bar-shine">
                  <span className="mr-3 select-none text-lg">🔎</span>
                  <input
                    value={query}
                    onChange={(e) => { 
                      console.log('[Hero] Input onChange triggered:', e.target.value)
                      setQuery(e.target.value); 
                      setOpen(true); 
                      recompute(e.target.value) 
                    }}
                    onFocus={() => { if (results.length) setOpen(true) }}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    placeholder="Discover Bonita"
                    className="flex-1 outline-none text-base bg-transparent placeholder:text-neutral-400"
                  />
                </div>
                {open && results.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                    <ul className="max-h-64 overflow-auto">
                      {results.map((r) => (
                        <li key={r.id}>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setOpen(false); setQuery(''); navigate(`/provider/${encodeURIComponent(r.slug)}`) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between"
                          >
                            <span className="truncate mr-2">{r.name}</span>
                            <span className="text-[11px] text-neutral-500">{r.category_key.replace('-', ' ')}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {/* CTAs removed per request */}
          </div>
        </Container>
      </div>
    </section>
  )
}
