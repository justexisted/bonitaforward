import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLatestBlogPostByCategory, type BlogPost } from '../lib/supabaseData'

const categoryToTitle: Record<string, string> = {
  'restaurants-cafes': 'Top 5 Restaurants This Month',
  'home-services': 'Bonita Home Service Deals',
  'health-wellness': 'Wellness & Beauty Spotlight',
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
            <div className="prose prose-neutral max-w-none mt-3">
              {post ? (
                <article>
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <div className="mt-1 text-xs text-neutral-500">{new Date(post.created_at).toLocaleString()}</div>
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


