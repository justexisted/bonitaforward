import React from 'react'
import { Link } from 'react-router-dom'

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

/**
 * Footer component with contact information and links
 * 
 * Features:
 * - Copyright notice with dynamic year
 * - Business inquiry link
 * - Privacy policy and terms links
 * - Contact information (phone and email)
 * - Responsive design with proper spacing
 */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-100 bg-white">
      <div className="container-px mx-auto max-w-6xl py-8 text-xs text-neutral-500">
        <div className="flex flex-col items-center justify-between gap-4 p-4 text-center md:flex-row md:text-left">
          <div>© {new Date().getFullYear()} Bonita Forward — Community powered, locally focused.</div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/business" className="text-neutral-700 hover:text-neutral-900">📈 Have a Business?</Link>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Terms</a>
            <a href="/contact" className="text-neutral-700 hover:text-neutral-900">Contact</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="tel:+16197075351" className="text-neutral-700 hover:text-neutral-900">(619) 707-5351</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="mailto:bonitaforward@gmail.com" className="text-neutral-700 hover:text-neutral-900">bonitaforward@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
