// React import not needed for this component
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import GlareHover from './GlareHover'
import type { Category, CategoryKey } from '../types'

// Re-export types for backward compatibility
export type { Category, CategoryKey }

interface CategoryCardProps {
  cat: Category
}

/**
 * CategoryCard component - Reusable category display card
 * 
 * Displays a category with:
 * - GlareHover animation effect
 * - Category icon
 * - Category name and description
 * - Arrow indicator for navigation
 * - Clickable link to category page
 * 
 * Used on the home page to display business categories
 * with interactive hover effects and navigation.
 * 
 * @param cat - Category object containing key, name, description, and icon
 */
export default function CategoryCard({ cat }: CategoryCardProps) {
  return (
    <GlareHover
      width="auto"
      height="auto"
      background="#ffffff"
      glareColor="#999999"
      glareOpacity={0.3}
      glareAngle={-33}
      glareSize={300}
      transitionDuration={800}
      playOnce={false}
    >
      <Link to={`/category/${cat.key}`} className="block rounded-2xl bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-20 w-25 items-center justify-center rounded-2xl bg-neutral-50">
            <img 
              src={cat.icon} 
              alt={`${cat.name} icon`}
              className="h-20 w-25 object-contain"
            />
          </span>
          <div className="flex-1">
            <h3 className="font-medium text-neutral-900">{cat.name}</h3>
            <p className="text-sm text-neutral-600 mt-1">{cat.description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-neutral-400" />
        </div>
      </Link>
    </GlareHover>
  )
}
