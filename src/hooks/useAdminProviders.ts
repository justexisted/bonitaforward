/**
 * Admin Providers Hook
 * 
 * Comprehensive hook for managing providers in the admin panel.
 * Handles CRUD operations, image uploads, featured status, and more.
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProviderRow } from '../types/admin'

// Category options for provider categorization
export const CATEGORY_OPTIONS = [
  { key: 'real-estate', name: 'Real Estate' },
  { key: 'home-services', name: 'Home Services' },
  { key: 'health-wellness', name: 'Health & Wellness' },
  { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
  { key: 'professional-services', name: 'Professional Services' },
] as const

export function useAdminProviders() {
  // State management
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [savingProvider, setSavingProvider] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [retryProvider, setRetryProvider] = useState<ProviderRow | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  
  // New provider creation state
  const [isCreatingNewProvider, setIsCreatingNewProvider] = useState(false)
  const [newProviderForm, setNewProviderForm] = useState<Partial<ProviderRow>>({
    name: '',
    category_key: 'professional-services',
    tags: [],
    badges: [],
    rating: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    images: [],
    owner_user_id: null,
    is_member: false,
    is_featured: false,
    featured_since: null,
    subscription_type: null,
    description: null,
    specialties: null,
    social_links: null,
    business_hours: null,
    service_areas: null,
    google_maps_url: null,
    bonita_resident_discount: null,
    published: true,
    created_at: null,
    updated_at: null,
    booking_enabled: false,
    booking_type: null,
    booking_instructions: null,
    booking_url: null
  })

  /**
   * Load all providers from database
   * Orders by name ascending
   */
  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setProviders(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('[useAdminProviders] Error loading providers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Save provider (create or update)
   * Handles both new providers and updates to existing ones
   */
  const saveProvider = useCallback(async (provider: ProviderRow) => {
    setSavingProvider(true)
    setError(null)
    setMessage(null)
    
    try {
      // For new providers, remove the 'new' id and let Supabase generate one
      const providerToSave = { ...provider }
      if (providerToSave.id === 'new') {
        delete (providerToSave as any).id
      }
      
      const { data, error } = await supabase
        .from('providers')
        .upsert([providerToSave])
        .select()
      
      if (error) throw error
      
      // Update local state
      if (data && data[0]) {
        setProviders(prev => 
          prev.some(p => p.id === data[0].id) 
            ? prev.map(p => p.id === data[0].id ? data[0] : p)
            : [...prev, data[0]]
        )
        
        // If we were creating a new provider, reset the form
        if (provider.id === 'new') {
          setIsCreatingNewProvider(false)
          setSelectedProviderId(data[0].id)
        }
      }
      
      setMessage('Provider saved successfully')
      setRetryProvider(null)
      
      return { success: true, data: data?.[0] }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save provider'
      setError(errorMsg)
      setRetryProvider(provider)
      console.error('[useAdminProviders] Save error:', err)
      return { success: false, error: errorMsg }
    } finally {
      setSavingProvider(false)
    }
  }, [])

  /**
   * Delete provider by ID
   * Uses Netlify function to handle cascading deletes
   */
  const deleteProvider = useCallback(async (providerId: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    setConfirmDeleteProviderId(null)
    
    try {
      // Get auth session for Netlify function
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Use Netlify function for proper cascading delete
      const response = await fetch('/.netlify/functions/delete-business-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ listing_id: providerId })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.details || result.error || 'Delete failed')
      }
      
      // Update local state
      setProviders(prev => prev.filter(p => p.id !== providerId))
      setSelectedProviderId(null)
      setMessage('Provider deleted successfully')
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('bf-refresh-providers'))
      
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete provider'
      setError(errorMsg)
      console.error('[useAdminProviders] Delete error:', err)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Toggle featured status for a provider
   * Updates is_featured and featured_since fields
   */
  const toggleFeaturedStatus = useCallback(async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ 
          is_featured: !currentStatus,
          featured_since: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { 
                ...p, 
                is_featured: !currentStatus, 
                featured_since: !currentStatus ? new Date().toISOString() : null 
              }
            : p
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      console.error('[useAdminProviders] Toggle featured error:', err)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Update subscription type for a provider
   * Handles monthly/yearly plan changes
   */
  const updateSubscriptionType = useCallback(async (providerId: string, subscriptionType: 'monthly' | 'yearly') => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ subscription_type: subscriptionType })
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { ...p, subscription_type: subscriptionType }
            : p
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      console.error('[useAdminProviders] Update subscription error:', err)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Toggle booking system enabled/disabled
   * Only available for featured accounts
   */
  const toggleBookingEnabled = useCallback(async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ booking_enabled: !currentStatus })
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { ...p, booking_enabled: !currentStatus }
            : p
        )
      )
      
      setMessage(`Booking system ${!currentStatus ? 'enabled' : 'disabled'}`)
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      console.error('[useAdminProviders] Toggle booking error:', err)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Handle image upload for a provider
   * Supports single image for free accounts, multiple for featured
   */
  const handleImageUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>, 
    providerId: string
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setError(null)
    setMessage(null)

    try {
      const currentProvider = providers.find(p => p.id === providerId)
      if (!currentProvider) {
        throw new Error('Provider not found')
      }

      const isFeatured = currentProvider.is_member === true
      const currentImages = currentProvider.images || []
      const maxImages = isFeatured ? 10 : 1

      // Check image limit
      if (currentImages.length + files.length > maxImages) {
        throw new Error(
          `Maximum ${maxImages} image${maxImages === 1 ? '' : 's'} allowed for ${isFeatured ? 'featured' : 'free'} accounts`
        )
      }

      // Upload each file
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file`)
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB`)
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${providerId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file)

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName)

        return urlData.publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const newImages = [...currentImages, ...uploadedUrls]

      // Update provider with new images
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, images: newImages }
          : p
      ))

      setMessage(`Successfully uploaded ${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'}`)
      
      return { success: true, urls: uploadedUrls }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to upload images'
      setError(errorMsg)
      console.error('[useAdminProviders] Image upload error:', err)
      return { success: false, error: errorMsg }
    } finally {
      setUploadingImages(false)
      // Clear the file input
      event.target.value = ''
    }
  }, [providers])

  /**
   * Remove an image from a provider
   * Deletes from storage and updates provider record
   */
  const removeImage = useCallback(async (providerId: string, imageUrl: string) => {
    try {
      const currentProvider = providers.find(p => p.id === providerId)
      if (!currentProvider) {
        throw new Error('Provider not found')
      }

      // Extract filename from URL
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('business-images')
        .remove([fileName])

      if (error) {
        console.warn('[useAdminProviders] Failed to delete from storage:', error)
        // Continue anyway - still remove from provider
      }

      // Update provider images
      const newImages = (currentProvider.images || []).filter(img => img !== imageUrl)
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, images: newImages }
          : p
      ))

      setMessage('Image removed successfully')
      
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to remove image'
      setError(errorMsg)
      console.error('[useAdminProviders] Image removal error:', err)
      return { success: false, error: errorMsg }
    }
  }, [providers])

  /**
   * Start creating a new provider
   * Resets form to default values
   */
  const startCreateNewProvider = useCallback(() => {
    setIsCreatingNewProvider(true)
    setSelectedProviderId(null)
    setMessage(null)
    setError(null)
    setNewProviderForm({
      name: '',
      category_key: 'professional-services',
      tags: [],
      badges: [],
      rating: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      images: [],
      owner_user_id: null,
      is_member: false,
      is_featured: false,
      featured_since: null,
      subscription_type: null,
      description: null,
      specialties: null,
      social_links: null,
      business_hours: null,
      service_areas: null,
      google_maps_url: null,
      bonita_resident_discount: null,
      published: true,
      created_at: null,
      updated_at: null,
      booking_enabled: false,
      booking_type: null,
      booking_instructions: null,
      booking_url: null
    })
  }, [])

  /**
   * Cancel provider creation
   * Resets form and clears state
   */
  const cancelCreateProvider = useCallback(() => {
    setIsCreatingNewProvider(false)
    setSelectedProviderId(null)
    setMessage(null)
    setError(null)
  }, [])

  /**
   * Retry saving a provider that previously failed
   */
  const retrySaveProvider = useCallback(() => {
    if (retryProvider) {
      saveProvider(retryProvider)
    }
  }, [retryProvider, saveProvider])

  return {
    // State
    providers,
    loading,
    error,
    message,
    savingProvider,
    uploadingImages,
    retryProvider,
    selectedProviderId,
    confirmDeleteProviderId,
    isCreatingNewProvider,
    newProviderForm,
    
    // Actions
    loadProviders,
    saveProvider,
    deleteProvider,
    toggleFeaturedStatus,
    updateSubscriptionType,
    toggleBookingEnabled,
    handleImageUpload,
    removeImage,
    startCreateNewProvider,
    cancelCreateProvider,
    retrySaveProvider,
    
    // Setters
    setProviders,
    setError,
    setMessage,
    setRetryProvider,
    setSelectedProviderId,
    setConfirmDeleteProviderId,
    setNewProviderForm,
    
    // Constants
    categoryOptions: CATEGORY_OPTIONS,
  }
}
