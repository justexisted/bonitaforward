import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLatestBlogPostByCategory, type BlogPost } from '../lib/supabaseData'

const categoryToTitle: Record<string, string> = {
  'restaurants-cafes': 'Top 5 Restaurants This Month',
  'home-services': 'Bonita Home Service Deals',
  'health-wellness': 'Wellness Spotlight',
  'real-estate': 'Property Opportunities in Bonita',
  'professional-services': 'Top Professional Services of Bonita',
}

export function CommunityIndex() {
  const cats = Object.keys(categoryToTitle)
  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {cats.map((ck) => (
            <div key={ck} className="rounded-2xl border border-neutral-100 p-5 bg-white">
              <div className="font-medium">{categoryToTitle[ck]}</div>
              <div className="mt-2 text-sm text-neutral-600">Read the latest post for this category.</div>
              <Link className="btn btn-secondary mt-3 inline-block" to={`/community/${ck}`}>Read more</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CommunityPost() {
  const params = useParams()
  const categoryKey = params.category as string
  const title = categoryToTitle[categoryKey] || 'Community Post'
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      const data = await fetchLatestBlogPostByCategory(categoryKey)
      if (cancelled) return
      setPost(data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [categoryKey])

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {loading && <div className="mt-3 text-sm text-neutral-600">Loading…</div>}
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <div className="prose mt-3">
              {post ? (
                <article>
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <div className="mt-1 text-xs text-neutral-500">{new Date(post.created_at).toLocaleString()}</div>
                  <div className="mt-3 whitespace-pre-wrap">{post.content}</div>
                </article>
              ) : (
                <div className="text-neutral-600 text-sm">No post yet for this category.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


