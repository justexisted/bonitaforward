/**
 * Admin Provider Management Utilities
 * 
 * This file contains all provider-related administrative functions.
 * These functions were extracted from Admin.tsx to improve code organization
 * and maintainability.
 * 
 * Functions included:
 * - toggleFeaturedStatus: Toggle provider featured status
 * - updateSubscriptionType: Update provider subscription type
 * - saveProvider: Save/update provider information
 * - deleteProvider: Delete a provider
 * - toggleBookingEnabled: Toggle booking system on/off
 * - handleImageUpload: Upload images for provider
 * - removeImage: Remove image from provider
 */

import { supabase } from '../lib/supabase'
import type { ProviderRow } from '../pages/Admin'

/**
 * TOGGLE FEATURED STATUS
 * 
 * This function allows admins to toggle a provider's featured status.
 * It handles both is_featured and is_member fields to ensure proper toggling.
 * When making featured, it sets both is_featured=true and featured_since timestamp.
 * When removing featured, it sets both is_featured=false and is_member=false.
 */
export async function toggleFeaturedStatus(
  providerId: string,
  currentStatus: boolean,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
) {
  // Check if session is still valid before updating featured status
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    setError('Session expired. Please refresh the page and try again.')
    return
  }
  
  try {
    setMessage('Updating featured status...')
    
    // Always update both is_featured and is_member to ensure consistent state
    const updateData: Partial<ProviderRow> = {
      is_featured: !currentStatus,
      is_member: !currentStatus, // Keep both fields in sync
      updated_at: new Date().toISOString()
    }
    
    // If making featured, set the featured_since timestamp
    if (!currentStatus) {
      updateData.featured_since = new Date().toISOString()
    } else {
      // If removing featured status, clear the featured_since timestamp
      updateData.featured_since = null
    }
    
    const { error } = await supabase
      .from('providers')
      .update(updateData)
      .eq('id', providerId)

    if (error) {
      console.error('[Admin] Error updating featured status:', error)
      throw error
    }

    setMessage(`Provider ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`)
    
    // Refresh providers data - using select('*') to get all fields including newly added ones
    const { data: pData } = await supabase
      .from('providers')
      .select('*')
      .order('name', { ascending: true })
    setProviders((pData as ProviderRow[]) || [])
  } catch (error: any) {
    console.error('[Admin] Error in toggleFeaturedStatus:', error)
    setMessage(`Error updating featured status: ${error.message}`)
  }
}

/**
 * UPDATE SUBSCRIPTION TYPE
 * 
 * This function allows admins to update a provider's subscription type (monthly/yearly).
 */
export async function updateSubscriptionType(
  providerId: string,
  subscriptionType: 'monthly' | 'yearly',
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    setError('Session expired. Please refresh the page and try again.')
    return
  }
  
  try {
    setMessage('Updating subscription type...')
    
    const { error } = await supabase
      .from('providers')
      .update({
        subscription_type: subscriptionType,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)

    if (error) throw error

    setMessage(`Subscription type updated to ${subscriptionType}!`)
    
    // Refresh providers data - using select('*') to get all fields including newly added ones
    const { data: pData } = await supabase
      .from('providers')
      .select('*')
      .order('name', { ascending: true })
    setProviders((pData as ProviderRow[]) || [])
  } catch (error: any) {
    setMessage(`Error updating subscription type: ${error.message}`)
  }
}

/**
 * SAVE PROVIDER - Enhanced Admin Provider Update
 * 
 * This function saves all provider fields including the enhanced business management fields.
 * It includes all the same fields that are available in the My Business page editing form.
 * 
 * Features:
 * - Updates all core business fields (name, category, contact info)
 * - Updates enhanced fields (description, specialties, social links, etc.)
 * - Handles free vs featured plan restrictions
 * - Provides clear success/error feedback
 * - Refreshes provider data after successful update
 */
export async function saveProvider(
  p: ProviderRow,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setSavingProvider: (saving: boolean) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>,
  setRetryProvider: (provider: ProviderRow | null) => void,
  clearSavedState: () => void,
  setIsCreatingNewProvider: (creating: boolean) => void,
  setSelectedProviderId: (id: string | null) => void
) {
  setMessage(null)
  setError(null)
  setSavingProvider(true)

  // Check if this is a new provider being created
  if (p.id === 'new') {
    // Create new provider logic
    try {
      // Validate required fields
      if (!p.name?.trim()) {
        setError('Business name is required')
        setSavingProvider(false)
        return
      }

      // Check if session is still valid
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please refresh the page and try again.')
        setSavingProvider(false)
        return
      }

      // Create the provider (remove the temporary 'new' id)
      const { id, ...providerData } = p
      const { error } = await supabase
        .from('providers')
        .insert([{
          ...providerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        console.error('[Admin] Error creating provider:', error)
        setError(`Failed to create provider: ${error.message}`)
        setSavingProvider(false)
        return
      }

      setMessage('New provider created successfully!')
      
      // Refresh providers data
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      setProviders((pData as ProviderRow[]) || [])
      
      // Exit create mode
      setIsCreatingNewProvider(false)
      setSelectedProviderId(null)

    } catch (err: any) {
      console.error('[Admin] Unexpected error creating provider:', err)
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setSavingProvider(false)
    }
    return
  }

  // Check if session is still valid before saving
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    setError('Session expired. Please refresh the page and try again.')
    setSavingProvider(false)
    return
  }
    
  // Force refresh the Supabase client before making the request
  try {
    await supabase.from('providers').select('id').limit(1)
  } catch (err) {
    console.error('[Admin] Connection test failed:', err)
  }
  
  // CRITICAL FIX: Add timeout to prevent infinite loading state
  const timeoutId = setTimeout(() => {
    console.error('[Admin] Save provider timeout - resetting loading state')
    setSavingProvider(false)
    setError('Save operation timed out. Please try again.')
  }, 10000) // 10 second timeout
  
  try {
    // Prepare update data with all enhanced business fields
    const updateData = {
      // Core business fields
      name: p.name,
      category_key: p.category_key,
      tags: p.tags || [],
      rating: p.rating ?? undefined,
      phone: p.phone,
      email: p.email,
      website: p.website,
      address: p.address,
      images: p.images || [],
      is_member: p.is_member === true,
      
      // Plan tracking fields
      is_featured: p.is_featured === true,
      featured_since: p.featured_since || null,
      subscription_type: p.subscription_type || null,
      
      // Enhanced business management fields
      description: p.description || null,
      specialties: p.specialties || null,
      social_links: p.social_links || null,
      business_hours: p.business_hours || null,
      service_areas: p.service_areas || null,
      google_maps_url: p.google_maps_url || null,
      bonita_resident_discount: p.bonita_resident_discount || null,
      published: p.published ?? true,
      
      // Booking system fields
      booking_enabled: p.booking_enabled ?? false,
      booking_type: p.booking_type || null,
      booking_instructions: p.booking_instructions || null,
      booking_url: p.booking_url || null,
      enable_calendar_booking: p.enable_calendar_booking ?? false,
      enable_call_contact: p.enable_call_contact ?? false,
      enable_email_contact: p.enable_email_contact ?? false,
      
      // Coupon system fields
      coupon_code: p.coupon_code || null,
      coupon_discount: p.coupon_discount || null,
      coupon_description: p.coupon_description || null,
      coupon_expires_at: p.coupon_expires_at || null,
      updated_at: new Date().toISOString()
    }
    
    const startTime = Date.now()
    
    try {
      // Use Netlify function to bypass RLS issues
      const url = '/.netlify/functions/admin-update-provider'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: p.id,
          updates: updateData
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Admin] Provider update function error:', response.status, errorText)
        
        // Provide specific error messages based on error type
        if (response.status === 403) {
          setError(`Permission denied. Please check your admin access and try again.`)
        } else if (response.status === 401) {
          setError(`Authentication failed. Please refresh the page and try again.`)
        } else if (response.status >= 500) {
          setError(`Server error. Please try again in a moment.`)
          setRetryProvider(p) // Store provider for retry
        } else {
          setError(`Failed to save provider: ${errorText}`)
        }
        return
      }

      const result = await response.json()

      if (result.error) {
        console.error('[Admin] Function returned error:', result.error)
        setError(`Failed to save provider: ${result.error}`)
        return
      }
      
      setMessage('Provider updated successfully! Changes have been saved to the database.')
      setRetryProvider(null) // Clear retry state on success
      clearSavedState() // Clear saved state after successful save
      
      // Refresh admin page provider data immediately after save
      try {
        const { data: pData } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url, enable_calendar_booking, enable_call_contact, enable_email_contact, coupon_code, coupon_discount, coupon_description, coupon_expires_at')
          .order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
      } catch (refreshError) {
        console.error('[Admin] Failed to refresh provider data after save:', refreshError)
      }
      
      // Also dispatch refresh event for main app
      try { 
        window.dispatchEvent(new CustomEvent('bf-refresh-providers')) 
      } catch (refreshError) {
        console.warn('[Admin] Failed to dispatch refresh event:', refreshError)
      }
      
    } catch (requestError: any) {
      const duration = Date.now() - startTime
      console.error(`[Admin] Database request failed after ${duration}ms:`, requestError)
      
      // Handle different types of errors
      if (requestError.message.includes('timeout') || requestError.message.includes('aborted')) {
        setError(`Database operation timed out after ${duration}ms. Please check your connection and try again.`)
        setRetryProvider(p) // Store provider for retry
      } else if (requestError.message.includes('network') || requestError.message.includes('fetch')) {
        setError(`Network error: ${requestError.message}. Please check your internet connection.`)
        setRetryProvider(p) // Store provider for retry
      } else {
        setError(`Database request failed: ${requestError.message}`)
      }
      return
    }
    
  } catch (err: any) {
    console.error('[Admin] Unexpected error saving provider:', err)
    setError(`Unexpected error: ${err.message}`)
  } finally {
    // Always clear timeout and reset loading state
    clearTimeout(timeoutId)
    setSavingProvider(false)
  }
}

/**
 * DELETE PROVIDER
 * 
 * Deletes a provider and all related data using Netlify function.
 */
export async function deleteProvider(
  providerId: string,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setConfirmDeleteProviderId: (id: string | null) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
) {
  setMessage(null)
  setConfirmDeleteProviderId(null)
  
  try {
    // Get auth session for Netlify function
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }
    
    // Use Netlify function to delete provider (handles all FK constraints and related data)
    const url = '/.netlify/functions/delete-business-listing'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ listing_id: providerId })
    })
    
    if (!response.ok) {
      // Try to parse detailed error
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.details || errorData.error || `HTTP ${response.status}`
      throw new Error(errorMsg)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.details || result.error || 'Delete failed')
    }
    
    setMessage('Provider deleted successfully')
    setProviders((arr) => arr.filter((p) => p.id !== providerId))
    
    // Refresh providers list
    try {
      const { data: pData, error: pErr } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url, enable_calendar_booking, enable_call_contact, enable_email_contact, coupon_code, coupon_discount, coupon_description, coupon_expires_at')
        .order('name', { ascending: true })
      if (!pErr) setProviders((pData as ProviderRow[]) || [])
    } catch {}
    
    try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
    
  } catch (err: any) {
    console.error('[Admin] Error deleting provider:', err)
    setError(`Failed to delete provider: ${err.message}`)
  }
}

/**
 * Toggle booking system on/off (Admin quick action)
 * This function ONLY updates booking_enabled field without touching other fields
 */
export async function toggleBookingEnabled(
  providerId: string,
  currentlyEnabled: boolean,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
) {
  setMessage(null)
  setError(null)
  
  console.log('[Admin] Toggling booking_enabled:', { 
    providerId, 
    currentlyEnabled, 
    newValue: !currentlyEnabled 
  })
  
  try {
    // Update without .select() to avoid RLS issues
    const { error } = await supabase
      .from('providers')
      .update({ 
        booking_enabled: !currentlyEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
    
    if (error) {
      console.error('[Admin] ❌ Error toggling booking:', error)
      setError(`Failed to toggle booking: ${error.message}`)
      return
    }
    
    console.log('[Admin] ✅ Booking toggle update sent to database')
    
    setMessage(`Booking system ${!currentlyEnabled ? 'enabled' : 'disabled'} successfully!`)
    
    // Update local state
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, booking_enabled: !currentlyEnabled } 
        : p
    ))
    
    // Refresh providers list
    try {
      const { data: pData, error: refreshError } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true })
      
      if (refreshError) {
        console.error('[Admin] Error refreshing after booking toggle:', refreshError)
      } else {
        // Verify the update actually persisted
        const updatedProvider = pData?.find(p => p.id === providerId)
        const actualValue = updatedProvider?.booking_enabled
        const expectedValue = !currentlyEnabled
        
        console.log('[Admin] Providers refreshed after booking toggle')
        console.log('[Admin] Verification:', {
          providerId,
          expectedValue,
          actualValue,
          matched: actualValue === expectedValue,
          provider: updatedProvider?.name
        })
        
        if (actualValue !== expectedValue) {
          console.warn('[Admin] ⚠️ WARNING: Database value does not match expected value!')
          console.warn('[Admin] This could be a database trigger, constraint, or RLS issue')
          setError(`Warning: Booking toggle may not have persisted. Expected: ${expectedValue}, Got: ${actualValue}`)
        }
        
        setProviders((pData as ProviderRow[]) || [])
      }
    } catch (refreshErr) {
      console.error('[Admin] Exception during refresh:', refreshErr)
    }
    
    // Dispatch refresh event
    try { 
      window.dispatchEvent(new CustomEvent('bf-refresh-providers')) 
    } catch {}
    
  } catch (err: any) {
    console.error('[Admin] ❌ Unexpected error toggling booking:', err)
    setError(`Unexpected error: ${err.message}`)
  }
}

/**
 * Image upload functionality for admin provider editing
 * Handles both free (1 image) and featured (multiple images) accounts
 */
export async function handleImageUpload(
  event: React.ChangeEvent<HTMLInputElement>,
  providerId: string,
  providers: ProviderRow[],
  setUploadingImages: (uploading: boolean) => void,
  setError: (err: string | null) => void,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>,
  setMessage: (msg: string | null) => void
) {
  const files = event.target.files
  if (!files || files.length === 0) return

  setUploadingImages(true)
  setError(null)

  try {
    const currentProvider = providers.find(p => p.id === providerId)
    if (!currentProvider) {
      setError('Provider not found')
      return
    }

    const isFeatured = currentProvider.is_member === true
    const currentImages = currentProvider.images || []
    const maxImages = isFeatured ? 10 : 1 // Free accounts: 1 image, Featured: up to 10

    // Check if adding these files would exceed the limit
    if (currentImages.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} image${maxImages === 1 ? '' : 's'} allowed for ${isFeatured ? 'featured' : 'free'} accounts`)
      return
    }

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

    // Update the provider with new images
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, images: newImages }
        : p
    ))

    setMessage(`Successfully uploaded ${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'}`)

  } catch (err: any) {
    console.error('[Admin] Image upload error:', err)
    setError(err.message || 'Failed to upload images')
  } finally {
    setUploadingImages(false)
    // Clear the file input
    event.target.value = ''
  }
}

/**
 * Remove image from provider
 */
export async function removeImage(
  providerId: string,
  imageUrl: string,
  providers: ProviderRow[],
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void
) {
  try {
    const currentProvider = providers.find(p => p.id === providerId)
    if (!currentProvider) return

    // Extract filename from URL for storage deletion
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // Delete from storage
    const { error } = await supabase.storage
      .from('business-images')
      .remove([fileName])

    if (error) {
      console.warn('[Admin] Failed to delete image from storage:', error)
      // Continue anyway - we'll still remove it from the provider
    }

    // Update provider images
    const newImages = (currentProvider.images || []).filter(img => img !== imageUrl)
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, images: newImages }
        : p
    ))

    setMessage('Image removed successfully')

  } catch (err: any) {
    console.error('[Admin] Image removal error:', err)
    setError('Failed to remove image')
  }
}

