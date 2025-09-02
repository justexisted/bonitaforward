import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { Building2, Home, HeartPulse, Utensils, Briefcase, ArrowRight, Sparkles, Menu, X } from 'lucide-react'
import SupabasePing from './components/SupabasePing'
import { supabase } from './lib/supabase'
import { fetchSheetRows, mapRowsToProviders, type SheetProvider } from './lib/sheets'
import { fetchProvidersFromSupabase } from './lib/supabaseData'
import SignInPage from './pages/SignIn'
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
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-neutral-100">
      <Container className="flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">Bonita Forward</span>
        </Link>
        <div className="flex items-center gap-2">
          <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl hover:bg-neutral-100">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <nav className="hidden sm:flex items-center gap-3 text-sm">
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/about">About</Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/contact">Get Featured</Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/business">📈 Have a Business?</Link>
            {auth.isAuthed && (
              <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/owner">My Business</Link>
            )}
            {auth.isAuthed && (
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
              <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100" to="/contact">Get Featured</Link>
              <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100" to="/business">📈 Have a Business?</Link>
              {auth.isAuthed && (
                <Link onClick={() => setOpen(false)} className="rounded-full px-3 py-2 hover:bg-neutral-100 text-center" to="/owner">My Business</Link>
              )}
              {auth.isAuthed && (
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
          <Link to="/business" className="text-neutral-700 hover:text-neutral-900">📈 Have a Business?</Link>
        </div>
      </Container>
    </footer>
  )
}

function Layout() {
  return (
    <div className="min-h-full flex flex-col page-fade-in">
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
  return (
    <section className="py-10 sm:py-12">
      <Container>
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Discover, Support, and Grow Local Bonita Businesses.
          </h1>
          <p className="mt-3 text-neutral-600">
            Minimal, modern, and made for our community. Explore top categories and get connected.
          </p>
          {/* CTAs removed per request */}
        </div>
      </Container>
    </section>
  )
}

function CategoryCard({ cat }: { cat: typeof categories[number] }) {
  const Icon = cat.icon
  return (
    <Link to={`/category/${cat.key}`} className="block rounded-2xl bg-white border border-neutral-100 p-4 elevate">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-50">
          <Icon className="h-5 w-5 text-neutral-700" />
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
  const posts = [
    { title: 'Top 5 Restaurants This Month', excerpt: 'Discover trending dining spots loved by Bonita locals.' },
    { title: 'Bonita Home Service Deals', excerpt: 'Seasonal offers from trusted local pros.' },
    { title: 'Wellness Spotlight', excerpt: 'Chiropractors, gyms, and med spas to try now.' },
  ]
  return (
    <section className="py-8 zoom-in">
      <Container>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Community</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {posts.map((p) => (
            <div key={p.title} className="rounded-2xl border border-neutral-100 p-4 bg-white elevate">
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-neutral-600 mt-1">{p.excerpt}</div>
              <button className="mt-3 text-sm text-neutral-700 hover:text-neutral-900">Read more</button>
            </div>
          ))}
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
            <details className="rounded-2xl border border-neutral-100 p-4 bg-white elevate">
              <summary className="cursor-pointer select-none text-sm text-neutral-700">See more</summary>
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
    { id: 'timeline', prompt: 'What’s your timeline?', options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] },
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

// Curated short descriptions for top real-estate brands (from the analytical report)
const providerDescriptions: Record<string, string> = {
  '24k international realty': 'Local, family-owned brokerage with 32+ years in Bonita & Downtown. Full sales plus 24K Property Management and probate expertise; serves entry to luxury.',
  'kent realty (the gary kent team)': 'High-touch team led by veteran broker Gary Kent. Seller-focused, upper mid to luxury SFH expertise with institutional experience.',
  'leilani sells homes (integrity first realty & loans)': 'Bonita-based specialist for VA and first‑time buyers. Integrated guidance on realty & loans; also offers flexible property management.',
  'palisade realty, inc.': 'High-volume South Bay team (300+ Chula Vista sales). Aggressive marketing across all price points from entry to luxury.',
  'broadpoint properties': 'One‑stop shop: buy/sell/rent with strong property management. Covers residential plus some commercial (office/retail/industrial).',
  'coldwell banker west': 'Major franchise presence with powerful brand reach. Best paired with top local teams for South Bay success.',
  'century 21 affiliated': 'Top C21 franchise with Market Specialties (Commercial, Fine Homes). Broad coverage across residential and commercial.',
  'exp realty of southern california': 'Cloud‑based, tech‑forward network of entrepreneurial agents. Broad price coverage; strength in digital marketing.',
  'compass': 'Technology‑driven brokerage with strong data tools and luxury dominance; extensive agent network countywide.',
  'keller williams realty': 'Agent‑centric national brand. Strong local agents serve Bonita from nearby offices; broad residential coverage.',
  'mckee properties': 'Focused property management for residential and small office/retail in Bonita and central/south San Diego.',
}

function getProviderDescription(p: Provider): string | undefined {
  const key = p.name.trim().toLowerCase()
  return providerDescriptions[key]
}

function getProviderDetails(p: Provider): ProviderDetails {
  // Placeholder details; in production, fetch from DB/API
  const seed = encodeURIComponent(p.id)
  return {
    phone: '(619) 555-0123',
    email: 'info@' + p.name.replace(/\s+/g, '').toLowerCase() + '.com',
    website: 'https://example.com/' + seed,
    address: 'Bonita, CA',
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
    { id: 're-1', name: 'Bonita Realty Group', category: 'real-estate', tags: ['buy', '0-3', 'entry', '2', '3'], rating: 4.9 },
    { id: 're-2', name: 'South Bay Homes', category: 'real-estate', tags: ['buy', '3-6', 'mid', '3', '4+'], rating: 4.8 },
    { id: 're-3', name: 'Vista Property Pros', category: 'real-estate', tags: ['sell', 'now', '750-1200', '3', '4+'], rating: 4.7 },
    { id: 're-4', name: 'Bonita Rentals Co', category: 'real-estate', tags: ['rent', 'this-month', 'low', '1', '2'], rating: 4.6 },
    { id: 're-5', name: 'Canyon Estates', category: 'real-estate', tags: ['sell', '60+', '1200+', '4+'], rating: 4.6 },
    { id: 're-6', name: 'Coastal Keys', category: 'real-estate', tags: ['buy', '6+', 'high', '4+'], rating: 4.5 },
  ],
  'home-services': [
    { id: 'hs-1', name: 'GreenLeaf Landscaping', category: 'home-services', tags: ['landscaping', 'asap', 'house', 'low'], rating: 4.9 },
    { id: 'hs-2', name: 'SunBright Solar', category: 'home-services', tags: ['solar', 'this-month', 'house', 'high'], rating: 4.8 },
    { id: 'hs-3', name: 'Sparkle Clean', category: 'home-services', tags: ['cleaning', 'asap', 'condo', 'low'], rating: 4.7 },
    { id: 'hs-4', name: 'Bonita Remodel Co', category: 'home-services', tags: ['remodeling', 'flexible', 'house', 'med'], rating: 4.7 },
    { id: 'hs-5', name: 'CondoCare Pros', category: 'home-services', tags: ['cleaning', 'this-month', 'condo', 'med'], rating: 4.6 },
    { id: 'hs-6', name: 'YardWorks', category: 'home-services', tags: ['landscaping', 'flexible', 'house', 'med'], rating: 4.5 },
  ],
  'health-wellness': [
    { id: 'hw-1', name: 'Bonita Chiro Clinic', category: 'health-wellness', tags: ['chiro', 'relief', 'this-week', 'one-off'], rating: 4.9 },
    { id: 'hw-2', name: 'Peak Fitness Gym', category: 'health-wellness', tags: ['gym', 'fitness', 'this-month', 'membership'], rating: 4.8 },
    { id: 'hw-3', name: 'Glow Salon', category: 'health-wellness', tags: ['salon', 'beauty', 'this-week', 'one-off'], rating: 4.7 },
    { id: 'hw-4', name: 'Serene Med Spa', category: 'health-wellness', tags: ['medspa', 'beauty', 'later', 'one-off'], rating: 4.7 },
    { id: 'hw-5', name: 'Core Strength Club', category: 'health-wellness', tags: ['gym', 'fitness', 'later', 'membership'], rating: 4.6 },
    { id: 'hw-6', name: 'Align & Thrive', category: 'health-wellness', tags: ['chiro', 'relief', 'this-month', 'one-off'], rating: 4.6 },
  ],
  'restaurants-cafes': [
    { id: 'rc-1', name: 'Casa Bonita', category: 'restaurants-cafes', tags: ['mexican', 'casual', 'low', 'dine'], rating: 4.8 },
    { id: 'rc-2', name: 'Bamboo Grove', category: 'restaurants-cafes', tags: ['asian', 'date', 'med', 'dine'], rating: 4.7 },
    { id: 'rc-3', name: 'Bluebird Café', category: 'restaurants-cafes', tags: ['cafes', 'casual', 'low', 'takeout'], rating: 4.7 },
    { id: 'rc-4', name: 'Bonita Grill', category: 'restaurants-cafes', tags: ['american', 'family', 'med', 'dine'], rating: 4.6 },
    { id: 'rc-5', name: 'Salsa Verde', category: 'restaurants-cafes', tags: ['mexican', 'family', 'med', 'dine'], rating: 4.6 },
    { id: 'rc-6', name: 'Noodle Haus', category: 'restaurants-cafes', tags: ['asian', 'casual', 'low', 'takeout'], rating: 4.5 },
  ],
  'professional-services': [
    { id: 'ps-1', name: 'Bonita Legal', category: 'professional-services', tags: ['attorney', 'advice', 'now', 'med'], rating: 4.9 },
    { id: 'ps-2', name: 'Summit Accounting', category: 'professional-services', tags: ['accountant', 'ongoing', 'soon', 'low'], rating: 4.8 },
    { id: 'ps-3', name: 'Citrus Consulting', category: 'professional-services', tags: ['consultant', 'project', 'flex', 'high'], rating: 4.7 },
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
    providersByCategory = grouped
    console.log('[Sheets] Providers loaded from Google Sheets', grouped)
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
}

async function loadProvidersFromSupabase(): Promise<boolean> {
  const rows = await fetchProvidersFromSupabase()
  if (!rows || rows.length === 0) return false
  const grouped: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  }
  rows.forEach((r) => {
    const key = (r.category_key as CategoryKey)
    if (!grouped[key]) return
    grouped[key].push({
      id: r.id,
      name: r.name,
      category: key,
      tags: (r.tags as string[] | null) || (r.badges as string[] | null) || [],
      rating: r.rating ?? undefined,
    })
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
    return providers
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
        if (answers['staging'] === 'yes' && p.tags.includes('staging')) score += 1
        // Generic tag match fallback
        p.tags.forEach((t) => { if (values.has(t)) score += 0 })
        return { p, score }
      })
      .sort((a, b) => {
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

// Track a contact/get‑featured submission (simplified)
async function createContactLead(params: { business_name?: string; contact_email?: string; details?: string }) {
  console.log('[ContactLead] submitting lead', params)
  try {
    const { data, error } = await supabase
      .from('contact_leads')
      .insert([
        {
          business_name: params.business_name || null,
          contact_email: params.contact_email || null,
          details: params.details || null,
        },
      ])
      .select('*')
    if (error) {
      console.error('[ContactLead] insert error', error)
    } else {
      console.log('[ContactLead] insert success', data)
    }
    return { data, error }
  } catch (err) {
    console.error('[ContactLead] unexpected failure', err)
    return { data: null, error: err as any }
  }
}

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
      list.push({ id: 'timeline', prompt: 'What’s your timeline?', options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
    } else {
      list.push({ id: 'timeline', prompt: 'What’s your timeline?', options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
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
              {!auth.isAuthed && (
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-600">Sign up for discounts</div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement)?.value
                      const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value
                      auth.signInLocal({ name, email })
                      try {
                        const key = `bf-signup-${category.key}`
                        localStorage.setItem(key, JSON.stringify({ email, answers }))
                      } catch {}
                    }}
                    className="mt-2 flex-col sm:flex-row gap-2"
                  >
                    <input name="name" placeholder="Your name" className="flex-1 rounded-full border border-neutral-200 px-3 py-2 w-full m-0.5" />
                    <input name="email" type="email" required placeholder="you@example.com" className="flex-1 rounded-full border border-neutral-200 px-3 py-2 w-full m-0.5" />
                    <button className="btn btn-primary">Sign Up</button>
                  </form>
                  <div className="mt-2 text-center">
                    <button onClick={auth.signInWithGoogle} className="btn btn-secondary text-sm">Or continue with Google</button>
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2">
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

function CategoryPage() {
  const path = window.location.pathname.split('/').pop() as CategoryKey
  const category = categories.find((c) => c.key === path)
  if (!category) return <Container className="py-10">Category not found.</Container>
  const Icon = category.icon
  const [, setVersion] = useState(0)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    function onUpdate() { setVersion((v: number) => v + 1) }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, [])
  const list = providersByCategory[category.key] || []
  const featured = list.slice(0, 4)
  const remaining = list.slice(4)
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
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm font-medium">Businesses in {category.name}</div>
                  {featured.length > 0 ? (
                    <>
                      <ul className="mt-2 text-sm text-neutral-700 space-y-1">
                        {featured.map((p) => (
                          <li key={p.id} className="">
                            <div className="flex items-center justify-between">
                              <span>{p.name}</span>
                              {typeof p.rating === 'number' && (
                                <span className="text-xs text-neutral-500">{p.rating.toFixed(1)}★</span>
                              )}
                            </div>
                            {/* Show short description for featured real-estate brands when available */}
                            {getProviderDescription(p) && (
                              <div className="text-xs text-neutral-600 mt-0.5">{getProviderDescription(p)}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {remaining.length > 0 && (
                        <div className="mt-2">
                          <button onClick={() => setShowAll((v) => !v)} className="btn btn-secondary text-xs">
                            {showAll ? 'Show less' : 'Show more'}
                          </button>
                          <div className="collapsible mt-2" data-open={showAll ? 'true' : 'false'}>
                            <ul className="text-sm text-neutral-700 space-y-1">
                              {remaining.map((p) => (
                                <li key={p.id} className="flex items-center justify-between">
                                  <span>{p.name}</span>
                                  {typeof p.rating === 'number' && (
                                    <span className="text-xs text-neutral-500">{p.rating.toFixed(1)}★</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-2 text-neutral-500 text-sm">Loading businesses…</div>
                  )}
                </div>
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm font-medium mb-2"></div>
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
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
          <h2 className="text-xl font-semibold tracking-tight">Get Featured</h2>
          <p className="mt-1 text-neutral-600">Local business in Bonita? Request inclusion and we'll reach out.</p>
          <form
            className="mt-4 grid grid-cols-1 gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const business_name = (form.elements.item(0) as HTMLInputElement)?.value
              const contact_email = (form.elements.item(1) as HTMLInputElement)?.value
              const details = (form.elements.item(2) as HTMLTextAreaElement)?.value
              try { localStorage.setItem('bf-contact', JSON.stringify({ business_name, contact_email, details, ts: Date.now() })) } catch {}
              const { error } = await createContactLead({ business_name, contact_email, details })
              if (!error) {
                form.reset()
                window.location.assign('/thank-you')
              } else {
                console.error('[ContactLead] submit failed, not redirecting')
              }
            }}
          >
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business name" />
            <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Contact email" />
            <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What do you offer?" rows={4} />
            <button className="btn btn-primary w-full">Request Inclusion</button>
          </form>
        </div>
      </Container>
    </section>
  )
}

function BusinessPage() {
  // simple ROI calculator state is kept local via uncontrolled inputs and live compute
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
            { title: 'Step 2: Lead Capture', text: 'We build a smart funnel that captures Bonita residents ready to buy.' },
            { title: 'Step 3: Growth', text: 'You receive qualified leads weekly — no more chasing, just closing.' },
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
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Full Name" />
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business Name" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
              <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
            </div>
            <select className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
              <option>Real Estate</option>
              <option>Home Services</option>
              <option>Health & Wellness</option>
              <option>Restaurants</option>
              <option>Professional Services</option>
            </select>
            <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What's your biggest growth challenge?" rows={4} />
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
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold tracking-tight">Search Bonita's top {category?.name.toLowerCase() || 'providers'}</h2>
          <p className="mt-1 text-neutral-600">Access to top Bonita {category?.name.toLowerCase() || 'providers'}.</p>
          {auth.isAuthed || submitted || results.length > 0 ? (
            <div className="mt-5 text-left">
              {/* Example Businesses (placeholder) */}
              <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
                <div className="text-sm font-medium">Example Businesses</div>
                <ul className="mt-2 text-sm text-neutral-600 list-disc list-inside">
                  {(providersByCategory[categoryKey] || []).slice(0, 3).map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 text-sm text-neutral-500">Top matches</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {results.slice(0, 3).map((r) => {
                  const d = getProviderDetails(r)
                  return (
                    <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                      </div>
                      {isAdmin && (r.tags && r.tags.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-[11px]">{t}</span>
                          ))}
                        </div>
                      )}
                      {d.images && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {d.images.map((src, idx) => (
                            <img key={idx} src={src} alt={r.name + ' photo ' + (idx + 1)} className="rounded-lg border border-neutral-100" />
                          ))}
                        </div>
                      )}
                      {d.reviews && (
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
                      {d.posts && (
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
                        <div>Phone: {d.phone}</div>
                        <div>Email: {d.email}</div>
                        <div>Website: <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                        <div>Address: {d.address}</div>
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
                            <div className="font-medium">{r.name}</div>
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
                              {d.images && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {d.images.map((src, idx) => (
                                    <img key={idx} src={src} alt={r.name + ' photo ' + (idx + 1)} className="rounded-lg border border-neutral-100" />
                                  ))}
                                </div>
                              )}
                              {d.reviews && (
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
                              {d.posts && (
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
                                <div>Phone: {d.phone}</div>
                                <div>Email: {d.email}</div>
                                <div>Website: <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                                <div>Address: {d.address}</div>
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
            <Route path="admin" element={<AdminPage />} />
            <Route path="owner" element={<OwnerPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage />} />
            <Route path="thank-you" element={<ThankYouPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
