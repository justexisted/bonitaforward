import { useAuth } from '../contexts/AuthContext'

/**
 * EMAIL VERIFICATION BADGE COMPONENT
 * 
 * Displays a professional badge showing email verification status.
 * - Verified: Green badge with checkmark icon
 * - Unverified: Orange badge with warning icon
 * 
 * Uses professional monoline SVG icons (no emojis).
 */
export default function EmailVerificationBadge() {
  const auth = useAuth()

  // Only show badge if user is authenticated
  if (!auth.isAuthed) {
    return null
  }

  // Verified badge
  if (auth.emailVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <svg 
          className="w-3.5 h-3.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span>Verified</span>
      </span>
    )
  }

  // Unverified badge
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
      <svg 
        className="w-3.5 h-3.5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <span>Unverified</span>
    </span>
  )
}

