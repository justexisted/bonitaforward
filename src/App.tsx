import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { Building2, Home, HeartPulse, Utensils, Briefcase, ArrowRight, Menu, X } from 'lucide-react'
import SupabasePing from './components/SupabasePing'
import { supabase } from './lib/supabase'
import { fetchSheetRows, mapRowsToProviders, type SheetProvider } from './lib/sheets.ts'
import { fetchProvidersFromSupabase } from './lib/supabaseData.ts'
import SignInPage from './pages/SignIn'
import AccountPage from './pages/Account'
import { CommunityIndex, CommunityPost } from './pages/Community'
import AdminPage from './pages/Admin'
import OwnerPage from './pages/Owner'

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

const categories: {
  key: CategoryKey
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    key: 'real-estate',
    name: 'Real Estate',
    description: 'Agents, brokerages, and property managers helping Bonita residents move forward.',
    icon: Building2,
  },
  {
    key: 'home-services',
    name: 'Home Services',
    description: 'Landscaping, solar, cleaning, and remodeling by trusted local pros.',
    icon: Home,
  },
  {
    key: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Chiropractors, gyms, salons, and med spas to keep Bonita thriving.',
    icon: HeartPulse,
  },
  {
    key: 'restaurants-cafes',
    name: 'Restaurants & Cafés',
    description: 'Local dining spots and trending food experiences around Bonita.',
    icon: Utensils,
  },
  {
    key: 'professional-services',
    name: 'Professional Services',
    description: 'Attorneys, accountants, and consultants serving the community.',
    icon: Briefcase,
  },
]

function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

type AuthContextValue = {
  isAuthed: boolean
  name?: string
  email?: string
  userId?: string
  signInLocal: (data: { name?: string; email: string }) => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  resetPassword: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({ isAuthed: false, signInLocal: () => {}, signInWithGoogle: async () => {}, signInWithEmail: async () => ({}), signUpWithEmail: async () => ({}), resetPassword: async () => ({}), signOut: async () => {} })

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name?: string; email?: string; userId?: string } | null>(null)

  useEffect(() => {
    // Restore any local pseudo-auth (pre-supabase flow)
    try {
      const raw = localStorage.getItem('bf-auth')
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; email?: string }
        if (parsed?.email) setProfile({ name: parsed.name, email: parsed.email })
      }
    } catch {}

    // Sync with Supabase session
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      const name = (data.session?.user?.user_metadata as any)?.name
      const userId = data.session?.user?.id
      if (email) setProfile({ name, email, userId })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email
      const name = (session?.user?.user_metadata as any)?.name
      const userId = session?.user?.id
      if (email) setProfile({ name, email, userId })
      else setProfile((curr) => curr && curr.email ? null : curr)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const signInLocal = (data: { name?: string; email: string }) => {
    setProfile({ name: data.name, email: data.email })
    try { localStorage.setItem('bf-auth', JSON.stringify({ ...data, ts: Date.now() })) } catch {}
  }

  const signInWithGoogle = async () => {
    // Redirect back to the current page after Google OAuth to preserve funnel context
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
  }

  const signOut = async () => {
    try { await supabase.auth.signOut() } finally {
      setProfile(null)
      try { localStorage.removeItem('bf-auth') } catch {}
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/signin' })
    return { error: error?.message }
  }

  const value: AuthContextValue = {
    isAuthed: Boolean(profile?.email),
    name: profile?.name,
    email: profile?.email,
    userId: profile?.userId,
    signInLocal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

function Navbar() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isAdmin = !!auth.email && adminList.includes(auth.email.toLowerCase())
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-neutral-100">
      <Container className="flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/top-left-logo.png" alt="Bonita Forward" className="h-8 w-8 rounded" />
          <span className="font-semibold tracking-tight">Bonita Forward</span>
        </Link>
        <div className="flex items-center gap-2">
          <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl hover:bg-neutral-100">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <nav className="hidden sm:flex items-center gap-3 text-sm">
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/about">About</Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/business">📈 Have a Business?</Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/community">Community</Link>
            {auth.isAuthed && (
              <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/owner">My Business</Link>
            )}
            {auth.isAuthed && (
              <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/account">Account</Link>
            )}
            {isAdmin && (
              <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/admin">Admin</Link>
            )}
            {!auth.isAuthed ? (
              <div className="flex items-center gap-2">
                <Link to="/signin" className="rounded-full bg-neutral-900 text-white px-3 py-1.5">Sign In</Link>
                <button onClick={auth.signInWithGoogle} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200">Google</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-neutral-600 hidden sm:inline">{auth.email}</span>
                <button onClick={auth.signOut} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200">Sign out</button>
              </div>
            )}
          </nav>
        </div>
      </Container>
      {/* Mobile sheet */}
      {open && (
        <div className="sm:hidden border-t border-neutral-100 bg-white">
          <Container className="py-3 text-sm">
            <div className="flex flex-col gap-2">
              <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100" to="/about">About</Link>
              <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100" to="/business">📈 Have a Business?</Link>
              <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100" to="/community">Community</Link>
              {auth.isAuthed && (
                <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100 text-center" to="/owner">My Business</Link>
              )}
              {auth.isAuthed && (
                <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100 text-center" to="/account">Account</Link>
              )}
              {isAdmin && (
                <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100 text-center" to="/admin">Admin</Link>
              )}
              {!auth.isAuthed ? (
                <>
                  <Link onClick={() => setOpen(false)} to="/signin" className="rounded-full bg-neutral-900 text-white px-3 py-2 text-center">Sign In</Link>
                  <button onClick={() => { setOpen(false); auth.signInWithGoogle() }} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-2 hover:bg-neutral-200 text-center">Continue with Google</button>
                </>
              ) : (
                <button onClick={() => { setOpen(false); auth.signOut() }} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-2 hover:bg-neutral-200 text-center">Sign out</button>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-100">
      <Container className="py-8 text-xs text-neutral-500">
        <div className="flex items-center justify-between">
          <div>© {new Date().getFullYear()} Bonita Forward — Community powered, locally focused.</div>
          <div className="flex items-center gap-3">
            <Link to="/business" className="text-neutral-700 hover:text-neutral-900">📈 Have a Business?</Link>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Terms</a>
            <a href="/contact" className="text-neutral-700 hover:text-neutral-900">Contact</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="tel:+16197075351" className="text-neutral-700 hover:text-neutral-900">(619) 707-5351</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="mailto:bonitaforward@gmail.com" className="text-neutral-700 hover:text-neutral-900">bonitaforward@gmail.com</a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <SupabasePing />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Hero() {
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<Provider[]>([])
  const [open, setOpen] = useState<boolean>(false)

  function getAllProviders(): Provider[] {
    const keys: CategoryKey[] = ['real-estate','home-services','health-wellness','restaurants-cafes','professional-services']
    return keys.flatMap((k) => providersByCategory[k] || [])
  }

  function recompute(q: string) {
    const text = q.trim().toLowerCase()
    if (!text) { setResults([]); return }
    const all = getAllProviders()
    const scored = all
      .map((p) => {
        const name = p.name.toLowerCase()
        const matchName = name.includes(text) ? 2 : 0
        const matchTag = (p.tags || []).some((t) => String(t).toLowerCase().includes(text)) ? 1 : 0
        const match = matchName + matchTag + (p.isMember ? 0.5 : 0)
        return { p, match }
      })
      .filter((s) => s.match > 0)
      .sort((a, b) => b.match - a.match || (b.p.rating ?? 0) - (a.p.rating ?? 0) || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((s) => s.p)
    setResults(scored)
  }

  useEffect(() => {
    function onUpdate() { if (query) recompute(query) }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, [query])

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
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-neutral-900/20 to-transparent" aria-hidden></div>
      <div className="relative" style={{ minHeight: '33vh', alignContent: 'center' }}>
      <div className="gradient-overlay"></div>
        <Container>
          <div className="py-10 sm:py-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white" style={{ position: 'relative', zIndex: 2 }}>
              Discover, Support, and Grow Local Bonita Businesses.
            </h1>
            <p className="mt-3 text-neutral-100" style={{ position: 'relative', zIndex: 2 }}>
              Minimal, modern, and made for our community. Explore top categories and get connected.
            </p>
            <div className="mt-4 mx-auto max-w-md text-left" style={{ position: 'relative', zIndex: 2 }}>
              <div className="relative">
                <div className="flex items-center rounded-full bg-white border border-neutral-200 px-3 py-2 shadow-sm">
                  <span className="mr-2 select-none">🔎</span>
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); recompute(e.target.value) }}
                    onFocus={() => { if (results.length) setOpen(true) }}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    placeholder="Discover Bonita"
                    className="flex-1 outline-none text-sm bg-transparent placeholder:text-neutral-400"
                  />
                </div>
                {open && results.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                    <ul className="max-h-64 overflow-auto">
                      {results.map((r) => (
                        <li key={r.id}>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setOpen(false); setQuery(''); navigate(`/provider/${encodeURIComponent(r.id)}`) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between"
                          >
                            <span className="truncate mr-2">{r.name}</span>
                            <span className="text-[11px] text-neutral-500">{r.category.replace('-', ' ')}</span>
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

function ProviderPage() {
  const params = useParams()
  const providerId = params.id as string
  const all: Provider[] = (['real-estate','home-services','health-wellness','restaurants-cafes','professional-services'] as CategoryKey[])
    .flatMap((k) => providersByCategory[k] || [])
  const provider = all.find((p) => p.id === providerId)
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          {!provider ? (
            <div className="text-sm text-neutral-600">Provider not found.</div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
              <div className="mt-1 text-sm text-neutral-500">Category: {provider.category}</div>
              <div className="mt-4 text-sm text-neutral-700">Dedicated provider page — details coming soon.</div>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

function CategoryCard({ cat }: { cat: typeof categories[number] }) {
  const emojiMap: Record<CategoryKey, string> = {
    'real-estate': '🏠',
    'home-services': '🛠️',
    'health-wellness': '🧘',
    'restaurants-cafes': '🍽️',
    'professional-services': '💼',
  }
  return (
    <Link to={`/category/${cat.key}`} className="block rounded-2xl bg-white p-4 elevate">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-50 text-xl">
          <span aria-hidden>{emojiMap[cat.key]}</span>
        </span>
      <div>
          <div className="font-medium text-neutral-900">{cat.name}</div>
          <div className="text-sm text-neutral-600">{cat.description}</div>
      </div>
        <ArrowRight className="ml-auto h-4 w-4 text-neutral-400" />
      </div>
    </Link>
  )
}

function CommunitySection() {
  const cards = [
    { category: 'restaurants-cafes', title: 'Top 5 Restaurants This Month', excerpt: 'Discover trending dining spots loved by Bonita locals.' },
    { category: 'home-services', title: 'Bonita Home Service Deals', excerpt: 'Seasonal offers from trusted local pros.' },
    { category: 'health-wellness', title: 'Wellness Spotlight', excerpt: 'Chiropractors, gyms, and med spas to try now.' },
    { category: 'real-estate', title: 'Property Opportunities in Bonita', excerpt: 'Latest properties and market highlights.' },
    { category: 'professional-services', title: 'Top Professional Services of Bonita', excerpt: 'Standout legal, accounting, and consulting pros.' },
  ]
  return (
    <section className="py-8">
      <Container>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Community</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => {
            const bgMap: Record<string, string> = {
              'restaurants-cafes': "https://picsum.photos/seed/restaurants-cafes/800/400",
              'home-services': "https://picsum.photos/seed/home-services/800/400",
              'health-wellness': "https://picsum.photos/seed/health-wellness/800/400",
              'real-estate': "https://picsum.photos/seed/real-estate/800/400",
              'professional-services': "https://picsum.photos/seed/professional-services/800/400",
            }
            const bg = bgMap[c.category as CategoryKey]
            return (
              <Link key={c.title} to={`/community/${c.category}`} className="relative rounded-2xl overflow-hidden block hover:shadow-sm border border-white/40">
                <img
                  src={bg}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.onerror = null
                    img.src = `https://picsum.photos/seed/${c.category}-fallback/800/400`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-neutral-900/20 to-transparent" aria-hidden></div>
                <div className="relative z-10 p-4 min-h-[160px] flex flex-col justify-between">
                  <div>
                    <div className="font-medium text-white">{c.title}</div>
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
  return (
    <>
      <Hero />
      <section id="categories" className="py-2">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.slice(0, 4).map((c) => (
              <CategoryCard cat={c} key={c.key} />
            ))}
            <details className="rounded-2xl p-4 bg-white elevate">
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
      <CommunitySection />
    </>
  )
}

// Removed old LeadForm in favor of the new 4-step Funnel

type FunnelOption = {
  id: string
  label: string
}

type FunnelQuestion = {
  id: string
  prompt: string
  options: FunnelOption[]
}

const funnelConfig: Record<CategoryKey, FunnelQuestion[]> = {
  'real-estate': [
    // real-estate is built dynamically via getFunnelQuestions; this serves as a fallback
    { id: 'need', prompt: 'What do you need help with?', options: [ { id: 'buy', label: 'Buying' }, { id: 'sell', label: 'Selling' }, { id: 'rent', label: 'Renting' } ] },
    { id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] },
    { id: 'budget', prompt: 'Approximate budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] },
    { id: 'beds', prompt: 'Bedrooms', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4', label: '4+' } ] },
  ],
  'home-services': [
    {
      id: 'service',
      prompt: 'Which service do you need?',
      options: [
        { id: 'landscaping', label: 'Landscaping' },
        { id: 'solar', label: 'Solar' },
        { id: 'cleaning', label: 'Cleaning' },
        { id: 'remodeling', label: 'Remodeling' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How soon do you need it?',
      options: [
        { id: 'asap', label: 'ASAP' },
        { id: 'this-month', label: 'This month' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'property',
      prompt: 'Property type?',
      options: [
        { id: 'house', label: 'House' },
        { id: 'condo', label: 'Condo' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget range?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
  ],
  'health-wellness': [
    {
      id: 'type',
      prompt: 'What are you looking for?',
      options: [
        { id: 'chiro', label: 'Chiropractor' },
        { id: 'gym', label: 'Gym' },
        { id: 'salon', label: 'Salon' },
        { id: 'medspa', label: 'Med Spa' },
      ],
    },
    {
      id: 'goal',
      prompt: 'Your primary goal?',
      options: [
        { id: 'relief', label: 'Pain relief' },
        { id: 'fitness', label: 'Fitness' },
        { id: 'beauty', label: 'Beauty' },
      ],
    },
    {
      id: 'when',
      prompt: 'When would you start?',
      options: [
        { id: 'this-week', label: 'This week' },
        { id: 'this-month', label: 'This month' },
        { id: 'later', label: 'Later' },
      ],
    },
    {
      id: 'membership',
      prompt: 'Membership or one-off?',
      options: [
        { id: 'membership', label: 'Membership' },
        { id: 'one-off', label: 'One‑off' },
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
        { id: 'casual', label: 'Casual' },
        { id: 'date', label: 'Date' },
        { id: 'family', label: 'Family' },
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
      prompt: 'Which service?',
      options: [
        { id: 'attorney', label: 'Attorney' },
        { id: 'accountant', label: 'Accountant' },
        { id: 'consultant', label: 'Consultant' },
      ],
    },
    {
      id: 'need',
      prompt: 'What do you need?',
      options: [
        { id: 'advice', label: 'Advice' },
        { id: 'ongoing', label: 'Ongoing help' },
        { id: 'project', label: 'Project‑based' },
      ],
    },
    {
      id: 'timeline',
      prompt: 'Timeline?',
      options: [
        { id: 'now', label: 'Now' },
        { id: 'soon', label: 'Soon' },
        { id: 'flex', label: 'Flexible' },
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

type Provider = {
  id: string
  name: string
  category: CategoryKey
  tags: string[]
  rating?: number
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
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

function isFeaturedProvider(p: Provider): boolean {
  if (p.isMember) return true
  const tags = (p.tags || []).map((t) => String(t).trim().toLowerCase())
  return tags.includes('featured') || tags.includes('member') || tags.includes('paid')
}

function getProviderDetails(p: Provider): ProviderDetails {
  // Placeholder details; in production, fetch from DB/API
  const seed = encodeURIComponent(p.id)
  return {
    phone: p.phone || undefined,
    email: p.email || undefined,
    website: p.website || undefined,
    address: p.address || undefined,
    images: [
      `https://picsum.photos/seed/${seed}-1/400/240`,
      `https://picsum.photos/seed/${seed}-2/400/240`,
    ],
    reviews: [
      { author: 'Local Resident', rating: (p.rating ?? 4.6), text: 'Great experience, highly recommend.' },
      { author: 'Bonita Neighbor', rating: (p.rating ?? 4.5) - 0.2, text: 'Friendly and professional.' },
    ],
    posts: [
      { id: p.id + '-post1', title: `Spotlight: ${p.name}` },
      { id: p.id + '-post2', title: `${p.name} in the Community` },
    ],
  }
}

let providersByCategory: Record<CategoryKey, Provider[]> = {
  'real-estate': [
    { id: 're-1', name: 'Bonita Realty Group', category: 'real-estate', tags: ['buy', '0-3', 'entry', '2', '3'], rating: 4.9, isMember: true },
    { id: 're-2', name: 'South Bay Homes', category: 'real-estate', tags: ['buy', '3-6', 'mid', '3', '4+'], rating: 4.8, isMember: true },
    { id: 're-3', name: 'Vista Property Pros', category: 'real-estate', tags: ['sell', 'now', '750-1200', '3', '4+'], rating: 4.7, isMember: true },
    { id: 're-4', name: 'Bonita Rentals Co', category: 'real-estate', tags: ['rent', 'this-month', 'low', '1', '2'], rating: 4.6 },
    { id: 're-5', name: 'Canyon Estates', category: 'real-estate', tags: ['sell', '60+', '1200+', '4+'], rating: 4.6 },
    { id: 're-6', name: 'Coastal Keys', category: 'real-estate', tags: ['buy', '6+', 'high', '4+'], rating: 4.5 },
  ],
  'home-services': [
    { id: 'hs-1', name: 'GreenLeaf Landscaping', category: 'home-services', tags: ['landscaping', 'asap', 'house', 'low'], rating: 4.9, isMember: true },
    { id: 'hs-2', name: 'SunBright Solar', category: 'home-services', tags: ['solar', 'this-month', 'house', 'high'], rating: 4.8, isMember: true },
    { id: 'hs-3', name: 'Sparkle Clean', category: 'home-services', tags: ['cleaning', 'asap', 'condo', 'low'], rating: 4.7, isMember: true },
    { id: 'hs-4', name: 'Bonita Remodel Co', category: 'home-services', tags: ['remodeling', 'flexible', 'house', 'med'], rating: 4.7 },
    { id: 'hs-5', name: 'CondoCare Pros', category: 'home-services', tags: ['cleaning', 'this-month', 'condo', 'med'], rating: 4.6 },
    { id: 'hs-6', name: 'YardWorks', category: 'home-services', tags: ['landscaping', 'flexible', 'house', 'med'], rating: 4.5 },
  ],
  'health-wellness': [
    { id: 'hw-1', name: 'Bonita Chiro Clinic', category: 'health-wellness', tags: ['chiro', 'relief', 'this-week', 'one-off'], rating: 4.9, isMember: true },
    { id: 'hw-2', name: 'Peak Fitness Gym', category: 'health-wellness', tags: ['gym', 'fitness', 'this-month', 'membership'], rating: 4.8, isMember: true },
    { id: 'hw-3', name: 'Glow Salon', category: 'health-wellness', tags: ['salon', 'beauty', 'this-week', 'one-off'], rating: 4.7, isMember: true },
    { id: 'hw-4', name: 'Serene Med Spa', category: 'health-wellness', tags: ['medspa', 'beauty', 'later', 'one-off'], rating: 4.7 },
    { id: 'hw-5', name: 'Core Strength Club', category: 'health-wellness', tags: ['gym', 'fitness', 'later', 'membership'], rating: 4.6 },
    { id: 'hw-6', name: 'Align & Thrive', category: 'health-wellness', tags: ['chiro', 'relief', 'this-month', 'one-off'], rating: 4.6 },
  ],
  'restaurants-cafes': [
    { id: 'rc-1', name: 'Casa Bonita', category: 'restaurants-cafes', tags: ['mexican', 'casual', 'low', 'dine'], rating: 4.8, isMember: true },
    { id: 'rc-2', name: 'Bamboo Grove', category: 'restaurants-cafes', tags: ['asian', 'date', 'med', 'dine'], rating: 4.7, isMember: true },
    { id: 'rc-3', name: 'Bluebird Café', category: 'restaurants-cafes', tags: ['cafes', 'casual', 'low', 'takeout'], rating: 4.7, isMember: true },
    { id: 'rc-4', name: 'Bonita Grill', category: 'restaurants-cafes', tags: ['american', 'family', 'med', 'dine'], rating: 4.6 },
    { id: 'rc-5', name: 'Salsa Verde', category: 'restaurants-cafes', tags: ['mexican', 'family', 'med', 'dine'], rating: 4.6 },
    { id: 'rc-6', name: 'Noodle Haus', category: 'restaurants-cafes', tags: ['asian', 'casual', 'low', 'takeout'], rating: 4.5 },
  ],
  'professional-services': [
    { id: 'ps-1', name: 'Bonita Legal', category: 'professional-services', tags: ['attorney', 'advice', 'now', 'med'], rating: 4.9, isMember: true },
    { id: 'ps-2', name: 'Summit Accounting', category: 'professional-services', tags: ['accountant', 'ongoing', 'soon', 'low'], rating: 4.8, isMember: true },
    { id: 'ps-3', name: 'Citrus Consulting', category: 'professional-services', tags: ['consultant', 'project', 'flex', 'high'], rating: 4.7, isMember: true },
    { id: 'ps-4', name: 'South Bay Counsel', category: 'professional-services', tags: ['attorney', 'project', 'now', 'high'], rating: 4.7 },
    { id: 'ps-5', name: 'Ledger Pros', category: 'professional-services', tags: ['accountant', 'advice', 'soon', 'med'], rating: 4.6 },
    { id: 'ps-6', name: 'Coastline Strategy', category: 'professional-services', tags: ['consultant', 'ongoing', 'flex', 'high'], rating: 4.5 },
  ],
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
      const cat = (sp.category as CategoryKey)
      if (grouped[cat]) {
        grouped[cat].push({ id: sp.id, name: sp.name, category: cat, tags: sp.tags.length ? sp.tags : (sp.details.badges || []), rating: sp.rating })
      }
    })
    providersByCategory = ensureDemoMembers(grouped)
    console.log('[Sheets] Providers loaded from Google Sheets', grouped)
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
}

async function loadProvidersFromSupabase(): Promise<boolean> {
  const rows = await fetchProvidersFromSupabase()
  if (!rows || rows.length === 0) return false
  const previous = providersByCategory
  const grouped: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  }
  function coerceIsMember(r: any): boolean {
    const raw = (
      r.is_member ?? r.member ?? r.isMember ?? r.is_featured ?? r.featured ??
      r.paid ?? r.plan ?? r.tier
    )
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw > 0
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase()
      if (['true','t','yes','y','1','paid','pro','premium','featured','member'].includes(v)) return true
    }
    // Also allow tag/badge-based hints — combine arrays to avoid empty-tags truthiness issues
    const combined: string[] = [
      ...(((r.tags as string[] | null) || []) as string[]),
      ...(((r.badges as string[] | null) || []) as string[]),
    ]
    if (combined.length) {
      const set = new Set(combined.map((s) => String(s).trim().toLowerCase()))
      if (set.has('featured') || set.has('member') || set.has('paid')) return true
    }
    return false
  }

  rows.forEach((r) => {
    const key = (r.category_key as CategoryKey)
    if (!grouped[key]) return
    // Combine tags and badges to preserve featured/member flags
    const combinedTags = Array.from(new Set([...
      (((r.tags as string[] | null) || []) as string[]),
      (((r.badges as string[] | null) || []) as string[]),
    ].flat().map((s) => String(s).trim()).filter(Boolean)))

    grouped[key].push({
      id: r.id,
      name: r.name,
      category: key,
      tags: combinedTags,
      rating: r.rating ?? undefined,
      phone: r.phone ?? null,
      email: r.email ?? null,
      website: r.website ?? null,
      address: r.address ?? null,
      isMember: coerceIsMember(r),
    })
  })
  // Fallback: if a category has zero members flagged from Supabase, promote the first three
  ;(Object.keys(grouped) as CategoryKey[]).forEach((ck: CategoryKey) => {
    const list = grouped[ck]
    // If Supabase returned nothing for this category, keep previous providers
    if (list.length === 0 && previous?.[ck]?.length) {
      grouped[ck] = previous[ck]
      return
    }
    if (list.length > 0 && !list.some((p) => Boolean(p.isMember))) {
      grouped[ck] = list.map((p, idx) => ({ ...p, isMember: idx < 3 }))
    }
  })
  providersByCategory = grouped
  console.log('[Supabase] Providers loaded', grouped)
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
  return true
}

function scoreProviders(category: CategoryKey, answers: Record<string, string>): Provider[] {
  const providers = providersByCategory[category] || []
  if (category === 'health-wellness') {
    const values = new Set<string>(Object.values(answers))
    const type = answers['type']
    const goal = answers['goal'] || answers['salon_kind']
    const when = answers['when']
    const payment = answers['payment']
    return providers
      .map((p) => {
        let score = 0
        if (type && p.tags.includes(type)) score += 2
        if (goal && p.tags.includes(goal)) score += 2
        if (when && p.tags.includes(when)) score += 1
        if (payment && p.tags.includes(payment)) score += 1
        p.tags.forEach((t) => { if (values.has(t)) score += 0 })
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first
        const am = isFeaturedProvider(a.p) ? 1 : 0
        const bm = isFeaturedProvider(b.p) ? 1 : 0
        if (bm !== am) return bm - am
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
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
        // Featured providers first
        const am = isFeaturedProvider(a.p) ? 1 : 0
        const bm = isFeaturedProvider(b.p) ? 1 : 0
        if (bm !== am) return bm - am
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
  }
  const values = new Set<string>(Object.values(answers))
  const withScores = providers.map((p) => {
    const matches = p.tags.reduce((acc, t) => acc + (values.has(t) ? 1 : 0), 0)
    return { p, score: matches }
  })
  withScores.sort((a, b) => {
    // Featured providers first
    const am = isFeaturedProvider(a.p) ? 1 : 0
    const bm = isFeaturedProvider(b.p) ? 1 : 0
    if (bm !== am) return bm - am
    if (b.score !== a.score) return b.score - a.score
    const ar = a.p.rating ?? 0
    const br = b.p.rating ?? 0
    if (br !== ar) return br - ar
    return a.p.name.localeCompare(b.p.name)
  })
  return withScores.map((s) => s.p)
}

// Persist funnel answers per user to Supabase (if tables exist)
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }) {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return
  try {
    await supabase
      .from('funnel_responses')
      .upsert(
        [
          {
            user_email: email,
            category,
            answers,
          },
        ],
        { onConflict: 'user_email,category' }
      )
  } catch (err) {
    // Silently ignore if table isn't created yet
    console.warn('[Supabase] upsert funnel_responses failed (safe to ignore if table missing)', err)
  }
}

// Create a booking row (if table exists)
async function createBookingRow(params: { email?: string | null; category: CategoryKey; name?: string; notes?: string; answers?: Record<string, string> }) {
  const { email, category, name, notes, answers } = params
  if (!email) return
  try {
    await supabase
      .from('bookings')
      .insert([
        {
          user_email: email,
          category,
          name: name || null,
          notes: notes || null,
          answers: answers || null,
          status: 'new',
        },
      ])
  } catch (err) {
    console.warn('[Supabase] insert bookings failed (safe to ignore if table missing)', err)
  }
}

// Track a business owner application
async function createBusinessApplication(params: { full_name?: string; business_name?: string; email?: string; phone?: string; category?: string; challenge?: string }) {
  console.log('[BusinessApp] submitting application', params)
  try {
    const { data, error } = await supabase
      .from('business_applications')
      .insert([
        {
          full_name: params.full_name || null,
          business_name: params.business_name || null,
          email: params.email || null,
          phone: params.phone || null,
          category: params.category || null,
          challenge: params.challenge || null,
        },
      ])
      .select('*')
    if (error) {
      console.error('[BusinessApp] insert error', error)
    } else {
      console.log('[BusinessApp] insert success', data)
    }
    return { data, error }
  } catch (err) {
    console.error('[BusinessApp] unexpected failure', err)
    return { data: null, error: err as any }
  }
}

// (Kept for backward compatibility with older forms)
// Removed unused createContactLead implementation after migrating contact to general user form

function getFunnelQuestions(categoryKey: CategoryKey, answers: Record<string, string>): FunnelQuestion[] {
  if (categoryKey === 'health-wellness') {
    const type = answers['type']
    const list: FunnelQuestion[] = []
    // Q1: Service type
    list.push({
      id: 'type',
      prompt: 'What are you looking for?',
      options: [
        { id: 'chiro', label: 'Chiropractor' },
        { id: 'physical-therapy', label: 'Physical Therapy' },
        { id: 'gym', label: 'Gym' },
        { id: 'pilates-yoga', label: 'Pilates/Yoga' },
        { id: 'salon', label: 'Salon' },
        { id: 'medspa', label: 'Med Spa' },
        { id: 'general-healthcare', label: 'General Healthcare' },
        { id: 'naturopathic', label: 'Naturopathic' },
        { id: 'dental', label: 'Dental' },
        { id: 'mental-health', label: 'Mental Health' },
      ],
    })

    if (!type) return list.slice(0, 1)

    // Q2: Specialized goal/need by type
    if (type === 'salon') {
      list.push({ id: 'salon_kind', prompt: 'Salon service?', options: [ { id: 'salon-hair', label: 'Hair' }, { id: 'salon-nail', label: 'Nail' }, { id: 'salon-other', label: 'Other' } ] })
    } else if (type === 'chiro') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'relief', label: 'Pain relief' }, { id: 'mobility', label: 'Mobility' }, { id: 'injury', label: 'Injury recovery' } ] })
    } else if (type === 'physical-therapy') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'rehab', label: 'Rehab' }, { id: 'performance', label: 'Performance' }, { id: 'post-surgery', label: 'Post‑surgery' } ] })
    } else if (type === 'gym' || type === 'pilates-yoga') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'fitness', label: 'Fitness' }, { id: 'strength', label: 'Strength' }, { id: 'classes', label: 'Classes' } ] })
    } else if (type === 'medspa') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'beauty', label: 'Beauty' }, { id: 'wellness', label: 'Wellness' } ] })
    } else if (type === 'general-healthcare' || type === 'naturopathic') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'wellness', label: 'Wellness' }, { id: 'general', label: 'General health' } ] })
    } else if (type === 'dental') {
      list.push({ id: 'goal', prompt: 'Dental need?', options: [ { id: 'cleaning', label: 'Cleaning' }, { id: 'emergency', label: 'Emergency' }, { id: 'ortho', label: 'Ortho' } ] })
    } else if (type === 'mental-health') {
      list.push({ id: 'goal', prompt: 'Support needed?', options: [ { id: 'therapy', label: 'Therapy' }, { id: 'counseling', label: 'Counseling' } ] })
    }

    // Q3: Urgency (generic, phrased naturally)
    list.push({ id: 'when', prompt: 'When would you like to start?', options: [ { id: 'this-week', label: 'This week' }, { id: 'this-month', label: 'This month' }, { id: 'later', label: 'Later' } ] })

    // Q4: Payment model only for gym/pilates (others default one‑off)
    if (type === 'gym' || type === 'pilates-yoga') {
      list.push({ id: 'payment', prompt: 'Payment preference?', options: [ { id: 'membership', label: 'Membership' }, { id: 'one-off', label: 'One‑off' } ] })
    }

    return list.slice(0, 4)
  }
  if (categoryKey === 'real-estate') {
    const need = answers['need']
    const propertyType = answers['property_type']
    const isResidential = (pt?: string) => ['single-family','condo-townhome','apartment-multifamily'].includes(pt || '')
    const isLandOrCommercial = (pt?: string) => ['land','office','retail','industrial-warehouse'].includes(pt || '')

    const list: FunnelQuestion[] = []

    // Q1: Need
    list.push({
      id: 'need',
      prompt: 'What do you need help with?',
      options: [
        { id: 'buy', label: 'Buying' },
        { id: 'sell', label: 'Selling' },
        { id: 'rent', label: 'Renting' },
      ],
    })

    // Q2: Property type (works for buy/sell/rent and drives conditionals)
    list.push({
      id: 'property_type',
      prompt: 'Property type?',
      options: [
        { id: 'single-family', label: 'Single‑Family' },
        { id: 'condo-townhome', label: 'Condo/Townhome' },
        { id: 'apartment-multifamily', label: 'Apartment/Multifamily' },
        { id: 'land', label: 'Land' },
        { id: 'office', label: 'Office' },
        { id: 'retail', label: 'Retail' },
        { id: 'industrial-warehouse', label: 'Industrial/Warehouse' },
      ],
    })

    if (need === 'sell') {
      // Q3: Staging toggle for sellers (relevant to presentation)
      list.push({
        id: 'staging',
        prompt: 'Interested in home staging?',
        options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ],
      })
      // Q4: Residential → Bedrooms; Land/Commercial → Listing timeline
      if (isResidential(propertyType)) {
        list.push({ id: 'beds', prompt: 'Bedrooms in your property?', options: [ { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4+', label: '4+' } ] })
      } else {
        list.push({ id: 'timeline', prompt: 'When are you planning to list?', options: [ { id: 'now', label: 'Now' }, { id: '30-60', label: '30–60 days' }, { id: '60+', label: '60+ days' } ] })
      }
      return list.slice(0, 4)
    }

    if (need === 'rent') {
      // Q3: Monthly budget for rentals
      list.push({ id: 'budget', prompt: 'Monthly budget?', options: [ { id: 'low', label: '$' }, { id: 'med', label: '$$' }, { id: 'high', label: '$$$' } ] })
      // Q4: Residential → Bedrooms; Land/Commercial → Move timeline
      if (isResidential(propertyType)) {
        list.push({ id: 'beds', prompt: 'Bedrooms needed?', options: [ { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3+', label: '3+' } ] })
      } else {
        list.push({ id: 'move_when', prompt: 'When do you plan to start?', options: [ { id: 'this-week', label: 'This week' }, { id: 'this-month', label: 'This month' }, { id: 'later', label: 'Later' } ] })
      }
      return list.slice(0, 4)
    }

    // Default BUY flow
    // Q3: Purchase budget
    list.push({ id: 'budget', prompt: 'Purchase budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] })
    // Q4: Residential → Bedrooms; Land/Commercial → Timeline
    if (isResidential(propertyType)) {
      list.push({ id: 'beds', prompt: 'Bedrooms needed?', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4+', label: '4+' } ] })
    } else if (isLandOrCommercial(propertyType)) {
      list.push({ id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
    } else {
      list.push({ id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
    }
    return list.slice(0, 4)
  }
  // other categories use static config above
  return funnelConfig[categoryKey].slice(0, 4)
}

function trackChoice(category: CategoryKey, questionId: string, optionId: string) {
  try {
    const key = `bf-tracking-${category}`
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    existing[questionId] = optionId
    localStorage.setItem(key, JSON.stringify(existing))
    // Optionally POST to backend when available
    // void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, questionId, optionId, ts: Date.now() }) })
  } catch {}
}

function Funnel({ category }: { category: typeof categories[number] }) {
  const [step, setStep] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [anim, setAnim] = useState<'in' | 'out'>('in')
  const questions = useMemo(() => getFunnelQuestions(category.key, answers), [category.key, answers])
  const current = questions[step]
  const auth = useAuth()
  const initializedRef = useRef(false)
  const navigate = useNavigate()

  // On mount, hydrate answers from localStorage so users never re-enter
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    try {
      const key = `bf-tracking-${category.key}`
      const existing = JSON.parse(localStorage.getItem(key) || '{}')
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
                    if (!auth.isAuthed) {
                      e.preventDefault()
                      const card = (e.currentTarget.closest('section') as HTMLElement) || document.body
                      card.classList.add('slide-out-right')
                      setTimeout(() => {
                        navigate('/signin', { state: { from: `/book?category=${category.key}` } })
                      }, 160)
                      return
                    }
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

function CategoryPage() {
  const path = window.location.pathname.split('/').pop() as CategoryKey
  const category = categories.find((c) => c.key === path)
  if (!category) return <Container className="py-10">Category not found.</Container>
  const Icon = category.icon
  const [, setVersion] = useState(0)
  
  useEffect(() => {
    function onUpdate() { setVersion((v: number) => v + 1) }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, [])
  
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-50">
              <Icon className="h-5 w-5 text-neutral-700" />
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{category.name}</h2>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="mt-4">
                <div className="rounded-xl p-3">
                  <div className="text-lg font-medium mb-2 text-center">{`Let's find the best match for you in ${category.name}`}</div>
                  <Funnel category={category} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

function AboutPage() {
  return (
    <section className="py-8">
      <Container>
        <div className="prose max-w-none">
          <h2 className="text-2xl font-semibold tracking-tight">About Bonita Forward</h2>
          <p className="text-neutral-600">We promote and highlight the best businesses in San Diego's Bonita community, encouraging residents to stay local and support local.</p>
          <p className="text-neutral-600">This site acts as a bridge into lead funnels so businesses gain exposure and customers while the community gets quality, trusted recommendations.</p>
        </div>
      </Container>
    </section>
  )
}

function ContactPage() {
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate max-w-xl mx-auto">
          <h2 className="text-xl font-semibold tracking-tight">Contact Bonita Forward</h2>
          <p className="mt-1 text-neutral-600">Have a question or feedback? Reach us at <a href="mailto:bonitaforward@gmail.com" className="underline">bonitaforward@gmail.com</a> or call <a href="tel:+16197075351" className="underline">(619) 707-5351</a>.</p>
          <form
            className="mt-4 grid grid-cols-1 gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const name = (form.elements.namedItem('name') as HTMLInputElement)?.value
              const email = (form.elements.namedItem('email') as HTMLInputElement)?.value
              const subject = (form.elements.namedItem('subject') as HTMLInputElement)?.value
              const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value
              try { localStorage.setItem('bf-user-contact', JSON.stringify({ name, email, subject, message, ts: Date.now() })) } catch {}
              form.reset()
              window.location.assign('/thank-you')
            }}
          >
            <div>
              <label className="block text-sm text-neutral-600">Full Name</label>
              <input name="name" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Subject</label>
              <input name="subject" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="How can we help?" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Message</label>
              <textarea name="message" rows={5} required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Write your message here" />
            </div>
            <div className="text-xs text-neutral-500">By submitting, you agree to our <a className="underline" href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a> and <a className="underline" href="/terms.html" target="_blank" rel="noreferrer">Terms</a>.</div>
            <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Send Message</button>
          </form>
        </div>
      </Container>
    </section>
  )
}

function BusinessPage() {
  // simple ROI calculator state is kept local via uncontrolled inputs and live compute
  useEffect(() => {
    // If user arrived with #apply or prefill params, scroll to and focus form
    const hasPrefill = new URLSearchParams(window.location.search).toString().length > 0
    if (window.location.hash === '#apply' || hasPrefill) {
      setTimeout(() => {
        const el = document.getElementById('apply')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const inputs = el?.querySelectorAll('input')
        ;(inputs && inputs[1] as HTMLInputElement | undefined)?.focus() // Business Name field
      }, 50)
    }
  }, [])
  return (
    <section className="py-8">
      <Container>
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">Grow Your Bonita Business With Local Leads</h1>
          <p className="mt-3 text-neutral-600">Bonita Forward helps you reach thousands of Bonita residents and turns them into paying customers.</p>
          <a href="#apply" className="inline-block mt-5 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Featured</a>
          <div>
            <a href="#how" className="mt-2 inline-block text-sm text-neutral-700 hover:text-neutral-900">See How It Works ↓</a>
          </div>
        </div>

        <div id="how" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Step 1: Exposure', text: 'Your business gets featured on Bonita Forward — the local hub residents already trust.' },
            { title: 'Step 2: Customers Find You', text: 'We ask Bonita residents what they want.' },
            { title: 'Step 3: Growth', text: 'You receive customers weekly — no more chasing, just closing.' },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
              <div className="font-medium select-none cursor-default">{s.title}</div>
              <div className="text-sm text-neutral-600 mt-1">{s.text}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade">
          <h2 className="text-xl font-semibold tracking-tight">What's a New Customer Worth to You?</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm text-neutral-600">Avg. Sale Value ($)</label>
              <input id="avg" type="number" defaultValue={250} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Monthly New Customers Goal</label>
              <input id="goal" type="number" defaultValue={5} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" />
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50">
              <div className="text-sm text-neutral-600">Estimated Monthly Value</div>
              <div id="roi" className="text-lg font-semibold">$1,250</div>
            </div>
          </div>
          <button
            onClick={() => {
              const avg = Number((document.getElementById('avg') as HTMLInputElement)?.value || 0)
              const goal = Number((document.getElementById('goal') as HTMLInputElement)?.value || 0)
              const out = avg * goal
              const el = document.getElementById('roi')
              if (el) el.textContent = `$${out.toLocaleString()}`
            }}
            className="mt-3 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate"
          >
            Get My Free Growth Plan
          </button>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Bonita Businesses Already Growing</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              '"Our real estate leads doubled in 30 days."',
              '"We had 47 new diners book in the first month."',
              '"Finally, a marketing solution built for Bonita."',
            ].map((t) => (
              <div key={t} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate text-sm text-neutral-700">{t}</div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Plans That Fit Your Business</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Starter', price: 'From $750/mo', blurb: 'Restaurants, Gyms, Salons' },
              { name: 'Growth', price: 'From $1,250/mo', blurb: 'Home Services, Health' },
              { name: 'Pro', price: 'From $2,000/mo', blurb: 'Real Estate, Attorneys' },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
                <div className="font-medium">{p.name}</div>
                <div className="text-2xl font-semibold mt-1">{p.price}</div>
                <div className="text-sm text-neutral-600 mt-1">{p.blurb}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="apply" className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade">
          <h2 className="text-xl font-semibold tracking-tight">Ready to Grow? Apply Below.</h2>
          <form
            className="mt-4 grid grid-cols-1 gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const full_name = (form.elements.item(0) as HTMLInputElement)?.value
              const business_name = (form.elements.item(1) as HTMLInputElement)?.value
              const email = (form.elements.item(2) as HTMLInputElement)?.value
              const phone = (form.elements.item(3) as HTMLInputElement)?.value
              const category = (form.elements.item(4) as HTMLSelectElement)?.value
              const challenge = (form.elements.item(5) as HTMLTextAreaElement)?.value
              try { localStorage.setItem('bf-business-app', JSON.stringify({ full_name, business_name, email, phone, category, challenge, ts: Date.now() })) } catch {}
              const { error } = await createBusinessApplication({ full_name, business_name, email, phone, category, challenge })
              if (!error) {
                form.reset()
                window.location.assign('/thank-you')
              } else {
                console.error('[BusinessApp] submit failed, not redirecting')
              }
            }}
          >
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Full Name" defaultValue={(new URLSearchParams(window.location.search)).get('full_name') || ''} />
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business Name" defaultValue={(new URLSearchParams(window.location.search)).get('business_name') || ''} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" defaultValue={(new URLSearchParams(window.location.search)).get('email') || ''} />
              <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" defaultValue={(new URLSearchParams(window.location.search)).get('phone') || ''} />
            </div>
            <select className="rounded-xl border border-neutral-200 px-3 py-2 bg-white" defaultValue={(new URLSearchParams(window.location.search)).get('category') || ''}>
              <option value="">Select category…</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Home Services">Home Services</option>
              <option value="Health & Wellness">Health & Wellness</option>
              <option value="Restaurants">Restaurants</option>
              <option value="Professional Services">Professional Services</option>
            </select>
            <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What's your biggest growth challenge?" rows={4} defaultValue={(new URLSearchParams(window.location.search)).get('challenge') || ''} />
            <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Apply to Get Featured</button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">Submission can auto-trigger Zapier → Google Sheets + HighLevel (to be wired).</p>
        </div>

        <div className="mt-10 rounded-2xl bg-neutral-50 border border-neutral-100 p-5 text-center">
          <h3 className="text-lg font-semibold">Bonita Residents Are Searching. Will They Find You?</h3>
          <a href="#apply" className="inline-block mt-3 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Started Today</a>
        </div>
      </Container>
    </section>
  )
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
    try { return JSON.parse(localStorage.getItem(`bf-tracking-${categoryKey}`) || '{}') } catch { return {} }
  }, [categoryKey])
  const auth = useAuth()
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isAdmin = !!auth.email && adminList.includes(auth.email.toLowerCase())

  function recompute() {
    const ranked = scoreProviders(categoryKey, answers)
    const fallback = providersByCategory[categoryKey] || []
    setResults(ranked.length ? ranked : fallback)
  }

  useEffect(() => {
    recompute()
    if (auth.isAuthed) setSubmitted(true)
  }, [categoryKey, auth.isAuthed, answers])

  useEffect(() => {
    function onUpdate() { recompute() }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, [categoryKey, answers])
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
                      <div className="flex items-center justify-between">
                        <div className="font-medium flex items-center gap-2">
                          {r.name}
                          {isFeaturedProvider(r) && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">Featured</span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                      </div>
                      {isAdmin && (r.tags && r.tags.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-[11px]">{t}</span>
                          ))}
                        </div>
                      )}
                      {canShowRich && d.images && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {d.images.map((src, idx) => (
                            <img key={idx} src={src} alt={r.name + ' photo ' + (idx + 1)} className="rounded-lg border border-neutral-100" />
                          ))}
                        </div>
                      )}
                      {canShowRich && d.reviews && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Reviews</div>
                          <ul className="mt-1 space-y-1 text-sm">
                            {d.reviews.map((rv, idx) => (
                              <li key={idx} className="text-neutral-700">
                                <span className="text-neutral-500">{rv.author}</span> — {rv.rating.toFixed(1)}★ — {rv.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {canShowRich && d.posts && (
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
                          <div className="flex items-center justify-between">
                            <div className="font-medium flex items-center gap-2">
                              {r.name}
                              {isFeaturedProvider(r) && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">Featured</span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                          </div>
                          {isAdmin && (r.tags && r.tags.length > 0) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.tags.slice(0, 3).map((t) => (
                                <span key={t} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-[11px]">{t}</span>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setExpanded((e: Record<string, boolean>) => ({ ...e, [r.id]: !open }))} className="mt-2 text-sm rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5">{open ? 'Hide' : 'View'}</button>
                          <div className="collapsible mt-3 text-sm" data-open={open ? 'true' : 'false'}>
                              {r.isMember && d.images && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {d.images.map((src, idx) => (
                                    <img key={idx} src={src} alt={r.name + ' photo ' + (idx + 1)} className="rounded-lg border border-neutral-100" />
                                  ))}
                                </div>
                              )}
                              {r.isMember && d.reviews && (
                                <div className="mt-2">
                                  <div className="font-medium">Reviews</div>
                                  <ul className="mt-1 space-y-1">
                                    {d.reviews.map((rv, idx) => (
                                      <li key={idx} className="text-neutral-700">
                                        <span className="text-neutral-500">{rv.author}</span> — {rv.rating.toFixed(1)}★ — {rv.text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.isMember && d.posts && (
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
            <form
              className="mt-4 grid grid-cols-1 gap-3 text-left"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget as HTMLFormElement
                const name = (form.elements.namedItem('name') as HTMLInputElement)?.value
                const email = (form.elements.namedItem('email') as HTMLInputElement)?.value
                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value
                try {
                  const data = { category: categoryKey, name, email, notes, answers, ts: Date.now() }
                  const k = `bf-book-${categoryKey}`
                  localStorage.setItem(k, JSON.stringify(data))
                } catch {}
                auth.signInLocal({ name, email })
                // Persist booking row if table exists
                createBookingRow({ email, category: categoryKey, name, notes, answers })
                const ranked = scoreProviders(categoryKey, answers)
                setResults(ranked)
                setSubmitted(true)
              }}
            >
              <div>
                <label className="block text-sm text-neutral-600">Full Name</label>
                <input name="name" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm text-neutral-600">Email</label>
                <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-neutral-600">Notes (optional)</label>
                <textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Anything else we should know?" />
              </div>
              <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Sign Up</button>
            </form>
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
            <Route path="community" element={<CommunityIndex />} />
            <Route path="community/:category" element={<CommunityPost />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="owner" element={<OwnerPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage />} />
            <Route path="provider/:id" element={<ProviderPage />} />
            <Route path="thank-you" element={<ThankYouPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
