/**
 * Provider Image Upload Component
 * 
 * Handles image upload and management for providers.
 * Supports single image for free accounts, multiple for featured.
 */

import type { ProviderRow } from '../../types/admin'

interface ProviderImageUploadProps {
  provider: ProviderRow
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (imageUrl: string) => void
  uploading: boolean
  disabled?: boolean
  accentColor?: 'neutral' | 'green'
}

/**
 * ProviderImageUpload Component
 * 
 * Displays current images with remove buttons
 * and file input for uploading new images.
 */
export default function ProviderImageUpload({
  provider,
  onUpload,
  onRemove,
  uploading,
  disabled = false,
  accentColor = 'neutral'
}: ProviderImageUploadProps) {
  const isFeatured = provider.is_member === true
  const maxImages = isFeatured ? 10 : 1
  const currentImageCount = provider.images?.length || 0
  const hasReachedLimit = currentImageCount >= maxImages
  
  // Color classes based on accent
  const colors = {
    neutral: {
      text: 'text-neutral-700',
      textSecondary: 'text-neutral-600',
      textSuccess: 'text-green-600',
      textWarning: 'text-amber-600',
      border: 'border-neutral-200',
      bgWarning: 'bg-amber-50',
      borderWarning: 'border-amber-200',
      textAmber: 'text-amber-800'
    },
    green: {
      text: 'text-green-700',
      textSecondary: 'text-green-600',
      textSuccess: 'text-green-600',
      textWarning: 'text-amber-600',
      border: 'border-green-200',
      bgWarning: 'bg-amber-50',
      borderWarning: 'border-amber-200',
      textAmber: 'text-amber-800'
    }
  }
  
  const colorClasses = colors[accentColor]

  return (
    <div>
      <h4 className={`text-md font-medium ${colorClasses.text} mb-4`}>
        Business Images
        {!isFeatured && (
          <span className={`text-sm ${colorClasses.textWarning} ml-2`}>(1 image for free accounts)</span>
        )}
        {isFeatured && (
          <span className={`text-sm ${colorClasses.textSuccess} ml-2`}>(Up to 10 images for featured accounts)</span>
        )}
      </h4>
      
      {/* Current Images Display */}
      {provider.images && provider.images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {provider.images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Business image ${index + 1}`}
                  className={`w-full h-24 object-cover rounded-lg border ${colorClasses.border}`}
                  onError={(e) => {
                    // Handle broken images
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EBroken%3C/text%3E%3C/svg%3E'
                  }}
                />
                <button
                  onClick={() => onRemove(imageUrl)}
                  disabled={disabled || uploading}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove image"
                  aria-label={`Remove image ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${colorClasses.text} mb-2`}>
            Upload Images
          </label>
          <input
            type="file"
            multiple={isFeatured}
            accept="image/*"
            onChange={onUpload}
            disabled={disabled || uploading || hasReachedLimit}
            className={`w-full text-sm ${colorClasses.textSecondary} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <p className={`text-xs ${colorClasses.textSecondary} mt-1`}>
            {isFeatured 
              ? 'Select multiple images (JPG, PNG, GIF). Max 5MB per image, up to 10 total.'
              : 'Select one image (JPG, PNG, GIF). Max 5MB.'
            }
          </p>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading images...
          </div>
        )}

        {/* Image Limit Warning */}
        {hasReachedLimit && (
          <div className={`p-3 ${colorClasses.bgWarning} border ${colorClasses.borderWarning} rounded-lg`}>
            <p className={`text-sm ${colorClasses.textAmber}`}>
              <strong>Image limit reached:</strong> {isFeatured ? 'Featured accounts can have up to 10 images.' : 'Free accounts can have 1 image.'} 
              {!isFeatured && ' Upgrade to featured to upload more images.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

