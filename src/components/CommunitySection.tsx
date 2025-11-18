import { Link } from 'react-router-dom'
import ScrollFloat from './ScrollFloat'
import Container from './Container'

// Type definition for category keys (consistent with other components)
type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

/**
 * CommunitySection component - Community showcase section
 * 
 * Displays community blog cards with:
 * - ScrollFloat animation for the section title
 * - Grid layout of community blog cards
 * - Background images for each category
 * - Hover effects and styling
 * - Links to community blog pages
 * 
 * Used on the home page to showcase community content
 * with animated titles and interactive blog cards.
 */
export default function CommunitySection() {
  // Community blog cards data
  const cards = [
    { 
      category_key: 'restaurants-cafes' as CategoryKey, 
      title: 'Top 5 Restaurants This Month', 
      excerpt: 'Discover trending dining spots loved by Bonita locals.' 
    },
    { 
      category_key: 'home-services' as CategoryKey, 
      title: 'Bonita Home Service Deals', 
      excerpt: 'Seasonal offers from trusted local pros.' 
    },
    { 
      category_key: 'health-wellness' as CategoryKey, 
      title: 'Wellness Spotlight', 
      excerpt: 'Chiropractors, gyms, and med spas to try now.' 
    },
    { 
      category_key: 'real-estate' as CategoryKey, 
      title: 'Property Opportunities in Bonita', 
      excerpt: 'Latest properties and market highlights.' 
    },
    { 
      category_key: 'professional-services' as CategoryKey, 
      title: 'Top Professional Services of Bonita', 
      excerpt: 'Standout legal, accounting, and consulting pros.' 
    },
    { 
      category_key: 'retail' as CategoryKey, 
      title: 'Top Retail Shops of Bonita', 
      excerpt: 'Local shops and boutiques with unique finds.' 
    },
  ]

  return (
    <section className="py-6 md:py-8">
      <Container>
        <ScrollFloat
          animationDuration={1}
          ease='back.inOut(2)'
          scrollStart='center bottom+=50%'
          scrollEnd='bottom bottom-=40%'
          stagger={0.03}
          textClassName="text-2xl md:text-4xl font-semibold tracking-tight text-neutral-900 font-display"
        >
          Community Blogs
        </ScrollFloat>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => {
            // Background image mapping for each category
            const bgMap: Record<CategoryKey, string> = {
              'restaurants-cafes': "/images/community/restaurants-cafes.png",
              'home-services': "/images/community/home-services.png",
              'health-wellness': "/images/community/health-wellness.png",
              'real-estate': "/images/community/real-estate.png",
              'professional-services': "/images/community/professional-services.png",
              'retail': "/images/community/retail.png",
            }
            const bg = bgMap[c.category_key]
            
            return (
              <Link 
                key={c.title} 
                to={`/community/${c.category_key}`} 
                className="relative rounded-2xl overflow-hidden block hover:shadow-sm border border-white/40"
              >
                <img
                  src={bg}
                  alt={`${c.title} community blog background`}
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.onerror = null
                    img.src = `/images/community/${c.category_key}-fallback.png`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/60 via-transparent to-neutral-900/60" aria-hidden></div>
                <div className="relative z-10 p-4 min-h-[160px] flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-white">{c.title}</h3>
                    <div className="text-sm text-neutral-100 mt-1">{c.excerpt}</div>
                  </div>
                  <span className="mt-3 inline-block text-sm px-2 py-2 text-center full-w-bg self-center" style={{ color: 'white' }}>
                    Read more
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

// Export the CategoryKey type for consistency with other components
export type { CategoryKey }
