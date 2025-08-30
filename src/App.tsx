import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import { Building2, Home, HeartPulse, Utensils, Briefcase, ArrowRight, Sparkles } from 'lucide-react'

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
  signIn: (data: { name?: string; email: string }) => void
}

const AuthContext = createContext<AuthContextValue>({ isAuthed: false, signIn: () => {} })

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name?: string; email?: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bf-auth')
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; email?: string }
        if (parsed?.email) setProfile({ name: parsed.name, email: parsed.email })
      }
    } catch {}
  }, [])

  const signIn = (data: { name?: string; email: string }) => {
    setProfile({ name: data.name, email: data.email })
    try {
      localStorage.setItem('bf-auth', JSON.stringify({ ...data, ts: Date.now() }))
    } catch {}
  }

  const value: AuthContextValue = {
    isAuthed: Boolean(profile?.email),
    name: profile?.name,
    email: profile?.email,
    signIn,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  return useContext(AuthContext)
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-neutral-100">
      <Container className="flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">Bonita Forward</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/about">About</Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/contact">Get Featured</Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-neutral-100" to="/business">📈 Have a Business?</Link>
        </nav>
      </Container>
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
    <div className="min-h-full flex flex-col">
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
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="#categories" className="rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">
              Explore Local Businesses
            </Link>
            <Link to="/business" className="rounded-full bg-neutral-100 text-neutral-900 px-5 py-2.5 hover:bg-neutral-200 transition-colors">
              Get Connected
            </Link>
          </div>
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
    <section className="py-8">
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

function HomePage() {
  return (
    <>
      <Hero />
      <section id="categories" className="py-2">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((c) => (
              <CategoryCard cat={c} key={c.key} />
            ))}
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

const providersByCategory: Record<CategoryKey, Provider[]> = {
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

function scoreProviders(category: CategoryKey, answers: Record<string, string>): Provider[] {
  const providers = providersByCategory[category] || []
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

function getFunnelQuestions(categoryKey: CategoryKey, answers: Record<string, string>): FunnelQuestion[] {
  if (categoryKey === 'real-estate') {
    const need = answers['need']
    const list: FunnelQuestion[] = []
    list.push({
      id: 'need',
      prompt: 'What do you need help with?',
      options: [
        { id: 'buy', label: 'Buying' },
        { id: 'sell', label: 'Selling' },
        { id: 'rent', label: 'Renting' },
      ],
    })
    if (need === 'sell') {
      list.push({
        id: 'timeline',
        prompt: 'When are you planning to list?',
        options: [ { id: 'now', label: 'Now' }, { id: '30-60', label: '30–60 days' }, { id: '60+', label: '60+ days' } ],
      })
      list.push({
        id: 'price',
        prompt: 'Expected price range?',
        options: [ { id: 'sub750', label: 'Under $750k' }, { id: '750-1200', label: '$750k–$1.2M' }, { id: '1200+', label: '$1.2M+' } ],
      })
      list.push({
        id: 'beds',
        prompt: 'Bedrooms in your property?',
        options: [ { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4+', label: '4+' } ],
      })
    } else if (need === 'rent') {
      list.push({
        id: 'timeline',
        prompt: 'When do you plan to move?',
        options: [ { id: 'this-week', label: 'This week' }, { id: 'this-month', label: 'This month' }, { id: 'later', label: 'Later' } ],
      })
      list.push({
        id: 'budget',
        prompt: 'Monthly budget?',
        options: [ { id: 'low', label: '$' }, { id: 'med', label: '$$' }, { id: 'high', label: '$$$' } ],
      })
      list.push({
        id: 'beds',
        prompt: 'Bedrooms needed?',
        options: [ { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3+', label: '3+' } ],
      })
    } else {
      // default to buyer flow
      list.push({
        id: 'timeline',
        prompt: 'What’s your timeline?',
        options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ],
      })
      list.push({
        id: 'budget',
        prompt: 'Purchase budget?',
        options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ],
      })
      list.push({
        id: 'beds',
        prompt: 'Bedrooms needed?',
        options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4+', label: '4+' } ],
      })
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

  function choose(option: FunnelOption) {
    trackChoice(category.key, current.id, option.id)
    setAnswers((a: Record<string, string>) => ({ ...a, [current.id]: option.id }))
    setAnim('out')
    setTimeout(() => {
      setStep((s: number) => Math.min(s + 1, questions.length))
      setAnim('in')
    }, 120)
  }

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
                  className="rounded-full border border-neutral-200 px-4 py-3 bg-white text-neutral-900 hover:bg-neutral-50 active:scale-[0.99] transition-all duration-150"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Great! Here’s your summary</h3>
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
                      auth.signIn({ name, email })
                      try {
                        const key = `bf-signup-${category.key}`
                        localStorage.setItem(key, JSON.stringify({ email, answers }))
                      } catch {}
                    }}
                    className="mt-2 flex-col sm:flex-row gap-2"
                  >
                    <input name="name" placeholder="Your name" className="flex-1 rounded-full border border-neutral-200 px-3 py-2 w-full m-0.5" />
                    <input name="email" type="email" required placeholder="you@example.com" className="flex-1 rounded-full border border-neutral-200 px-3 py-2 w-full m-0.5" />
                    <button className="rounded-full bg-neutral-900 text-white px-4 py-2">Sign Up</button>
                  </form>
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2">
                <Link to={`/book?category=${category.key}`} className="rounded-full bg-neutral-900 text-white px-4 py-2">Book Appointment</Link>
                <button
                  onClick={() => {
                    try { localStorage.removeItem(`bf-tracking-${category.key}`) } catch {}
                    setAnswers({})
                    setStep(0)
                    setAnim('in')
                  }}
                  className="rounded-full bg-neutral-100 text-neutral-900 px-4 py-2 hover:bg-neutral-200"
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
              <p className="mt-1 text-neutral-600">Why supporting them matters: Local jobs, local growth, and community resilience.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm font-medium">Example Businesses</div>
                  <ul className="mt-2 text-sm text-neutral-600 list-disc list-inside">
                    <li>Placeholder One</li>
                    <li>Placeholder Two</li>
                    <li>Placeholder Three</li>
                  </ul>
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
          <p className="text-neutral-600">We promote and highlight the best businesses in San Diego’s Bonita community, encouraging residents to stay local and support local.</p>
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
          <p className="mt-1 text-neutral-600">Local business in Bonita? Request inclusion and we’ll reach out.</p>
          <form className="mt-4 grid grid-cols-1 gap-3">
            <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business name" />
            <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Contact email" />
            <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What do you offer?" rows={4} />
            <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Request Inclusion</button>
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
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-neutral-600 mt-1">{s.text}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate">
          <h2 className="text-xl font-semibold tracking-tight">What’s a New Customer Worth to You?</h2>
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
              '“Our real estate leads doubled in 30 days.”',
              '“We had 47 new diners book in the first month.”',
              '“Finally, a marketing solution built for Bonita.”',
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

        <div id="apply" className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate">
          <h2 className="text-xl font-semibold tracking-tight">Ready to Grow? Apply Below.</h2>
          <form className="mt-4 grid grid-cols-1 gap-3">
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
            <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What’s your biggest growth challenge?" rows={4} />
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
  const answers = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`bf-tracking-${categoryKey}`) || '{}') } catch { return {} }
  }, [categoryKey])
  const auth = useAuth()
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold tracking-tight">Search Bonita's top {category?.name.toLowerCase() || 'providers'}</h2>
          <p className="mt-1 text-neutral-600">Access to top Bonita {category?.name.toLowerCase() || 'providers'}.</p>
          {!submitted && !auth.isAuthed ? (
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
                auth.signIn({ name, email })
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
          ) : (
            <div className="mt-5 text-left">
              <div className="text-sm text-neutral-500">Top matches</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {results.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">Tags: {r.tags.join(', ')}</div>
                    <button className="mt-2 text-sm rounded-full bg-neutral-900 text-white px-3 py-1.5">Contact</button>
                  </div>
                ))}
              </div>
              {results.length > 3 && (
                <>
                  <div className="mt-5 text-sm text-neutral-500">Other providers</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {results.slice(3).map((r) => (
                      <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">Tags: {r.tags.join(', ')}</div>
                        <button className="mt-2 text-sm rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5">View</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
