import React, { useEffect, useMemo, useState } from 'react'
import SplitText from '../components/SplitText'
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack'
import CountUp from '../components/CountUp'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import CreateBusinessForm from './CreateBusinessForm'

function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

async function createBusinessApplication(params: { full_name?: string; business_name?: string; email?: string; phone?: string; category?: string; challenge?: string; tier?: string }) {
  try {
    const { error } = await supabase
      .from('business_applications')
      .insert([
        {
          full_name: params.full_name || null,
          business_name: params.business_name || null,
          email: params.email || null,
          phone: params.phone || null,
          category: params.category || null,
          challenge: params.challenge || null,
          // TODO: Add these columns to business_applications table:
          // tier_requested: params.tier || 'free',
          // status: 'pending'
        },
      ])
    if (error) {
      console.error('[BusinessApp] insert error', error)
    } else {
      console.log('[BusinessApp] insert success')
    }
    return { data: null, error }
  } catch (err) {
    console.error('[BusinessApp] unexpected failure', err)
    return { data: null, error: err as any }
  }
}

export default function BusinessPage() {
  const auth = useAuth()
  const [msg, setMsg] = useState<string | null>(null)
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [])
  useEffect(() => {
    const hasPrefill = urlParams.toString().length > 0
    if (window.location.hash === '#apply' || hasPrefill) {
      setTimeout(() => {
        const el = document.getElementById('apply')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const inputs = el?.querySelectorAll('input')
        ;(inputs && (inputs[1] as HTMLInputElement | undefined))?.focus()
      }, 50)
    }
  }, [])
  return (
    <ScrollStack className="min-w-[100vw]">
    <section className="py-8">
      <Container>
          <div className="text-center">
            <SplitText 
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-black relative z-1" 
              text="Grow Your Bonita Business!" 
              duration={0.1}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
            />
            <p className="mt-3 text-neutral-600">Bonita Forward helps you reach thousands of Bonita, San Diego residents and turns them into paying customers.</p>
            <a href="#apply" className="inline-block mt-5 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Featured</a>
            <div>
              <a href="#how" className="mt-2 inline-block text-sm text-neutral-700 hover:text-neutral-900">See How It Works ↓</a>
            </div>
          </div>
            <ScrollStackItem>
              <h3>Step 1: Exposure</h3>
              <p>Your business gets featured on Bonita Forward. The local hub residents already trust.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
              </div>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 2: Customers Find You</h3>
              <p>We ask Bonita residents what they want.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"></path>
                  <path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"></path>
                  <path d="M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"></path>
                  <path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"></path>
                </svg>
              </div>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 3: Growth</h3>
              <p>You receive local repeat-customers weekly.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 0 1 8.66 5" />
                  <path d="M20 2v5h-5" />
                  <path d="M22 12a10 10 0 0 1-5 8.66" />
                  <path d="M22 20h-5v-5" />
                  <path d="M12 22a10 10 0 0 1-8.66-5" />
                  <path d="M4 22v-5h5" />
                  <path d="M2 12a10 10 0 0 1 5-8.66" />
                  <path d="M2 4h5v5" />
                </svg>
              </div>

            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 4: Your Business Grows</h3>
              <p>Locals enjoy discovering your business and you get to enjoy the benefits.</p>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Bonita's Economy Grows</h3>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2 L6 10 H9 L4 16 H10 L2 22 H22 L14 16 H20 L15 10 H18 Z" />
                  <path d="M12 22 V16" />
                </svg>
              </div>
            </ScrollStackItem>
          
          <div className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade scroll-stack-end">
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
                <div id="roi" className="text-lg font-semibold">
                <CountUp
                  from={0}
                  to={1250}
                  separator=","
                  direction="up"
                  duration={2}
                  className="count-up-text"
                />
                </div>
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
            <h2 className="text-xl font-semibold tracking-tight z-10">Bonita Businesses Already Growing</h2>
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
                { name: 'Starter', price: 'Free', blurb: 'Free Listing' },
                { name: 'Growth', price: '$97/year', blurb: 'Featured Listing' },
              ].map((p) => (
                <div key={p.name} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-2xl font-semibold mt-1">{p.price}</div>
                  <div className="text-sm text-neutral-600 mt-1">{p.blurb}</div>
                </div>
              ))}
            </div>
            
            <details className="mt-6 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <summary className="cursor-pointer select-none p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">See plan details below</span>
                <svg className="w-5 h-5 text-neutral-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              <div className="p-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 mb-6 text-center">Compare Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                        Free Account
                      </h4>
                      <p className="text-2xl font-bold text-green-600 mt-2">$0/month</p>
                    </div>
                    <ul className="text-sm text-neutral-700 space-y-2">
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Business name, category, phone, email
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Website and address
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Basic business description (up to 200 characters)
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Basic tags and specialties
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        1 business image
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                        Featured Account
                      </h4>
                      <p className="text-2xl font-bold text-yellow-600 mt-2">$97/year</p>
                    </div>
                    <ul className="text-sm text-neutral-700 space-y-2">
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Everything in Free, plus:</strong>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Priority placement</strong> - appears at top of search results
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Enhanced description</strong> - up to 500 characters
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Social media links</strong> - Facebook, Instagram, etc.
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Google Maps integration</strong> - interactive location
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Multiple images</strong> - showcase your business
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Booking system</strong> - direct appointment scheduling
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Analytics</strong> - view customer interactions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div id="apply" className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade">
            {!auth.isAuthed || String((auth as any)?.role || '').toLowerCase() !== 'business' ? (
              <>
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
                    const tier = (form.querySelector('input[name="tier"]:checked') as HTMLInputElement)?.value || 'free'
                    const challenge = (form.elements.item(6) as HTMLTextAreaElement)?.value
                    
                    try { localStorage.setItem('bf-business-app', JSON.stringify({ full_name, business_name, email, phone, category, tier, challenge, ts: Date.now() })) } catch {}
                    
                    const { error } = await createBusinessApplication({ full_name, business_name, email, phone, category, challenge, tier })
                    
                    if (!error) {
                      setMsg(`Thanks! We received your ${tier} listing application. Create an account to track your application status and manage your business listing.`)
                      form.reset()
                      
                      try { localStorage.setItem('bf-signup-prefill', JSON.stringify({ name: full_name, email })) } catch {}
                      
                      setTimeout(() => {
                        window.location.href = `/signin?mode=signup&email=${encodeURIComponent(email)}&name=${encodeURIComponent(full_name)}&type=business`
                      }, 3000)
                    } else {
                      setMsg('We could not submit your application. Please try again.')
                    }
                  }}
                >
                  <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Full Name" defaultValue={urlParams.get('full_name') || ''} />
                  <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business Name" defaultValue={urlParams.get('business_name') || ''} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" defaultValue={urlParams.get('email') || ''} />
                    <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" defaultValue={urlParams.get('phone') || ''} />
                  </div>
                  <select className="rounded-xl border border-neutral-200 px-3 py-2 bg-white" defaultValue={urlParams.get('category') || ''}>
                    <option value="">Select category…</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Home Services">Home Services</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Restaurants">Restaurants</option>
                    <option value="Professional Services">Professional Services</option>
                  </select>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Listing Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50">
                        <input type="radio" name="tier" value="free" className="mt-1 mr-3" defaultChecked />
                        <div>
                          <div className="font-medium text-sm">Free Listing</div>
                          <div className="text-xs text-neutral-600">Basic business info, contact details, single image</div>
                        </div>
                      </label>
                      <label className="flex items-start p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50">
                        <input type="radio" name="tier" value="featured" className="mt-1 mr-3" />
                        <div>
                          <div className="font-medium text-sm">Featured Listing $97/year</div>
                          <div className="text-xs text-neutral-600">Multiple images, social links, booking system, priority placement</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What's your biggest growth challenge?" rows={4} defaultValue={urlParams.get('challenge') || ''} />
                  <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Submit Application</button>
                </form>
                {msg && <p className="mt-2 text-sm text-neutral-700">{msg}</p>}
                <p className="mt-2 text-xs text-neutral-500"></p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold tracking-tight">Get My Business Listed</h2>
                <p className="mt-2 text-sm text-neutral-700">You're signed in as a business. Share your business details below to get listed on Bonita Forward.</p>
                <CreateBusinessForm />
              </>
            )}
          </div>

          <div className="mt-10 rounded-2xl bg-neutral-50 border border-neutral-100 p-15 text-center">
            <h3 className="text-lg font-semibold">Bonita Residents Are Searching. Will They Find You?</h3>
            <a href="#apply" className="inline-block mt-3 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Started Today</a>
          </div>
        
      </Container>
    </section>
    </ScrollStack>
  )
}


