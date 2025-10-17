import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLocalStorageJSON, isFeaturedProvider as isProviderFeatured, type Provider as HelperProvider, type CategoryKey } from '../utils/helpers'

function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

// Use Provider type from helpers.ts, but allow it to be a subset for BookPage
type Provider = HelperProvider | {
  id: string
  name: string
  slug: string
  category_key: CategoryKey
  rating?: number
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
  images?: string[] | null
  coupon_code?: string | null
  coupon_discount?: string | null
  tags?: string[]
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

// getLocalStorageJSON imported from src/utils/helpers.ts

function useProviderUpdates(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    function onUpdate() { callback() }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, deps)
}

// isFeaturedProvider imported from src/utils/helpers.ts as isProviderFeatured
function isFeaturedProvider(p: Provider): boolean {
  return isProviderFeatured(p as HelperProvider)
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
  }
}

function fixImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // If it's a Supabase storage path, convert to public URL
  if (url.startsWith('business-images/') || url.startsWith('blog-images/')) {
    const { data } = supabase.storage.from('business-images').getPublicUrl(url)
    return data.publicUrl
  }
  
  // If it's a relative path, assume it's in business-images bucket
  if (url.startsWith('/') || !url.includes('/')) {
    const { data } = supabase.storage.from('business-images').getPublicUrl(url)
    return data.publicUrl
  }
  
  // If it has a file extension, return as-is
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return url
  }
  
  // Return as-is if we can't determine the format
  return url
}

export default function BookPage(props: {
  categories: { key: CategoryKey; name: string }[]
  scoreProviders: (key: CategoryKey, answers: Record<string, string>) => Provider[]
  providersByCategory: Record<string, Provider[]>
}) {
  const { categories, scoreProviders, providersByCategory } = props
  const params = new URLSearchParams(window.location.search)
  const categoryKey = (params.get('category') as CategoryKey) || 'real-estate'
  const category = categories.find((c) => c.key === categoryKey)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Provider[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [claimAsk, setClaimAsk] = useState<Record<string, boolean>>({})
  const answers = useMemo(() => {
    const urlFilters = params.get('filters')
    if (urlFilters) {
      try {
        const parsedFilters = JSON.parse(decodeURIComponent(urlFilters))
        if (parsedFilters && typeof parsedFilters === 'object') return parsedFilters
      } catch {}
    }
    return getLocalStorageJSON<Record<string, string>>(`bf-tracking-${categoryKey}`, {})
  }, [categoryKey, params.get('filters')])
  const auth = useAuth()

  function recompute() {
    const ranked = scoreProviders(categoryKey, answers)
    const fallback = providersByCategory[categoryKey] || []
    setResults(ranked.length ? ranked : fallback)
  }

  useEffect(() => {
    recompute()
    setSubmitted(true)
  }, [categoryKey, answers])

  useProviderUpdates(() => { recompute() }, [categoryKey, answers])
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
                      <div className="relative mb-3">
                        {d.images && d.images.length > 0 ? (
                          <img 
                            src={fixImageUrl(d.images?.[0] || '')} 
                            alt={`${r.name} business photo`} 
                            className="w-full h-40 object-cover rounded-lg border border-neutral-100"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = 'none'
                              img.parentElement!.innerHTML = `
                                <div class="w-full h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
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
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                            <div className="text-center text-neutral-500">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs">No image available</p>
                            </div>
                          </div>
                        )}
                        {isFeaturedProvider(r) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm mt-[-1rem]">
                            {r.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Link to={`/provider/${r.slug}`} className="font-medium cursor-pointer hover:underline">
                          {r.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {r.coupon_code && r.coupon_discount && (
                            <div className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                              {r.coupon_discount}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {r.rating?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      {canShowRich && d.reviews && d.reviews.length > 0 && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Reviews</div>
                          <ul className="mt-1 space-y-1 text-sm">
                            {d.reviews.map((rv, idx) => (
                              <li key={idx} className="text-neutral-700">
                                <span className="text-neutral-500">{rv.author}</span> — <span className="flex items-center gap-1 inline-flex"><span>{rv.rating.toFixed(1)}</span><svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span> — {rv.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {canShowRich && d.posts && d.posts.length > 0 && (
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
                          {d.images && d.images.length > 0 ? (
                            <div className="mb-3">
                              <img 
                                src={fixImageUrl(d.images?.[0] || '')} 
                                alt={`${r.name} business photo`} 
                                className="w-full h-24 object-cover rounded-lg border border-neutral-100"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement
                                  img.style.display = 'none'
                                  img.parentElement!.innerHTML = `
                                    <div class=\"w-full h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center\">\n      <div class=\"text-center text-neutral-500\">\n        <svg class=\"w-6 h-6 mx-auto mb-1\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4\" />\n        </svg>\n        <p class=\"text-xs\">No image</p>\n      </div>\n    </div>`
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3 h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                              <div className="text-center text-neutral-500">
                                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-xs">No image</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Link to={`/provider/${r.slug}`} className="font-medium flex items-center gap-2 cursor-pointer hover:underline">
                              <div className="font-medium flex items-center gap-2">
                                {r.name}
                                {isFeaturedProvider(r) && (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">Featured</span>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-2">
                              {r.coupon_code && r.coupon_discount && (
                                <div className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                                  {r.coupon_discount}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-neutral-500">
                                <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {r.rating?.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              {r.category_key.replace('-', ' ')}
                            </span>
                          </div>
                          <button onClick={() => setExpanded((e: Record<string, boolean>) => ({ ...e, [r.id]: !open }))} className="mt-2 text-sm rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5">{open ? 'Hide' : 'View'}</button>
                          <div className="collapsible mt-3 text-sm" data-open={open ? 'true' : 'false'}>
                              {r.isMember && d.reviews && d.reviews.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Reviews</div>
                                  <ul className="mt-1 space-y-1">
                                    {d.reviews.map((rv, idx) => (
                                      <li key={idx} className="text-neutral-700">
                                        <span className="text-neutral-500">{rv.author}</span> — <span className="flex items-center gap-1 inline-flex"><span>{rv.rating.toFixed(1)}</span><svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span> — {rv.text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.isMember && d.posts && d.posts.length > 0 && (
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
            <div className="mt-4 text-center">
              <p className="text-neutral-600">Loading the best {category?.name.toLowerCase() || 'providers'} for you...</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}


