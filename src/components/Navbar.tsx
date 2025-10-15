import React, { useEffect } from 'react'
import { useAuth, saveReturnUrl } from '../contexts/AuthContext'
import CardNav, { type CardNavItem } from './CardNav'

// ============================================================================
// ADMIN UTILITY FUNCTIONS
// ============================================================================

/**
 * Get list of admin emails from environment variable
 */
function getAdminList(): string[] {
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
}

/**
 * Check if a user email is in the admin list
 */
function isUserAdmin(email: string | undefined): boolean {
  if (!email) return false
  const adminList = getAdminList()
  return adminList.includes(email.toLowerCase())
}

// ============================================================================
// NAVBAR COMPONENT
// ============================================================================

/**
 * Navbar component with complex menu logic
 * 
 * Features:
 * - Dynamic navigation items based on user authentication and role
 * - Admin panel access for admin users
 * - Business-specific navigation for business users
 * - CTA button handling for sign up/account access
 * - Sign out functionality
 * - Responsive design with backdrop blur
 */
export default function Navbar() {
  const auth = useAuth()
  const isAdmin = isUserAdmin(auth.email)

  // Create navigation items based on user authentication and role
  const createNavItems = (): CardNavItem[] => {
    const baseItems: CardNavItem[] = [
      {
        label: "Discover",
        bgColor: "#0D0716",
        textColor: "#fff",
        links: [
          { label: "Home", href: "/", ariaLabel: "Home Page" },
          { label: "About", href: "/about", ariaLabel: "About Bonita Forward" },
          { label: "Community", href: "/community", ariaLabel: "Community Posts" },
          { label: "Calendar", href: "/calendar", ariaLabel: "Bonita Events Calendar" },
          { label: "Jobs", href: "/jobs", ariaLabel: "Job Listings" }
        ]
      },
      {
        label: "Business",
        bgColor: "#170D27",
        textColor: "#fff",
        links: [
          { label: "Have a Business?", href: "/business", ariaLabel: "Add Your Business" },
          ...(auth.isAuthed && auth.role === 'business' ? 
            [
              { label: "My Business", href: "/my-business", ariaLabel: "Manage My Business" },
              { label: "Pricing", href: "/pricing", ariaLabel: "View Pricing Plans" }
            ] : 
            []
          )
        ]
      }
    ]

    // Add authentication section based on user status
    if (auth.isAuthed) {
      // Authenticated users see Account section with sign out
      baseItems.push({
        label: "Account",
        bgColor: "#271E37",
        textColor: "#fff",
        links: [
          { label: "Account Settings", href: "/account", ariaLabel: "Account Settings" },
          ...(isAdmin ? 
            [{ label: "Admin Panel", href: "/admin", ariaLabel: "Admin Dashboard" }] : 
            []
          ),
          { label: "Sign Out", href: "#", ariaLabel: "Sign Out" }
        ]
      })
    } else {
      // Unauthenticated users see Auth section with sign in/sign up
      baseItems.push({
        label: "Auth",
        bgColor: "#271E37",
        textColor: "#fff",
        links: [
          { label: "Sign In", href: "/signin", ariaLabel: "Sign In" },
          { label: "Sign Up", href: "/signin?mode=signup", ariaLabel: "Sign Up" }
        ]
      })
    }

    return baseItems
  }

  // Handle CTA button click with useEffect
  useEffect(() => {
    const handleCtaClick = () => {
      if (!auth.isAuthed) {
        saveReturnUrl()
        // Redirect to sign up page instead of sign in
        window.location.href = '/signin?mode=signup'
      } else {
        window.location.href = '/account'
      }
    }

    // Add event listener to CTA button when component mounts
    const ctaButton = document.querySelector('.card-nav-cta-button')
    if (ctaButton) {
      ctaButton.addEventListener('click', handleCtaClick)
    }

    // Cleanup event listener on unmount
    return () => {
      if (ctaButton) {
        ctaButton.removeEventListener('click', handleCtaClick)
      }
    }
  }, [auth.isAuthed])

  // Handle sign out link click
  useEffect(() => {
    const handleSignOutClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && target.textContent === 'Sign Out') {
        e.preventDefault()
        auth.signOut()
      }
    }

    // Add event listener for sign out links
    document.addEventListener('click', handleSignOutClick)

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('click', handleSignOutClick)
    }
  }, [auth])

  return (
    <header className="relative z-40 bg-white/80 backdrop-blur border-b border-neutral-100 pt-2.5">
      <div className="relative">
        <CardNav
          logo="/images/top-left-logo.png"
          logoAlt="Bonita Forward Logo"
          items={createNavItems()}
          baseColor="#fff"
          menuColor="#000"
          buttonBgColor="#89D185"
          buttonTextColor="#000"
          ease="power3.out"
        />
      </div>
    </header>
  )
}
