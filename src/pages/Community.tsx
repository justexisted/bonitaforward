import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBlogPostsByCategory, type BlogPost } from '../lib/supabaseData'
import { ArrowLeft, ArrowRight, Home } from 'lucide-react'

const categoryToTitle: Record<string, string> = {
  'restaurants-cafes': 'Top 5 Restaurants This Month',
  'home-services': 'Bonita Home Service Deals',
  'health-wellness': 'Wellness & Beauty Spotlight',
  'real-estate': 'Property Opportunities in Bonita',
  'professional-services': 'Top Professional Services of Bonita',
}

export function CommunityIndex() {
  const cats = Object.keys(categoryToTitle)
  const [blogPosts, setBlogPosts] = useState<Record<string, BlogPost[]>>({})
  const [loading, setLoading] = useState(true)
  
  // Image mapping for each category
  const categoryImages: Record<string, string> = {
    'restaurants-cafes': '/images/community/restaurants-cafes.png',
    'home-services': '/images/community/home-services.png',
    'health-wellness': '/images/community/health-wellness.png',
    'real-estate': '/images/community/real-estate.png',
    'professional-services': '/images/community/professional-services.png',
  }

  // Fetch blog posts for all categories
  useEffect(() => {
    let cancelled = false
    const fetchAllPosts = async () => {
      setLoading(true)
      const postsByCategory: Record<string, BlogPost[]> = {}
      
      for (const category of cats) {
        try {
          const posts = await fetchBlogPostsByCategory(category)
          if (!cancelled) {
            postsByCategory[category] = posts
          }
        } catch (error) {
          console.warn(`Failed to fetch posts for ${category}:`, error)
          if (!cancelled) {
            postsByCategory[category] = []
          }
        }
      }
      
      if (!cancelled) {
        setBlogPosts(postsByCategory)
        setLoading(false)
      }
    }
    
    fetchAllPosts()
    return () => { cancelled = true }
  }, [])
  
  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight font-display">Community Blogs</h1>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {cats.map((ck) => {
            const imageUrl = categoryImages[ck]
            const posts = blogPosts[ck] || []
            const latestPost = posts[0] // Most recent post
            
            return (
              <Link key={ck} to={`/community/${ck}`} className="block">
                {/* Mobile: Full image background with overlay */}
                <div className="md:hidden relative rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-48 object-cover scale-115 -translate-x-5"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement
                      img.src = `https://picsum.photos/seed/${ck}/800/400`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-neutral-900/20 to-transparent" aria-hidden></div>
                  <div className="absolute top-0 left-0 right-0 p-4 text-white">
                    <div className="font-medium text-2xl font-display p-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{categoryToTitle[ck]}</div>
                    {loading ? (
                      <div className="text-sm text-neutral-200" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Loading posts...</div>
                    ) : latestPost ? (
                      <div className="text-sm text-neutral-200">
                        <div className="font-medium text-medium p-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{latestPost.title}</div>
                        <div className="text-xs text-neutral-300 p-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {new Date(latestPost.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-200 mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>No posts yet for this category.</div>
                    )}
                    <span className="mt-2 inline-block text-sm text-white font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Read more →</span>
                  </div>
                </div>

                {/* Desktop: Half image, half content */}
                <div className="hidden md:flex rounded-2xl border border-neutral-100 bg-white overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="w-1/2 relative">
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full h-full object-cover scale-115 -translate-x-5"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement
                        img.src = `https://picsum.photos/seed/${ck}/800/400`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/20 via-transparent to-transparent" aria-hidden></div>
                  </div>
                  <div className="w-1/2 p-6 flex flex-col justify-between">
                    <div>
                      <div className="font-medium text-2xl font-display p-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{categoryToTitle[ck]}</div>
                      {loading ? (
                        <div className="text-sm text-neutral-600 mt-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>Loading posts...</div>
                      ) : latestPost ? (
                        <div className="text-sm text-neutral-600 mt-2">
                          <div className="font-medium text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{latestPost.title}</div>
                          <div className="text-xs text-neutral-500 mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            {new Date(latestPost.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-600 mt-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>No posts yet for this category.</div>
                      )}
                    </div>
                    <span className="mt-4 inline-block text-sm" style={{ color: '#7070e3', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>Read more</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function CommunityPost() {
  const params = useParams()
  const categoryKey = params.category as string
  const title = categoryToTitle[categoryKey] || 'Community Post'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get all category keys for navigation
  const allCategories = Object.keys(categoryToTitle)
  const currentIndex = allCategories.indexOf(categoryKey)
  const prevCategory = currentIndex > 0 ? allCategories[currentIndex - 1] : null
  const nextCategory = currentIndex < allCategories.length - 1 ? allCategories[currentIndex + 1] : null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      const data = await fetchBlogPostsByCategory(categoryKey)
      if (cancelled) return
      setPosts(data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [categoryKey])

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        {/* Top Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Link 
            to="/community" 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Blog
          </Link>
          
          <div className="flex items-center gap-2">
            {prevCategory && (
              <Link 
                to={`/community/${prevCategory}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Link>
            )}
            {nextCategory && (
              <Link 
                to={`/community/${nextCategory}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {loading && <div className="mt-3 text-sm text-neutral-600">Loading…</div>}
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <div className="prose prose-neutral max-w-none mt-3 space-y-8">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <article key={post.id}>
                    <h2 className="text-xl font-semibold">{post.title}</h2>
                    <div className="mt-1 text-xs text-neutral-500">{new Date(post.created_at).toLocaleString()}</div>
                    
                    {/* Display images if they exist */}
                    {post.images && post.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {post.images.map((imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Blog image ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-neutral-200"
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-3">
                      {containsHtml(post.content) ? (
                        <div
                          className="bf-post-content space-y-4 [&>p]:my-3 [&>div]:my-3 [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:mt-5 [&>h3]:mb-2 [&_br]:block [&_br]:h-4"
                          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
                        />
                      ) : (
                        <div className="space-y-2">{renderStyledContent(post.content)}</div>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="text-neutral-600 text-sm">No post yet for this category.</div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Link 
            to="/community" 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Blog
          </Link>
          
          <div className="flex items-center gap-2">
            {prevCategory && (
              <Link 
                to={`/community/${prevCategory}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Link>
            )}
            {nextCategory && (
              <Link 
                to={`/community/${nextCategory}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function renderStyledContent(content: string) {
  const labelPatterns = [/^The vibe:/i, /^Why it makes the list:/i, /^What to order:/i]
  const lines = content.split(/\r?\n/)
  return lines.map((line, idx) => {
    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (numbered) {
      const num = numbered[1]
      const rest = numbered[2]
      return (
        <div key={idx} className="mt-4">
          <div className="text-lg sm:text-xl font-semibold">{num}. {rest}</div>
        </div>
      )
    }
    // Bold known labels at start of line
    for (const pat of labelPatterns) {
      if (pat.test(line)) {
        const [label, body] = [line.match(pat)![0], line.replace(pat, '').trimStart()]
        return (
          <div key={idx} className="text-sm text-neutral-800">
            <span className="font-semibold">{label} </span>
            <span>{body}</span>
          </div>
        )
      }
    }
    // Default paragraph
    return (
      <div key={idx} className="text-sm text-neutral-800 whitespace-pre-wrap">{line}</div>
    )
  })
}

function containsHtml(text: string): boolean {
  return /<\w|&[a-zA-Z]+;/.test(text)
}

function sanitizePostHtml(html: string): string {
  try {
    const d = document.implementation.createHTMLDocument('bf')
    d.body.innerHTML = html
    // Remove script/style
    d.body.querySelectorAll('script,style,link,iframe').forEach((n) => n.remove())
    // Whitelist attributes
    d.body.querySelectorAll('*').forEach((el) => {
      ;[...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase()
        const value = attr.value
        const ok = (
          name === 'style' ||
          name === 'class' ||
          name === 'href' ||
          name === 'src' ||
          name === 'alt'
        )
        if (!ok) el.removeAttribute(name)
        if (name === 'href' && value && !value.startsWith('/') && !value.startsWith('http')) el.removeAttribute('href')
      })
    })
    // Keep author-entered breaks; do not normalize here to preserve caret behavior in editor
    // Enforce typographic defaults for inline styles
    d.body.querySelectorAll('[style]')
      .forEach((el) => {
        const style = (el.getAttribute('style') || '').toLowerCase()
        // allow only font-size, font-weight, font-style, text-decoration, color
        const allowed = style
          .split(';')
          .map((s) => s.trim())
          .filter((s) => /^(font-size|font-weight|font-style|text-decoration|color)\s*:/i.test(s))
          .join('; ')
        if (allowed) el.setAttribute('style', allowed)
        else el.removeAttribute('style')
      })
    return d.body.innerHTML
  } catch {
    return html
  }
}


