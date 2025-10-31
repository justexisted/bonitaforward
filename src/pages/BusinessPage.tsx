import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitText from '../components/SplitText'
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import CreateBusinessForm from './CreateBusinessForm'
import { CATEGORY_OPTIONS } from '../constants/categories'

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
  const navigate = useNavigate()
  const [msg, setMsg] = useState<string | null>(null)
  const [avgSale, setAvgSale] = useState(250)
  const [goalCustomers, setGoalCustomers] = useState(5)
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [])
  
  useEffect(() => {
    const hasPrefill = urlParams.toString().length > 0
    if (window.location.hash === '#apply' || hasPrefill) {
      setTimeout(() => {
        const el = document.getElementById('apply')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const form = el?.querySelector('form')
        const businessNameInput = form?.querySelector('input[name="business_name"]') as HTMLInputElement | null
        businessNameInput?.focus()
      }, 50)
    }
  }, [urlParams])
  return (
    <ScrollStack className="max-h-[70vh] mt-[-25px]">
    <section className="pt-4 pb-0 sm:pt-6 md:pt-8">
      <Container>
          <div className="text-center">
            <SplitText 
              className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-black relative z-1" 
              text="Grow Your Bonita Business!" 
              duration={0.1}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
            />
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-neutral-600">Bonita Forward helps you reach thousands of Bonita, San Diego residents and turns them into paying customers.</p>
            <a href="#apply" className="inline-block mt-3 sm:mt-4 md:mt-5 rounded-full bg-neutral-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base elevate">Get Featured</a>
            <div>
              <a href="#how" className="mt-2 inline-block text-xs sm:text-sm text-neutral-700 hover:text-neutral-900">See How It Works ↓</a>
            </div>
          </div>
            <ScrollStackItem>
              <h3 className="text-lg sm:text-xl md:text-2xl">Step 1: Exposure</h3>
              <p className="text-sm sm:text-base">Your business gets featured on Bonita Forward. The local hub residents already trust.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
              </div>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3 className="text-lg sm:text-xl md:text-2xl">Step 2: Customers Find You</h3>
              <p className="text-sm sm:text-base">We ask Bonita residents what they want.</p>
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
              <h3 className="text-lg sm:text-xl md:text-2xl">Step 3: Growth</h3>
              <p className="text-sm sm:text-base">You receive local repeat-customers weekly.</p>
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
              <h3 className="text-lg sm:text-xl md:text-2xl">Step 4: Your Business Grows</h3>
              <p className="text-sm sm:text-base">Locals enjoy discovering your business and you get to enjoy the benefits.</p>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3 className="text-lg sm:text-xl md:text-2xl">Bonita's Economy Grows</h3>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2 L6 10 H9 L4 16 H10 L2 22 H22 L14 16 H20 L15 10 H18 Z" />
                  <path d="M12 22 V16" />
                </svg>
              </div>
            </ScrollStackItem>
          
          <div className="mt-6 sm:mt-8 md:mt-10 rounded-2xl border border-neutral-100 p-4 sm:p-5 bg-white elevate form-fade scroll-stack-end">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">What's a New Customer Worth to You?</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs sm:text-sm text-neutral-600">Avg. Sale Value ($)</label>
                <input 
                  type="number" 
                  value={avgSale}
                  onChange={(e) => setAvgSale(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-neutral-600">Monthly New Customers Goal</label>
                <input 
                  type="number" 
                  value={goalCustomers}
                  onChange={(e) => setGoalCustomers(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
                />
              </div>
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50">
                <div className="text-xs sm:text-sm text-neutral-600">Estimated Monthly Value</div>
                <div className="text-base sm:text-lg font-semibold">
                  ${(avgSale * goalCustomers).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 md:mt-10">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">Bonita Businesses Already Growing</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                '"Our real estate leads doubled in 30 days."',
                '"We had 47 new diners book in the first month."',
                '"Finally, a marketing solution built for Bonita."',
              ].map((t) => (
                <div key={t} className="rounded-2xl border border-neutral-100 p-4 sm:p-5 bg-white elevate text-xs sm:text-sm text-neutral-700">{t}</div>
              ))}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 md:mt-10">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">Plans That Fit Your Business</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Free Listing Preview */}
              <div className="rounded-2xl border border-neutral-200 p-4 sm:p-5 bg-white elevate">
                <div className="text-sm sm:text-base font-medium mb-2">Starter</div>
                <div className="text-xl sm:text-2xl font-semibold mb-3">Free</div>
                
                {/* Preview Card */}
                <div className="mt-4 rounded-lg border border-neutral-200 overflow-hidden bg-white shadow-sm">
                  {/* Mock Image */}
                  <div className="w-full h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Mock Content */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900">Example Business</h4>
                        <p className="text-xs text-neutral-500 mt-1">Basic description (up to 200 characters)...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">Category</span>
                      <span className="text-xs text-neutral-400">Updates require approval</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Listing Preview */}
              <div className="rounded-2xl border border-amber-200 p-4 sm:p-5 bg-white elevate relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Featured
                </div>
                <div className="text-sm sm:text-base font-medium mb-2">Growth</div>
                <div className="text-xl sm:text-2xl font-semibold mb-3">$97/year</div>
                
                {/* Preview Card */}
                <div className="mt-4 rounded-lg border border-amber-200 overflow-hidden bg-white shadow-md">
                  {/* Mock Image with Featured Badge */}
                  <div className="w-full h-32 bg-gradient-to-br from-amber-50 to-amber-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-amber-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-medium shadow-sm">
                        ⭐ Featured
                      </span>
                    </div>
                    {/* Multiple images indicator */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-300"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-200"></div>
                    </div>
                  </div>
                  
                  {/* Mock Content */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-900">Example Business</h4>
                        <p className="text-xs text-neutral-500 mt-1">Enhanced description with more details (up to 500 characters)...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">Category</span>
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200">📅 Book Now</span>
                      <span className="text-xs text-green-600 font-medium">Instant updates</span>
                    </div>
                    {/* Featured-only features icons */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Phone</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Website</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Social Links</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Maps</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Analytics</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.94" />
                        </svg>
                        <span className="text-[10px] text-neutral-500">Priority</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <details className="mt-6 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <summary className="cursor-pointer select-none p-3 sm:p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-neutral-700">See plan details below</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              <div className="p-4 sm:p-5 md:p-6 border-t border-neutral-200">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4 sm:mb-6 text-center">Compare Plans</h3>
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
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Instant updates</strong> - edit business information without approval
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div id="apply" className="mt-6 sm:mt-8 md:mt-10 rounded-2xl border border-neutral-100 p-4 sm:p-5 bg-white elevate">
            {!auth.isAuthed || String((auth as any)?.role || '').toLowerCase() !== 'business' ? (
              <>
                <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">Ready to Grow? Apply Below.</h2>
                <form
                  className="mt-4 grid grid-cols-1 gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget as HTMLFormElement)
                    const full_name = formData.get('full_name') as string || ''
                    const business_name = formData.get('business_name') as string || ''
                    const email = formData.get('email') as string || ''
                    const phone = formData.get('phone') as string || ''
                    const category = formData.get('category') as string || ''
                    const tier = formData.get('tier') as string || 'free'
                    const challenge = formData.get('challenge') as string || ''
                    
                    // Validation
                    if (!business_name || !category) {
                      setMsg('Please fill in Business Name and Category.')
                      return
                    }
                    
                    try { localStorage.setItem('bf-business-app', JSON.stringify({ full_name, business_name, email, phone, category, tier, challenge, ts: Date.now() })) } catch {}
                    
                    const { error } = await createBusinessApplication({ full_name, business_name, email, phone, category, challenge, tier })
                    
                    if (!error) {
                      setMsg(`Thanks! We received your ${tier} listing application. Create an account to track your application status and manage your business listing.`)
                      ;(e.target as HTMLFormElement).reset()
                      
                      try { localStorage.setItem('bf-signup-prefill', JSON.stringify({ name: full_name, email })) } catch {}
                      
                      setTimeout(() => {
                        navigate(`/signin?mode=signup&email=${encodeURIComponent(email)}&name=${encodeURIComponent(full_name)}&type=business`)
                      }, 3000)
                    } else {
                      setMsg(`We could not submit your application. ${error.message || 'Please try again.'}`)
                    }
                  }}
                >
                  <input 
                    name="full_name"
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:text-base" 
                    placeholder="Full Name" 
                    defaultValue={urlParams.get('full_name') || ''} 
                  />
                  <input 
                    name="business_name"
                    required
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:text-base" 
                    placeholder="Business Name *" 
                    defaultValue={urlParams.get('business_name') || ''} 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                      name="email"
                      type="email" 
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:text-base" 
                      placeholder="Email" 
                      defaultValue={urlParams.get('email') || ''} 
                    />
                    <input 
                      name="phone"
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:text-base" 
                      placeholder="Phone" 
                      defaultValue={urlParams.get('phone') || ''} 
                    />
                  </div>
                  <select 
                    name="category"
                    required
                    className="rounded-xl border border-neutral-200 px-3 py-2 bg-white text-sm sm:text-base" 
                    defaultValue={urlParams.get('category') || ''}
                  >
                    <option value="">Select category… *</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.key} value={cat.key}>{cat.name}</option>
                    ))}
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
                  <textarea 
                    name="challenge"
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:text-base" 
                    placeholder="What's your biggest growth challenge?" 
                    rows={4} 
                    defaultValue={urlParams.get('challenge') || ''} 
                  />
                  <button className="rounded-full bg-neutral-900 text-white py-2 sm:py-2.5 elevate w-full text-sm sm:text-base">Submit Application</button>
                </form>
                {msg && <p className="mt-2 text-xs sm:text-sm text-neutral-700">{msg}</p>}
              </>
            ) : (
              <>
                <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">Get My Business Listed</h2>
                <p className="mt-2 text-xs sm:text-sm text-neutral-700">You're signed in as a business. Share your business details below to get listed on Bonita Forward.</p>
                <CreateBusinessForm />
              </>
            )}
          </div>

          <div className="mt-2 mb-0 rounded-2xl bg-neutral-50 border border-neutral-100 p-3 sm:p-4 text-center">
            <h3 className="text-base sm:text-lg font-semibold">Bonita Residents Are Searching. Will They Find You?</h3>
          </div>
        
      </Container>
    </section>
    </ScrollStack>
  )
}


