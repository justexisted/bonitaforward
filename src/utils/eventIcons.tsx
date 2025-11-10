import type { ComponentType } from 'react'
import { 
  Baby,
  Palette,
  Scissors,
  Ghost,
  Theater,
  UserSquare,
  Pencil,
  Heart,
  Music,
  BookOpen,
  Wrench,
  Users,
  Briefcase,
  GraduationCap,
  Dumbbell,
  UtensilsCrossed
} from 'lucide-react'

/**
 * EVENT ICONS UTILITY
 * 
 * Detects keywords in event titles and descriptions and returns appropriate icons.
 * Maximum of 2 icons per event.
 * 
 * Keywords and their icons:
 * - kids, toddler → Baby icon
 * - ceramics → Palette icon
 * - art → Palette icon
 * - textiles → Scissors icon
 * - halloween → Ghost icon
 * - actor → Theater icon
 * - live model → UserSquare icon
 * - drawing → Pencil icon
 * - support → Heart icon
 * - music → Music icon
 * - book → BookOpen icon
 * - workshop → Wrench icon
 */

export interface IconKeyword {
  keywords: string[]
  icon: ComponentType<{ className?: string }>
  label: string
}

// Icon keyword mappings
const ICON_MAPPINGS: IconKeyword[] = [
  {
    keywords: ['kids', 'toddler', 'children', 'child', 'family'],
    icon: Baby,
    label: 'Kids'
  },
  {
    keywords: ['ceramics', 'pottery', 'clay'],
    icon: Palette,
    label: 'Ceramics'
  },
  {
    keywords: ['art', 'painting', 'artistic', 'culture', 'cultural', 'gallery'],
    icon: Palette,
    label: 'Art'
  },
  {
    keywords: ['textiles', 'fabric', 'sewing'],
    icon: Scissors,
    label: 'Textiles'
  },
  {
    keywords: ['halloween', 'spooky', 'costume'],
    icon: Ghost,
    label: 'Halloween'
  },
  {
    keywords: ['actor', 'acting', 'theatre', 'theater', 'performance'],
    icon: Theater,
    label: 'Theater'
  },
  {
    keywords: ['live model', 'model', 'modeling'],
    icon: UserSquare,
    label: 'Live Model'
  },
  {
    keywords: ['drawing', 'sketch', 'draw'],
    icon: Pencil,
    label: 'Drawing'
  },
  {
    keywords: ['support', 'help', 'assistance', 'aid'],
    icon: Heart,
    label: 'Support'
  },
  {
    keywords: ['music', 'musical', 'concert', 'band', 'orchestra'],
    icon: Music,
    label: 'Music'
  },
  {
    keywords: ['book', 'reading', 'story', 'library'],
    icon: BookOpen,
    label: 'Book'
  },
  {
    keywords: ['workshop', 'class', 'training', 'seminar'],
    icon: Wrench,
    label: 'Workshop'
  },
  {
    // Category-based icons (ensures dropdown selections still render icons even if keywords are missing)
    keywords: ['community', 'neighborhood', 'residents', 'community meetup', 'community event'],
    icon: Users,
    label: 'Community'
  },
  {
    keywords: ['career', 'corporate', 'commerce', 'business'],
    icon: Briefcase,
    label: 'Business'
  },
  {
    keywords: ['graduation', 'campus', 'education', 'student', 'school'],
    icon: GraduationCap,
    label: 'Education'
  },
  {
    keywords: ['sport', 'sports', 'fitness', 'yoga', 'athletic', 'training session'],
    icon: Dumbbell,
    label: 'Sports'
  },
  {
    keywords: ['food', 'dining', 'culinary', 'cooking', 'tasting', 'restaurant'],
    icon: UtensilsCrossed,
    label: 'Food'
  }
]

/**
 * Detects keywords in text and returns matching icon mappings
 * Limits to 2 icons maximum
 */
export function detectEventIcons(title: string, description?: string | null, category?: string | null): IconKeyword[] {
  // Include category text so manual event submissions (which always have a category) still get icons
  const combinedText = `${title} ${description || ''} ${category || ''}`.toLowerCase()
  const matches: IconKeyword[] = []
  const seenLabels = new Set<string>()

  for (const mapping of ICON_MAPPINGS) {
    // Skip if we already have 2 icons
    if (matches.length >= 2) break
    
    // Skip if we already have this type of icon (avoid duplicates like art + ceramics both using Palette)
    if (seenLabels.has(mapping.label)) continue

    // Check if any keyword matches
    const hasMatch = mapping.keywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    )

    if (hasMatch) {
      matches.push(mapping)
      seenLabels.add(mapping.label)
    }
  }

  return matches
}

/**
 * Renders event icons as React components
 * 
 * @param title - Event title
 * @param description - Event description (optional)
 * @param className - Additional CSS classes for the icons
 * @param showLabel - Whether to show the label text below icons (default: false)
 */
interface EventIconsProps {
  title: string
  description?: string | null
  category?: string | null
  className?: string
  showLabel?: boolean
}

export function EventIcons({ title, description, category, className = 'w-5 h-5', showLabel = false }: EventIconsProps) {
  const icons = detectEventIcons(title, description, category)

  if (icons.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {icons.map((mapping, index) => {
        const IconComponent = mapping.icon
        return (
          <div key={index} className="flex flex-col items-center gap-1 relative group z-10 hover:z-50">
            <IconComponent 
              className={`${className} transition-colors group-hover:scale-110`} 
              aria-label={mapping.label}
            />
            {/* Hover Tooltip - appears below icon with high z-index to avoid being covered */}
            <div className="absolute top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100]">
              <div className="bg-neutral-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                {mapping.label}
                {/* Arrow pointing up */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-neutral-900"></div>
              </div>
            </div>
            {showLabel && (
              <span className="text-[10px] text-neutral-600">{mapping.label}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

