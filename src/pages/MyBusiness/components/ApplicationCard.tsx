import { Link } from 'react-router-dom'
import type { BusinessApplication } from '../types'

/**
 * APPLICATION CARD COMPONENT
 * 
 * Displays a single business application with basic information
 * and action button to request a free listing from the application.
 * 
 * Extracted from MyBusiness.tsx for better maintainability.
 */

interface ApplicationCardProps {
  application: BusinessApplication
  onRequestFreeListing: (applicationId: string) => void
}

export function ApplicationCard({ application, onRequestFreeListing }: ApplicationCardProps) {
  return (
    <div key={application.id} className="rounded-2xl border border-neutral-100 p-1 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{application.business_name}</h3>
          <p className="text-sm text-neutral-600 mt-1">{application.category}</p>
          <p className="text-sm text-neutral-600">{application.email} • {application.phone}</p>
          <p className="text-sm text-neutral-500 mt-2">
            Applied: {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRequestFreeListing(application.id)}
            className="rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-xs border border-green-200 hover:bg-green-100"
          >
            Request Free Listing
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * EMPTY STATE COMPONENT
 * Displayed when there are no applications
 */
export function ApplicationsEmptyState() {
  return (
    <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
      <h3 className="text-lg font-medium text-neutral-900">No Applications</h3>
      <p className="mt-2 text-neutral-600">You haven't submitted any business applications yet.</p>
      <Link 
        to="/business#apply" 
        className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
      >
        Apply for Business Listing
      </Link>
    </div>
  )
}

