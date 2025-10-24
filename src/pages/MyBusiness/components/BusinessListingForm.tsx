import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { BusinessListing, ImageUploadProgress } from '../types'


/**
 * ==================================================================================
 * 🔹 COMPONENT EXTRACTION MARKER - START: BusinessListingForm
 * ==================================================================================
 * 
 * TO EXTRACT THIS COMPONENT:
 * 1. Copy from this line down to the "END: BusinessListingForm" marker (line ~4676)
 * 2. Create new file: src/pages/MyBusiness/components/BusinessListingForm.tsx
 * 3. Add these imports at the top of the new file:
 *    ```
 *    import { useState, useEffect } from 'react'
 *    import { supabase } from '../../../lib/supabase'
 *    import type { BusinessListing, ImageUploadProgress } from '../types'
 *    ```
 * 4. Change 'function' to 'export function' in the component declaration below
 * 5. In MyBusiness.tsx, delete everything from START to END markers and add:
 *    ```
 *    import { BusinessListingForm } from './MyBusiness/components/BusinessListingForm'
 *    ```
 * 
 * COMPONENT INFO:
 * - Total Lines: ~1,480 lines (lines 3173-4669)
 * - Dependencies: useState, useEffect, supabase
 * - Props: { listing, onSave, onCancel, isUpdating }
 * 
 * ==================================================================================
 */

/**
 * BUSINESS LISTING FORM COMPONENT
 * 
 * This component provides a comprehensive form for creating and editing business listings.
 * It includes all the fields needed for both free and featured business listings.
 * 
 * Features:
 * - Basic business information (name, category, contact details)
 * - Business description and tags
 * - Social media links
 * - Service areas and specialties
 * - Business hours
 * - Image management
 * - Google Maps integration
 * - Booking system settings (for featured listings)
 */
export function BusinessListingForm({ 
    listing, 
    onSave, 
    onCancel,
    isUpdating = false
  }: { 
    listing: BusinessListing | null
    onSave: (data: Partial<BusinessListing>) => void
    onCancel: () => void
    isUpdating?: boolean
  }) {
    console.log('[BusinessListingForm] Rendering with listing:', listing?.id, listing?.name)
    
    const [formData, setFormData] = useState<Partial<BusinessListing>>({
      // Core business fields
      name: listing?.name || '',
      category_key: listing?.category_key || '',
      phone: listing?.phone || '',
      email: listing?.email || '',
      website: listing?.website || '',
      address: listing?.address || '',
      tags: listing?.tags || [],
      images: listing?.images || [],
      rating: listing?.rating || null,
      badges: listing?.badges || [],
      published: listing?.published || false,
      is_member: listing?.is_member || false,
      
      // Enhanced business management fields (now properly stored in database)
      description: listing?.description || '',
      specialties: listing?.specialties || [],
      social_links: listing?.social_links || {},
      business_hours: listing?.business_hours || {},
      service_areas: listing?.service_areas || [],
      google_maps_url: listing?.google_maps_url || '',
      bonita_resident_discount: listing?.bonita_resident_discount || '',
      
      // Coupon fields
      coupon_code: listing?.coupon_code || '',
      coupon_discount: listing?.coupon_discount || '',
      coupon_description: listing?.coupon_description || '',
      coupon_expires_at: listing?.coupon_expires_at || null,
      
      // Booking system fields
      booking_enabled: listing?.booking_enabled || false,
      booking_type: listing?.booking_type || null,
      booking_instructions: listing?.booking_instructions || '',
      booking_url: listing?.booking_url || '',
      enable_calendar_booking: listing?.enable_calendar_booking || false,
      enable_call_contact: listing?.enable_call_contact || false,
      enable_email_contact: listing?.enable_email_contact || false
    })
  
    // Restaurant tag options
    const restaurantTagOptions = {
      cuisine: [
        'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'French', 'Indian', 
        'Chinese', 'Japanese', 'Thai', 'Vietnamese', 'Korean', 'Middle Eastern', 'Latin American',
        'Seafood', 'Steakhouse', 'Vegetarian', 'Vegan', 'Fusion', 'Other'
      ],
      occasion: [
        'Casual', 'Family', 'Date', 'Business', 'Celebration', 'Quick Bite', 'Fine Dining',
        'Takeout', 'Delivery', 'Outdoor Seating', 'Group Friendly'
      ],
      priceRange: ['$', '$$', '$$$', '$$$$'],
      diningType: [
        'Dine-in', 'Takeout', 'Delivery', 'Drive-through', 'Counter Service', 
        'Full Service', 'Buffet', 'Café', 'Bar & Grill', 'Food Truck'
      ]
    }
  
    // Update form data when listing changes (important for after successful updates)
    useEffect(() => {
      if (listing) {
        setFormData({
          // Core business fields
          name: listing.name || '',
          category_key: listing.category_key || '',
          phone: listing.phone || '',
          email: listing.email || '',
          website: listing.website || '',
          address: listing.address || '',
          tags: listing.tags || [],
          images: listing.images || [],
          rating: listing.rating || null,
          badges: listing.badges || [],
          published: listing.published || false,
          is_member: listing.is_member || false,
          
          // Enhanced business management fields
          description: listing.description || '',
          specialties: listing.specialties || [],
          social_links: listing.social_links || {},
          business_hours: listing.business_hours || {},
          service_areas: listing.service_areas || [],
          google_maps_url: listing.google_maps_url || '',
          bonita_resident_discount: listing.bonita_resident_discount || '',
          
          // Coupon fields
          coupon_code: listing.coupon_code || '',
          coupon_discount: listing.coupon_discount || '',
          coupon_description: listing.coupon_description || '',
          coupon_expires_at: listing.coupon_expires_at || null,
          
          // Booking system fields
          booking_enabled: listing.booking_enabled || false,
          booking_type: listing.booking_type || null,
          booking_instructions: listing.booking_instructions || '',
          booking_url: listing.booking_url || '',
          enable_calendar_booking: listing.enable_calendar_booking || false,
          enable_call_contact: listing.enable_call_contact || false,
          enable_email_contact: listing.enable_email_contact || false
        })
      }
    }, [listing])
  
    // Initialize restaurant tags when listing changes or when editing existing listing
    useEffect(() => {
      if (listing?.tags && formData.category_key === 'restaurants-cafes') {
        const tags = listing.tags
        setRestaurantTags({
          cuisine: tags.find(tag => restaurantTagOptions.cuisine.includes(tag)) || '',
          occasion: tags.find(tag => restaurantTagOptions.occasion.includes(tag)) || '',
          priceRange: tags.find(tag => restaurantTagOptions.priceRange.includes(tag)) || '',
          diningType: tags.find(tag => restaurantTagOptions.diningType.includes(tag)) || ''
        })
      }
    }, [listing, formData.category_key])
  
    const [newTag, setNewTag] = useState('')
    const [newSpecialty, setNewSpecialty] = useState('')
    const [newServiceArea, setNewServiceArea] = useState('')
    const [newSocialPlatform, setNewSocialPlatform] = useState('')
    const [newSocialUrl, setNewSocialUrl] = useState('')
    
    // Restaurant-specific tag selections
    const [restaurantTags, setRestaurantTags] = useState({
      cuisine: '',
      occasion: '',
      priceRange: '',
      diningType: ''
    })
    
    // Image upload state management
    const [uploadingImages, setUploadingImages] = useState(false)
    const [imageUploadProgress, setImageUploadProgress] = useState<Record<string, number>>({})
  
    const categories = [
      { key: 'real-estate', name: 'Real Estate' },
      { key: 'home-services', name: 'Home Services' },
      { key: 'health-wellness', name: 'Health & Wellness' },
      { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
      { key: 'professional-services', name: 'Professional Services' }
    ]
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      // Prevent multiple submissions
      if (isUpdating) {
        console.log('[BusinessListingForm] Form submission blocked - update in progress')
        return
      }
      
      // Only send changed fields, not all form data
      const changes: Partial<BusinessListing> = {}
      
      // Compare each field with the original listing to find actual changes
      Object.entries(formData).forEach(([key, value]) => {
        const originalValue = listing ? (listing as any)[key] : null
        
        // Handle different data types
        if (Array.isArray(value) && Array.isArray(originalValue)) {
          // Compare arrays
          if (JSON.stringify(value.sort()) !== JSON.stringify(originalValue.sort())) {
            changes[key as keyof BusinessListing] = value as any
          }
        } else if (typeof value === 'object' && value !== null && typeof originalValue === 'object' && originalValue !== null) {
          // Compare objects
          if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
            changes[key as keyof BusinessListing] = value as any
          }
        } else if (value !== originalValue) {
          // Compare primitive values
          changes[key as keyof BusinessListing] = value as any
        }
      })
      
      console.log('[BusinessListingForm] Original listing data:', listing)
      console.log('[BusinessListingForm] Form data:', formData)
      console.log('[BusinessListingForm] Detected changes:', changes)
      console.log('[BusinessListingForm] Number of changed fields:', Object.keys(changes).length)
      
      // Only proceed if there are actual changes
      if (Object.keys(changes).length === 0) {
        console.log('[BusinessListingForm] No changes detected, skipping submission')
        return
      }
      
      onSave(changes)
    }
  
    const addTag = () => {
      if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag.trim()]
        }))
        setNewTag('')
      }
    }
  
    const removeTag = (tagToRemove: string) => {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
      }))
    }
  
    const addSpecialty = () => {
      if (newSpecialty.trim() && !formData.specialties?.includes(newSpecialty.trim())) {
        setFormData(prev => ({
          ...prev,
          specialties: [...(prev.specialties || []), newSpecialty.trim()]
        }))
        setNewSpecialty('')
      }
    }
  
    const removeSpecialty = (specialtyToRemove: string) => {
      setFormData(prev => ({
        ...prev,
        specialties: prev.specialties?.filter(specialty => specialty !== specialtyToRemove) || []
      }))
    }
  
    const addServiceArea = () => {
      if (newServiceArea.trim() && !formData.service_areas?.includes(newServiceArea.trim())) {
        setFormData(prev => ({
          ...prev,
          service_areas: [...(prev.service_areas || []), newServiceArea.trim()]
        }))
        setNewServiceArea('')
      }
    }
  
    const removeServiceArea = (areaToRemove: string) => {
      setFormData(prev => ({
        ...prev,
        service_areas: prev.service_areas?.filter(area => area !== areaToRemove) || []
      }))
    }
  
    // Handle restaurant tag updates
    const updateRestaurantTag = (type: keyof typeof restaurantTags, value: string) => {
      const oldValue = restaurantTags[type]
      
      setRestaurantTags(prev => ({
        ...prev,
        [type]: value
      }))
  
      // Remove old tag if it exists
      if (oldValue) {
        setFormData(prev => ({
          ...prev,
          tags: prev.tags?.filter(tag => tag !== oldValue) || []
        }))
      }
  
      // Add new tag if value is not empty
      if (value && !formData.tags?.includes(value)) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), value]
        }))
      }
    }
  
    const addSocialLink = () => {
      if (newSocialPlatform.trim() && newSocialUrl.trim()) {
        setFormData(prev => ({
          ...prev,
          social_links: {
            ...prev.social_links,
            [newSocialPlatform.trim()]: newSocialUrl.trim()
          }
        }))
        setNewSocialPlatform('')
        setNewSocialUrl('')
      }
    }
  
    const removeSocialLink = (platform: string) => {
      setFormData(prev => ({
        ...prev,
        social_links: Object.fromEntries(
          Object.entries(prev.social_links || {}).filter(([key]) => key !== platform)
        )
      }))
    }
  
    /**
     * IMAGE UPLOAD FUNCTIONS
     * 
     * These functions handle uploading images to Supabase Storage for business listings.
     * Images are stored in a 'business-images' bucket and organized by business ID.
     * 
     * SETUP REQUIRED:
     * 1. Create a 'business-images' bucket in Supabase Storage
     * 2. Set bucket to public for image display
     * 3. Configure RLS policies for authenticated users
     * 
     * Features:
     * - Multiple image upload support
     * - Progress tracking for each image
     * - Automatic image optimization and validation
     * - Secure file storage with proper naming conventions
     * - Image reordering and management
     */
    
    const uploadImage = async (file: File, businessId: string): Promise<string | null> => {
      try {
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select a valid image file')
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('Image size must be less than 5MB')
        }
  
        // Generate unique filename with timestamp and random string
        const fileExt = file.name.split('.').pop()
        const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        console.log('[BusinessListingForm] Uploading image:', fileName)
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
  
        if (error) {
          console.error('[BusinessListingForm] Image upload error:', error)
          
          // Handle specific bucket not found error
          if (error.message.includes('Bucket not found')) {
            throw new Error('Image storage not yet configured. Please contact support to set up image uploads.')
          }
          
          throw new Error(`Failed to upload image: ${error.message}`)
        }
  
        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName)
  
        console.log('[BusinessListingForm] Image uploaded successfully:', urlData.publicUrl)
        return urlData.publicUrl
        
      } catch (error: any) {
        console.error('[BusinessListingForm] Image upload failed:', error)
        throw error
      }
    }
  
    const handleImageUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) return
  
      // Check image limit for free accounts
      if (!formData.is_member) {
        const currentImageCount = formData.images?.length || 0
        if (currentImageCount >= 1) {
          alert('Free accounts are limited to 1 image. Upgrade to Featured to add multiple images.')
          return
        }
        
        // If trying to upload multiple files, only take the first one
        if (files.length > 1) {
          alert('Free accounts can only upload 1 image. Only the first image will be uploaded.')
        }
      }
  
      const businessId = listing?.id || 'new-listing'
      setUploadingImages(true)
      
      try {
        // For free accounts, only process the first file
        const filesToProcess = !formData.is_member ? [files[0]] : Array.from(files)
        const uploadPromises = filesToProcess.map(async (file, index) => {
          const fileId = `${file.name}-${index}`
          
          // Track upload progress
          setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
          
          try {
            const imageUrl = await uploadImage(file, businessId)
            return imageUrl
          } catch (error: any) {
            console.error(`[BusinessListingForm] Failed to upload ${file.name}:`, error)
            
            // Show user-friendly error message for storage setup issues
            if (error.message.includes('Image storage not yet configured')) {
              alert('Image uploads are not yet available. Please contact support to enable this feature.')
            } else {
              alert(`Failed to upload ${file.name}: ${error.message}`)
            }
            
            return null
          } finally {
            // Remove progress tracking
            setImageUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }
        })
  
        const uploadedUrls = await Promise.all(uploadPromises)
        const successfulUrls = uploadedUrls.filter(url => url !== null) as string[]
        
        if (successfulUrls.length > 0) {
          // Add new images to existing images
          const currentImages = formData.images || []
          setFormData(prev => ({
            ...prev,
            images: [...currentImages, ...successfulUrls]
          }))
          
          console.log('[BusinessListingForm] Successfully uploaded', successfulUrls.length, 'images')
        }
        
      } catch (error: any) {
        console.error('[BusinessListingForm] Image upload process failed:', error)
      } finally {
        setUploadingImages(false)
      }
    }
  
    const removeImage = (imageUrl: string) => {
      setFormData(prev => ({
        ...prev,
        images: prev.images?.filter(img => img !== imageUrl) || []
      }))
    }
  
    const moveImage = (fromIndex: number, toIndex: number) => {
      if (!formData.images) return
      
      const newImages = [...formData.images]
      const [movedImage] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, movedImage)
      
      setFormData(prev => ({
        ...prev,
        images: newImages
      }))
    }
  
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 pointer-events-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {listing ? 'Edit Business Listing' : 'Create New Business Listing'}
              </h2>
              <button
                onClick={onCancel}
                className="text-neutral-500 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
  
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category_key || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_key: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.name}</option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="https://example.com"
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="123 Main St, Bonita, CA"
                  />
                </div>
              </div>
  
              {/* Business Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Business Description
                  {/* Show character limit info based on plan tier */}
                  <span className="text-xs text-neutral-500 ml-2">
                    ({formData.description?.length || 0}/{formData.is_member ? '500' : '200'} characters)
                  </span>
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => {
                    const newDescription = e.target.value
                    
                    // For free plans, enforce 200 character limit
                    if (!formData.is_member && newDescription.length > 200) {
                      // Don't update the form data if it exceeds the limit for free plans
                      return
                    }
                    
                    setFormData(prev => ({ ...prev, description: newDescription }))
                  }}
                  rows={4}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                    // Show red border if free plan exceeds 200 characters
                    !formData.is_member && (formData.description?.length || 0) > 200
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-neutral-300 focus:ring-neutral-500'
                  }`}
                  placeholder="Tell customers about your business..."
                  maxLength={formData.is_member ? 500 : 200} // Set maxLength based on plan
                />
                
                {/* Character limit warning for free plans */}
                {!formData.is_member && (formData.description?.length || 0) > 200 && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Character Limit Exceeded
                        </h3>
                        <div className="mt-1 text-sm text-red-700">
                          <p>
                            Free listings are limited to 200 characters for business descriptions. 
                            You have {(formData.description?.length || 0) - 200} characters over the limit.
                          </p>
                          <p className="mt-1">
                            <strong>Upgrade to Featured</strong> to get up to 500 characters for your description.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Character limit info for featured plans */}
                {formData.is_member && (formData.description?.length || 0) > 400 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      You're approaching the 500 character limit for featured listings. 
                      {(formData.description?.length || 0)}/500 characters used.
                    </p>
                  </div>
                )}
              </div>
  
              {/* Exclusive Coupon Settings - Featured Accounts Only */}
              <div className={`border-2 border-green-200 rounded-xl p-4 bg-green-50 ${!formData.is_member ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎟️</span>
                  <h3 className="text-sm font-semibold text-green-900">Exclusive Coupon for Bonita Forward Users</h3>
                  {!formData.is_member && (
                    <span className="text-xs text-amber-600 ml-2">
                      (Featured accounts only)
                    </span>
                  )}
                </div>
                
                {/* Free account restriction notice */}
                {!formData.is_member && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-900">Featured Accounts Only</p>
                        <p className="text-xs text-amber-800 mt-1">
                          Upgrade to a Featured account to create exclusive coupons for Bonita Forward users. Coupons appear prominently on your business page and help drive more customers to your business!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-green-800 mb-4">
                  Offer a special coupon that users can save to their account. This appears prominently on your business page!
                </p>
                
                <div className="space-y-3">
                  {/* Coupon Code */}
                  <div>
                    <label className="block text-sm font-medium text-green-900 mb-1">
                      Coupon Code <span className="text-xs text-green-700">(e.g., BONITA10, COMMUNITY15)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.coupon_code || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                      className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      placeholder="BONITA10"
                      maxLength={20}
                      disabled={!formData.is_member}
                    />
                  </div>
  
                  {/* Coupon Discount */}
                  <div>
                    <label className="block text-sm font-medium text-green-900 mb-1">
                      Discount Amount <span className="text-xs text-green-700">(e.g., 10% off, $20 off)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.coupon_discount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_discount: e.target.value }))}
                      className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      placeholder="10% off entire service"
                      maxLength={50}
                      disabled={!formData.is_member}
                    />
                  </div>
  
                  {/* Coupon Description */}
                  <div>
                    <label className="block text-sm font-medium text-green-900 mb-1">
                      Coupon Details <span className="text-xs text-green-700">(Optional - any terms or conditions)</span>
                    </label>
                    <textarea
                      value={formData.coupon_description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_description: e.target.value }))}
                      className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white resize-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      placeholder="Valid for first-time customers only. Cannot be combined with other offers."
                      rows={2}
                      maxLength={200}
                      disabled={!formData.is_member}
                    />
                  </div>
  
                  {/* Coupon Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-green-900 mb-1">
                      Expiration Date <span className="text-xs text-green-700">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.coupon_expires_at ? new Date(formData.coupon_expires_at).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        coupon_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                      }))}
                      className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      disabled={!formData.is_member}
                    />
                  </div>
  
                  <div className="bg-white rounded-lg p-3 border border-green-300">
                    <p className="text-xs text-green-800">
                      <strong>💡 Tip:</strong> Set both Coupon Code and Discount Amount to activate the coupon feature. 
                      Users will see a prominent green banner on your page and can save the coupon to their account!
                    </p>
                  </div>
                </div>
              </div>
  
              {/* Business Images */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Business Images
                  {!formData.is_member && (
                    <span className="text-xs text-amber-600 ml-2">
                      (1 image for free accounts)
                    </span>
                  )}
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                  Upload images to showcase your business. Images will appear in search results and on your business page.
                  {!formData.is_member && (
                    <span className="text-amber-600 font-medium"> Free accounts are limited to 1 image. Upgrade to Featured for multiple images.</span>
                  )}
                </p>
                
                {/* Free account image limit notice */}
                {!formData.is_member && formData.images && formData.images.length >= 1 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Image Limit Reached</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Free accounts can upload 1 image. Upgrade to Featured to add multiple images and showcase your business better.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Storage Setup Notice */}
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Image Storage Setup Required</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Image uploads require Supabase Storage to be configured. Contact support to enable this feature.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImages || (!formData.is_member && (formData.images?.length || 0) >= 1)}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer ${
                      uploadingImages || (!formData.is_member && (formData.images?.length || 0) >= 1) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-neutral-600">
                        {uploadingImages ? 'Uploading images...' : 'Click to upload images or drag and drop'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        PNG, JPG, GIF up to 5MB each
                      </p>
                    </div>
                  </label>
                </div>
  
                {/* Current Images Display */}
                {formData.images && formData.images.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {formData.images.map((imageUrl, index) => (
                        <div key={imageUrl} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Business image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                          />
                          
                          {/* Image Actions Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              {/* Move Left Button */}
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index - 1)}
                                  className="p-1 bg-white rounded-full text-neutral-600 hover:text-neutral-800"
                                  title="Move left"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                              )}
                              
                              {/* Move Right Button */}
                              {index < formData.images!.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index + 1)}
                                  className="p-1 bg-white rounded-full text-neutral-600 hover:text-neutral-800"
                                  title="Move right"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                              
                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeImage(imageUrl)}
                                className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                title="Remove image"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Image Order Indicator */}
                          <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-neutral-500 mt-2">
                      Drag to reorder images. The first image will be used as the main image in search results.
                    </p>
                  </div>
                )}
  
                {/* Upload Progress */}
                {Object.keys(imageUploadProgress).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                      <div key={fileId} className="text-xs text-neutral-600">
                        Uploading {fileId}... {progress}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
  
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tags
                </label>
                
                {/* Conditional restaurant tag guidance */}
                {formData.category_key === 'restaurants-cafes' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">
                      🍽️ Restaurant Tags - Help customers find you!
                    </h4>
                    <p className="text-xs text-blue-700 mb-4">
                      Select your restaurant characteristics below. These will be automatically added as tags to help customers discover your business.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cuisine Type */}
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          Cuisine Type *
                        </label>
                        <select
                          value={restaurantTags.cuisine}
                          onChange={(e) => updateRestaurantTag('cuisine', e.target.value)}
                          className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select cuisine type</option>
                          {restaurantTagOptions.cuisine.map(cuisine => (
                            <option key={cuisine} value={cuisine}>{cuisine}</option>
                          ))}
                        </select>
                      </div>
  
                      {/* Occasion */}
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          Best For *
                        </label>
                        <select
                          value={restaurantTags.occasion}
                          onChange={(e) => updateRestaurantTag('occasion', e.target.value)}
                          className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select occasion</option>
                          {restaurantTagOptions.occasion.map(occasion => (
                            <option key={occasion} value={occasion}>{occasion}</option>
                          ))}
                        </select>
                      </div>
  
                      {/* Price Range */}
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          Price Range *
                        </label>
                        <select
                          value={restaurantTags.priceRange}
                          onChange={(e) => updateRestaurantTag('priceRange', e.target.value)}
                          className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select price range</option>
                          {restaurantTagOptions.priceRange.map(price => (
                            <option key={price} value={price}>
                              {price} {price === '$' ? 'Budget-friendly' : price === '$$' ? 'Moderate' : price === '$$$' ? 'Upscale' : 'Fine dining'}
                            </option>
                          ))}
                        </select>
                      </div>
  
                      {/* Dining Type */}
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          Dining Type *
                        </label>
                        <select
                          value={restaurantTags.diningType}
                          onChange={(e) => updateRestaurantTag('diningType', e.target.value)}
                          className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select dining type</option>
                          {restaurantTagOptions.diningType.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
  
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder={formData.category_key === 'restaurants-cafes' ? "Add additional tags..." : "Add a tag..."}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-neutral-500 hover:text-neutral-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
  
              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Specialties
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="Add a specialty..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={addSpecialty}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties?.map(specialty => (
                    <span
                      key={specialty}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
  
              {/* Service Areas */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Areas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newServiceArea}
                    onChange={(e) => setNewServiceArea(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="Add a service area..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                  />
                  <button
                    type="button"
                    onClick={addServiceArea}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.service_areas?.map(area => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeServiceArea(area)}
                        className="text-green-500 hover:text-green-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
  
              {/* Social Media Links */}
              <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Social Media Links
                  {!formData.is_member && (
                    <span className="text-xs text-amber-600 ml-2">
                      (Featured accounts only)
                    </span>
                  )}
                </label>
                
                {/* Free account restriction notice */}
                {!formData.is_member && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Social Media Links - Featured Accounts Only</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Upgrade to Featured to add your social media profiles and increase your online presence.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    value={newSocialPlatform}
                    onChange={(e) => setNewSocialPlatform(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="Platform (e.g., Facebook)"
                    disabled={!formData.is_member}
                  />
                  <input
                    type="url"
                    value={newSocialUrl}
                    onChange={(e) => setNewSocialUrl(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    placeholder="URL"
                    disabled={!formData.is_member}
                  />
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!formData.is_member}
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {Object.entries(formData.social_links || {}).map(([platform, url]) => (
                    <div key={platform} className="flex items-center justify-between bg-neutral-50 p-2 rounded">
                      <span className="text-sm">
                        <strong>{platform}:</strong> {url}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSocialLink(platform)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.is_member}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
  
              {/* Booking System - with Toggle Switch */}
              <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Booking System
                  {!formData.is_member && (
                    <span className="text-xs text-amber-600 ml-2">
                      (Featured accounts only)
                    </span>
                  )}
                </label>
                
                {/* Free account restriction notice */}
                {!formData.is_member && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Booking System - Featured Accounts Only</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Upgrade to Featured to enable direct appointment booking and scheduling for your customers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Toggle Switch for Enable Booking */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-800">
                        Online Booking System
                      </span>
                      {formData.booking_enabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      {formData.booking_enabled 
                        ? 'Customers can book appointments through your listing'
                        : 'Enable to allow customers to book appointments online'
                      }
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.is_member) return
                      setFormData(prev => ({ ...prev, booking_enabled: !prev.booking_enabled }))
                    }}
                    disabled={!formData.is_member}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.booking_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                    }`}
                    aria-label="Toggle booking system"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.booking_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Booking fields - only show when enabled */}
                {formData.booking_enabled && (
                  <div className="space-y-3 mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Booking Type
                      </label>
                      <select
                        value={formData.booking_type || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, booking_type: e.target.value as any || null }))}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!formData.is_member}
                      >
                        <option value="">Select booking type...</option>
                        <option value="appointment">Appointment</option>
                        <option value="reservation">Reservation</option>
                        <option value="consultation">Consultation</option>
                        <option value="walk-in">Walk-in Only</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Booking Instructions
                      </label>
                      <textarea
                        value={formData.booking_instructions || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, booking_instructions: e.target.value }))}
                        placeholder="e.g., Call ahead for same-day appointments, Book at least 24 hours in advance..."
                        rows={3}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!formData.is_member}
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Instructions shown to customers when they try to book
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        External Booking URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={formData.booking_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, booking_url: e.target.value }))}
                        placeholder="https://calendly.com/yourbusiness"
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!formData.is_member}
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Link to your external booking platform (Calendly, etc.)
                      </p>
                    </div>
  
                    {/* Contact Method Toggles */}
                    <div className="border-t border-blue-200 pt-3 mt-3">
                      <h4 className="text-sm font-medium text-neutral-800 mb-3">Contact Methods</h4>
                      <p className="text-xs text-neutral-600 mb-3">
                        Choose which contact methods customers can use to reach you
                      </p>
                      
                      <div className="space-y-3">
                        {/* Calendar Booking Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-800">
                                Integrated Calendar Booking
                              </span>
                              {formData.enable_calendar_booking && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1">
                              Allow customers to book directly through your connected Google Calendar
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!formData.is_member) return
                              setFormData(prev => ({ ...prev, enable_calendar_booking: !prev.enable_calendar_booking }))
                            }}
                            disabled={!formData.is_member}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              formData.enable_calendar_booking ? 'bg-blue-600' : 'bg-neutral-300'
                            }`}
                            aria-label="Toggle calendar booking"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.enable_calendar_booking ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
  
                        {/* Call Contact Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-800">
                                Phone Call Contact
                              </span>
                              {formData.enable_call_contact && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1">
                              Show your phone number so customers can call you directly
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!formData.is_member) return
                              setFormData(prev => ({ ...prev, enable_call_contact: !prev.enable_call_contact }))
                            }}
                            disabled={!formData.is_member}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              formData.enable_call_contact ? 'bg-blue-600' : 'bg-neutral-300'
                            }`}
                            aria-label="Toggle call contact"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.enable_call_contact ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
  
                        {/* Email Contact Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-800">
                                Email Contact
                              </span>
                              {formData.enable_email_contact && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1">
                              Show your email address so customers can contact you via email
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!formData.is_member) return
                              setFormData(prev => ({ ...prev, enable_email_contact: !prev.enable_email_contact }))
                            }}
                            disabled={!formData.is_member}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              formData.enable_email_contact ? 'bg-blue-600' : 'bg-neutral-300'
                            }`}
                            aria-label="Toggle email contact"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.enable_email_contact ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
  
  
              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`flex-1 px-6 py-2 rounded-lg flex items-center justify-center ${
                    isUpdating 
                      ? 'bg-neutral-400 text-white cursor-not-allowed' 
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {listing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    listing ? 'Update Listing' : 'Create Listing'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isUpdating}
                  className={`px-6 py-2 border rounded-lg ${
                    isUpdating 
                      ? 'border-neutral-300 text-neutral-400 cursor-not-allowed' 
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {isUpdating ? 'Please Wait...' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  /**
   * ==================================================================================
   * 🔹 COMPONENT EXTRACTION MARKER - END: BusinessListingForm
   * ==================================================================================
   * Copy everything from "START: BusinessListingForm" to here (line above this comment)
   * ==================================================================================
   */
  
  
  /**
   * ==================================================================================
   * 🔹 COMPONENT EXTRACTION MARKER - START: JobPostForm
   * ==================================================================================
   * 
   * TO EXTRACT THIS COMPONENT:
   * 1. Copy from this line down to the "END: JobPostForm" marker
   * 2. Create new file: src/pages/MyBusiness/components/JobPostForm.tsx
   * 3. Add these imports at the top of the new file:
   *    ```
   *    import { useState } from 'react'
   *    import type { BusinessListing, JobPost } from '../types'
   *    ```
   * 4. Change 'function' to 'export function' in the component declaration
   * 5. In MyBusiness.tsx, replace this entire section with:
   *    ```
   *    import { JobPostForm } from './MyBusiness/components/JobPostForm'
   *    ```
   * 
   * COMPONENT INFO:
   * - Lines: ~170 lines
   * - Dependencies: useState
   * - Props: { listings, editingJob, onSave, onCancel }
   * 
   * ==================================================================================
   */