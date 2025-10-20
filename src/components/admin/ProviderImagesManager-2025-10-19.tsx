import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER IMAGES MANAGER
 * 
 * Step 8 of gradual Admin.tsx extraction (FINAL STEP OF PHASE 2!)
 * Manages provider images upload, display, and deletion.
 * 
 * Features:
 * - Image upload (single for free, multiple for featured)
 * - Image preview grid
 * - Delete image functionality
 * - Image limit warnings
 * - Upload progress indicator
 * - Responsive grid layout
 * 
 * Limitations:
 * - Free accounts: 1 image max
 * - Featured accounts: 10 images max
 * - Max file size: 5MB per image
 * - Supported formats: JPG, PNG, GIF
 * 
 * Future enhancements:
 * - Drag-and-drop upload
 * - Image reordering (drag to reorder)
 * - Image cropping/resizing
 * - Bulk delete
 * - Image preview modal
 */

interface ProviderImagesManagerProps {
  provider: ProviderRow
  uploadingImages: boolean
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>, providerId: string) => void
  onImageRemove: (providerId: string, imageUrl: string) => void
}

export function ProviderImagesManager({ 
  provider,
  uploadingImages,
  onImageUpload,
  onImageRemove
}: ProviderImagesManagerProps) {
  const isFeatured = provider.is_member
  const currentImages = provider.images || []
  const maxImages = isFeatured ? 10 : 1
  const hasReachedLimit = currentImages.length >= maxImages

  return (
    <div>
      <h4 className="text-md font-medium text-neutral-800 mb-4">
        Business Images
        {!isFeatured && (
          <span className="text-sm text-amber-600 ml-2">(1 image for free accounts)</span>
        )}
        {isFeatured && (
          <span className="text-sm text-green-600 ml-2">(Up to 10 images for featured accounts)</span>
        )}
      </h4>
      
      {/* Current Images Display */}
      {currentImages.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Business image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => onImageRemove(provider.id, imageUrl)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  ×
                </button>
                
                {/* Image index badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded">
                  {index === 0 ? 'Logo' : `Image ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Upload Images
          </label>
          <input
            type="file"
            multiple={isFeatured === true}
            accept="image/*"
            onChange={(e) => onImageUpload(e, provider.id)}
            disabled={uploadingImages || hasReachedLimit}
            className="w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {isFeatured 
              ? 'Select multiple images (JPG, PNG, GIF). Max 5MB per image, up to 10 total.'
              : 'Select one image (JPG, PNG, GIF). Max 5MB.'
            }
          </p>
        </div>

        {/* Upload Progress */}
        {uploadingImages && (
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
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Image limit reached:</strong> {isFeatured ? 'Featured accounts can have up to 10 images.' : 'Free accounts can have 1 image.'} 
              {!isFeatured && ' Upgrade to featured to upload more images.'}
            </p>
          </div>
        )}

        {/* Empty State - No Images Yet */}
        {currentImages.length === 0 && (
          <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg text-center">
            <div className="text-4xl mb-2">📸</div>
            <p className="text-sm text-neutral-600 mb-1">No images uploaded yet</p>
            <p className="text-xs text-neutral-500">
              Upload {isFeatured ? 'up to 10 images' : 'an image'} to showcase your business
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

