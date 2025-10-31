/**
 * BUSINESS OPERATIONS HOOK
 * 
 * This hook encapsulates all business listing CRUD operations and related functionality.
 * It provides handlers for creating, updating, deleting, and managing business listings.
 */

import { supabase } from '../../../lib/supabase'
import { createProviderChangeRequest, getDismissedNotifications, type ProviderChangeRequest, type DismissedNotification } from '../../../lib/supabaseData'
import { getUserPlanChoice, setUserPlanChoice as savePlanChoice, migratePlanChoiceToDatabase, type PlanChoice } from '../../../utils/planChoiceDb'
import type { BusinessListing, BusinessApplication, JobPost, UserActivity } from '../types'

/**
 * Props interface for the hook
 */
interface UseBusinessOperationsProps {
  auth: {
    userId: string | undefined
    email: string // Provide default empty string if undefined in caller
    name?: string
  }
  setMessage: (message: string | null) => void
  setLoading: (loading: boolean) => void
  setListings: React.Dispatch<React.SetStateAction<BusinessListing[]>>
  setApplications: React.Dispatch<React.SetStateAction<BusinessApplication[]>>
  setJobPosts: React.Dispatch<React.SetStateAction<JobPost[]>>
  setChangeRequests: React.Dispatch<React.SetStateAction<ProviderChangeRequest[]>>
  setDismissedNotifications: React.Dispatch<React.SetStateAction<DismissedNotification[]>>
  setShowSubscriptionCard: (show: boolean) => void
  setUserPlanChoice: (choice: PlanChoice) => void
  setEditingListing: (listing: BusinessListing | null) => void
  setShowCreateForm: (show: boolean) => void
  isUpdating: boolean
  setIsUpdating: (updating: boolean) => void
  listings: BusinessListing[]
  applications: BusinessApplication[]
}

/**
 * Custom hook that provides business operations
 */
export function useBusinessOperations(props: UseBusinessOperationsProps) {
  const { 
    auth, 
    setMessage, 
    setLoading,
    setListings,
    setApplications,
    setJobPosts,
    setChangeRequests,
    setDismissedNotifications,
    setShowSubscriptionCard,
    setUserPlanChoice,
    setEditingListing,
    setShowCreateForm,
    isUpdating,
    setIsUpdating,
    listings,
    applications
  } = props

  /**
   * LOAD ALL BUSINESS DATA
   * 
   * Loads all business-related data for the current user including:
   * - Business listings (providers)
   * - Business applications
   * - Job posts
   * - Change requests
   */
  const loadBusinessData = async () => {
    if (!auth.userId || !auth.email) {
      console.log('[MyBusiness] No userId or email, cannot load data')
      return
    }
    
    setLoading(true)
    try {
      console.log('[MyBusiness] Loading comprehensive business data for userId:', auth.userId, 'email:', auth.email)
      
      // Load business listings owned by user from providers table
      const { data: listingsData, error: listingsError } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Providers query result:', {
        error: listingsError,
        count: listingsData?.length || 0,
        data: listingsData
      })

      if (listingsError) throw listingsError

      // ALSO check for providers by email (in case admin didn't set owner_user_id)
      const { data: emailListingsData, error: emailListingsError } = await supabase
        .from('providers')
        .select('*')
        .eq('email', auth.email)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Providers by email query result:', {
        error: emailListingsError,
        count: emailListingsData?.length || 0,
        data: emailListingsData
      })

      // Load business applications by email from business_applications table
      const { data: appsData, error: appsError } = await supabase
        .from('business_applications')
        .select('*')
        .eq('email', auth.email)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Applications query result:', {
        error: appsError,
        count: appsData?.length || 0,
        data: appsData
      })

      if (appsError) throw appsError

      // Load job posts for all user's providers AND job posts owned by the user
      const providerIds = [
        ...(listingsData || []).map(l => l.id),
        ...(emailListingsData || []).map(l => l.id)
      ]
      
      let jobPostsData: JobPost[] = []
      
      // Query job posts in two ways:
      // 1. Job posts for providers owned by this user
      // 2. Job posts directly owned by this user (owner_user_id)
      let allJobPosts: JobPost[] = []
      
      // First, get job posts for user's providers
      if (providerIds.length > 0) {
        const { data: providerJobsData, error: providerJobsError } = await supabase
          .from('provider_job_posts')
          .select('*')
          .in('provider_id', providerIds)
          .order('created_at', { ascending: false })

        console.log('[MyBusiness] Provider job posts query result:', {
          error: providerJobsError,
          count: providerJobsData?.length || 0,
          data: providerJobsData
        })

        if (providerJobsError) {
          console.warn('[MyBusiness] Provider job posts error (non-critical):', providerJobsError)
        } else {
          allJobPosts = [...allJobPosts, ...(providerJobsData as JobPost[] || [])]
        }
      }
      
      // Second, get job posts directly owned by this user
      const { data: ownedJobsData, error: ownedJobsError } = await supabase
        .from('provider_job_posts')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Owned job posts query result:', {
        error: ownedJobsError,
        count: ownedJobsData?.length || 0,
        data: ownedJobsData
      })

      if (ownedJobsError) {
        console.warn('[MyBusiness] Owned job posts error (non-critical):', ownedJobsError)
      } else {
        allJobPosts = [...allJobPosts, ...(ownedJobsData as JobPost[] || [])]
      }
      
      // Remove duplicates (in case a job post matches both criteria)
      const uniqueJobPosts = allJobPosts.filter((job, index, self) => 
        index === self.findIndex(j => j.id === job.id)
      )
      
      jobPostsData = uniqueJobPosts
      
      console.log('[MyBusiness] Final job posts result:', {
        totalCount: jobPostsData.length,
        data: jobPostsData
      })

      // Load change requests for this business owner
      console.log('[MyBusiness] Loading change requests for user:', auth.userId)
      let changeRequestsData: any[] = []
      let changeRequestsError: any = null
      
      try {
        const { data, error } = await supabase
          .from('provider_change_requests')
          .select('*')
          .eq('owner_user_id', auth.userId)
          .order('created_at', { ascending: false })
        
        changeRequestsData = data || []
        changeRequestsError = error

        console.log('[MyBusiness] Change requests query result:', {
          error: changeRequestsError,
          count: changeRequestsData?.length || 0,
          data: changeRequestsData
        })

        if (changeRequestsError) {
          console.warn('[MyBusiness] Change requests error (non-critical):', changeRequestsError)
          // If it's a 403 error, it's likely an RLS policy issue
          if (changeRequestsError.code === 'PGRST301' || changeRequestsError.message?.includes('403')) {
            console.warn('[MyBusiness] RLS policy issue detected - user may not have permission to view change requests')
          }
        }
      } catch (err) {
        console.error('[MyBusiness] Unexpected error loading change requests:', err)
        changeRequestsError = err
      }

      // Combine listings from both queries (owned and by email)
      const allListings = [
        ...(listingsData || []),
        ...(emailListingsData || []).filter(item => 
          !listingsData?.some(owned => owned.id === item.id)
        )
      ]

      setListings((allListings as BusinessListing[]) || [])
      setApplications((appsData as BusinessApplication[]) || [])
      setJobPosts(jobPostsData)
      setChangeRequests((changeRequestsData as ProviderChangeRequest[]) || [])
      
      // Load dismissed notifications from database
      const dismissedData = await getDismissedNotifications(auth.userId)
      setDismissedNotifications(dismissedData)
      
      console.log('[MyBusiness] Final comprehensive state:', {
        listings: allListings.length,
        applications: appsData?.length || 0,
        jobPosts: jobPostsData.length,
        dismissedNotifications: dismissedData.length
      })
      
      // Debug: Log the actual listing data to see what's being displayed
      if (allListings && allListings.length > 0) {
        console.log('[MyBusiness] First listing data:', allListings[0])
        console.log('[MyBusiness] Website field:', allListings[0].website)
        console.log('[MyBusiness] Description field:', allListings[0].description)
      }
      
    } catch (error: any) {
      console.error('[MyBusiness] Error loading business data:', error)
      setMessage(`Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
      
      // Mark booking notifications as read when user visits My Business page
      if (auth.userId) {
        try {
          const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', auth.userId)
            .eq('type', 'booking_received')
            .eq('is_read', false)
          
          if (error) {
            console.warn('Failed to mark booking notifications as read (table may not exist yet):', error.message)
          }
        } catch (error) {
          console.warn('Failed to mark booking notifications as read:', error)
        }
      }
    }
  }

  /**
   * CHECK USER PLAN CHOICE AND STATUS
   * 
   * Checks the user's plan choice from database and determines
   * what state to show based on their previous choices and current featured request status.
   */
  const checkUserPlanChoice = async () => {
    if (!auth.userId) return

    // Migrate localStorage choice to database
    await migratePlanChoiceToDatabase(auth.userId)

    // Check database for user's plan choice
    const savedChoice = await getUserPlanChoice(auth.userId)
    
    if (savedChoice === 'free') {
      setUserPlanChoice('free')
      setShowSubscriptionCard(false)
      return
    }
    
    if (savedChoice === 'featured-pending' || savedChoice === 'featured') {
      // Check if there are any pending featured requests
      const { data: pendingRequests, error } = await supabase
        .from('provider_change_requests')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .eq('type', 'feature_request')
        .eq('status', 'pending')
      
      if (error) {
        console.error('[MyBusiness] Error checking pending requests:', error)
        return
      }
      
      if (pendingRequests && pendingRequests.length > 0) {
        setUserPlanChoice('featured-pending')
        setShowSubscriptionCard(false)
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. Featured pricing: $97/year.')
        return
      }
      
      // No pending requests found - reset to showing subscription card
      setUserPlanChoice(null)
      setShowSubscriptionCard(true)
    }
  }

  /**
   * REQUEST FREE LISTING FROM APPLICATION
   * 
   * Creates a change request to convert an approved application into a free listing.
   */
  const requestFreeListingFromApp = async (appId: string) => {
    try {
      setMessage('Creating free listing request...')
      
      const app = applications.find(a => a.id === appId)
      if (!app) throw new Error('Application not found')

      // Create a provider change request for admin to review
      // This uses the existing admin workflow for approving new listings
      const { error } = await supabase
        .from('provider_change_requests')
        .insert([{
          provider_id: null, // Will be created by admin
          owner_user_id: auth.userId,
          type: 'create_free_listing',
          changes: {
            business_name: app.business_name,
            category: app.category,
            phone: app.phone,
            email: app.email,
            tier: 'free',
            source_application_id: appId
          },
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Free listing request submitted! We\'ll review and approve it shortly.')
      loadBusinessData() // Refresh data to show updated state
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  /**
   * SELECT FREE ACCOUNT
   * 
   * Handles when a user selects the Free Account option.
   * Displays a thank you message, saves the choice, and hides the subscription card.
   */
  const selectFreeAccount = () => {
    if (!auth.userId) return
    
    setMessage('Thanks for choosing Bonita Forward.')
    setUserPlanChoice('free')
    setShowSubscriptionCard(false)
    
    // Save choice to database
    savePlanChoice(auth.userId, 'free')
    
    // Auto-dismiss message after 30 seconds
    setTimeout(() => {
      setMessage(null)
    }, 30000)
  }

  /**
   * UPGRADE TO FEATURED TIER
   * 
   * Allows business owners to request an upgrade from free to featured tier.
   * Creates a change request for admin review and payment processing.
   * 
   * Featured tier pricing: $97/year
   */
  const upgradeToFeatured = async (listingId?: string) => {
    try {
      setMessage('Requesting featured upgrade...')
      
      // DEFENSIVE CHECK: Verify auth data exists before creating request
      console.log('[MyBusiness] Creating featured request with auth data:', {
        userId: auth.userId,
        email: auth.email,
        name: auth.name,
        hasUserId: !!auth.userId
      })
      
      if (!auth.userId) {
        throw new Error('User ID not available - please sign in again')
      }
      
      // Determine provider_id - use provided listingId or first available listing
      let providerId = listingId
      if (!providerId && listings.length > 0) {
        providerId = listings[0].id // Use first listing if none specified
      }
      
      console.log('[MyBusiness] Submitting request for provider:', providerId)
      
      if (providerId) {
        // User has existing listing - create provider_change_request
        const { error } = await supabase
          .from('provider_change_requests')
          .insert([{
            provider_id: providerId,
            owner_user_id: auth.userId,
            type: 'feature_request',
            changes: {
              tier: 'featured',
              upgrade_reason: listingId 
                ? 'User requested featured upgrade for specific listing' 
                : 'User requested featured upgrade from subscription selection',
              pricing_options: {
                annual: '$97/year'
              },
              benefits: [
                'Priority placement in search results',
                'Enhanced business description',
                'Multiple images support',
                'Social media links integration',
                'Google Maps integration',
                'Booking system integration',
                'Analytics and insights',
                'Premium customer support'
              ]
            },
            status: 'pending'
          }])

        if (error) throw error
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. Featured pricing: $97/year.')
        
      } else {
        // User has no existing listing - create business_application with featured tier
        const { error } = await supabase
          .from('business_applications')
          .insert([{
            full_name: auth.name || null,
            email: auth.email,
            tier_requested: 'featured',
            status: 'pending',
            challenge: 'Featured upgrade request from pricing page - user will provide business details during application process'
          }])

        if (error) throw error
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. When you create your business listing, it will automatically be featured. Featured pricing: $97/year.')
      }
      
      // Hide the subscription card if it was called from the subscription selection
      if (!listingId) {
        setShowSubscriptionCard(false)
        setUserPlanChoice('featured-pending')
        
        // Save choice to database
        if (auth.userId) {
          await savePlanChoice(auth.userId, 'featured-pending')
        }
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  /**
   * DOWNGRADE TO FREE
   * 
   * Creates a change request to set is_member to false (downgrade from featured to free).
   */
  const downgradeToFree = async (listingId: string) => {
    try {
      setMessage('Requesting downgrade to Free...')
      const { error } = await createProviderChangeRequest({
        provider_id: listingId,
        owner_user_id: auth.userId!,
        type: 'update',
        changes: { is_member: false },
        reason: 'Downgrade from Featured to Free plan'
      })
      if (error) throw new Error(error)
      setMessage('✅ Downgrade request submitted! An admin will review and apply it shortly.')
      await loadBusinessData()
    } catch (err: any) {
      setMessage(`Failed to request downgrade: ${err.message || err}`)
    }
  }

  /**
   * PROMPT AND UPLOAD IMAGES
   * 
   * Opens a file picker, uploads selected images to Supabase Storage, then updates the listing's images array.
   */
  const promptAndUploadImages = async (listing: BusinessListing) => {
    try {
      if (!auth.userId) {
        setMessage('You must be signed in to upload images.')
        return
      }

      // Create a transient file input to avoid persistent hidden inputs per row
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      // Featured listings may upload multiple images; free could be limited to 1 if desired
      input.multiple = true

      input.onchange = async () => {
        const files = Array.from(input.files || [])
        if (files.length === 0) return

        setMessage('Uploading images...')
        const uploadedUrls: string[] = []

        for (const file of files) {
          // Unique path per user/listing/filename
          const path = `${auth.userId}/${listing.id}/${Date.now()}-${file.name}`
          const { error: uploadErr } = await supabase.storage.from('business-images').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          })
          if (uploadErr) {
            console.error('[MyBusiness] Image upload failed:', uploadErr)
            setMessage(`Image upload failed: ${uploadErr.message}`)
            return
          }
          const { data: pub } = supabase.storage.from('business-images').getPublicUrl(path)
          if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl)
        }

        // Merge with existing images
        const newImages = [...(listing.images || []), ...uploadedUrls]

        // Persist to providers table
        const { error: updateErr } = await supabase
          .from('providers')
          .update({ images: newImages, updated_at: new Date().toISOString() })
          .eq('id', listing.id)
          .eq('owner_user_id', auth.userId)

        if (updateErr) {
          console.error('[MyBusiness] Failed to update listing images:', updateErr)
          setMessage(`Failed to update listing: ${updateErr.message}`)
          return
        }

        setMessage('Images uploaded successfully!')
        await loadBusinessData()
      }

      // Trigger picker
      input.click()
    } catch (err: any) {
      console.error('[MyBusiness] Unexpected error during image upload:', err)
      setMessage(`Unexpected error: ${err.message || err}`)
    }
  }

  /**
   * CREATE NEW BUSINESS LISTING
   * 
   * Creates a business application (not a provider directly) that requires admin approval.
   */
  const createBusinessListing = async (listingData: Partial<BusinessListing>) => {
    if (!auth.email) {
      setMessage('Error: User email not available. Please sign in again.')
      return
    }
    
    try {
      setMessage('Submitting business application...')
      
      // Create a business application (NOT a provider directly)
      // This requires admin approval before becoming a live listing
      // IMPORTANT: business_applications table uses 'category' NOT 'category_key'
      // IMPORTANT: Always use auth.email so the application shows up in the user's account
      const applicationData = {
        business_name: listingData.name,
        full_name: auth.name || 'Business Owner',
        email: auth.email,  // Always use auth.email to ensure application shows in My Business page
        phone: listingData.phone || '',
        category: listingData.category_key || 'professional-services',  // Note: 'category' not 'category_key'
        // Store additional details as JSON string in the challenge field
        // Store the business contact email separately in the details
        challenge: JSON.stringify({
          website: listingData.website,
          address: listingData.address,
          description: listingData.description,
          tags: listingData.tags,
          specialties: listingData.specialties,
          social_links: listingData.social_links,
          business_hours: listingData.business_hours,
          service_areas: listingData.service_areas,
          google_maps_url: listingData.google_maps_url,
          bonita_resident_discount: listingData.bonita_resident_discount,
          images: listingData.images,
          business_contact_email: listingData.email  // Store business email separately from account email
        })
      }
      
      console.log('[MyBusiness] Submitting application data:', applicationData)
      
      const { data: insertedData, error } = await supabase
        .from('business_applications')
        .insert([applicationData])
        .select()

      console.log('[MyBusiness] Application insert result:', { data: insertedData, error })

      if (error) throw error

      setMessage('Success! Your business application has been submitted and is pending admin approval.')
      await loadBusinessData() // Refresh data to show new application in pending state
      setShowCreateForm(false)
    } catch (error: any) {
      setMessage(`Error submitting application: ${error.message}`)
    }
  }

  /**
   * UPDATE BUSINESS LISTING
   * 
   * For featured businesses: All changes are applied immediately.
   * For non-featured businesses: Creates a change request that requires admin approval.
   */
  const updateBusinessListing = async (listingId: string, updates: Partial<BusinessListing>) => {
    // Prevent multiple simultaneous updates
    if (isUpdating) {
      console.log('[MyBusiness] Update already in progress, ignoring duplicate request')
      return
    }

    setIsUpdating(true)
    
    try {
      console.log('[MyBusiness] Updating listing:', listingId)
      console.log('[MyBusiness] Proposed changes:', updates)
      
      // Get the current listing to check if it's featured
      const currentListing = listings.find(l => l.id === listingId)
      const isFeatured = currentListing?.is_member === true
      
      console.log('[MyBusiness] 🔍 UPDATE CHECK:', {
        businessName: currentListing?.name,
        isFeatured: isFeatured,
        is_member: currentListing?.is_member,
        willApplyImmediately: isFeatured,
        willRequireApproval: !isFeatured,
        proposedChanges: Object.keys(updates)
      })
      
      if (isFeatured) {
        // Featured businesses: Apply ALL changes immediately
        console.log('[MyBusiness] ⚡ Applying all changes immediately for featured business:', updates)
        
        const { error } = await supabase
          .from('providers')
          .update(updates)
          .eq('id', listingId)
        
        if (error) throw new Error(`Failed to update listing: ${error.message}`)
        
        // Create a change log entry for admin tracking (not for approval)
        const { error: logError } = await createProviderChangeRequest({
          provider_id: listingId,
          owner_user_id: auth.userId!,
          type: 'update',
          changes: updates,
          status: 'approved', // Automatically approved for featured businesses
          reason: `Featured business update from ${auth.email} - applied immediately`
        })
        
        if (logError) {
          console.warn('[MyBusiness] Failed to create change log:', logError)
          // Don't throw error for logging failure, the main update succeeded
        }
        
        setMessage('✅ All changes applied immediately! (Featured business)')
      } else {
        // Non-featured businesses: Create change request for admin approval
        console.log('[MyBusiness] 📋 Creating change request for non-featured business (NO CHANGES APPLIED YET):', updates)
        console.log('[MyBusiness] ⚠️ Changes will NOT be applied to database until admin approves')
        
        const { error, id } = await createProviderChangeRequest({
          provider_id: listingId,
          owner_user_id: auth.userId!,
          type: 'update',
          changes: updates,
          reason: `Business listing update request from ${auth.email}`
        })
        
        if (error) {
          console.error('[MyBusiness] Change request creation error:', error)
          throw new Error(error)
        }
        
        console.log('[MyBusiness] Change request created successfully with ID:', id)
        setMessage('📋 Changes submitted for admin approval! You\'ll be notified once they\'re reviewed.')
      }
      
      // Refresh the data to show updated state
      await loadBusinessData()
      
      // Close the editing form after successful update
      setEditingListing(null)
      
    } catch (error: any) {
      console.error('[MyBusiness] Error updating listing:', error)
      setMessage(`❌ Error updating listing: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  /**
   * DELETE BUSINESS LISTING
   * 
   * Calls a Netlify function to delete the business listing (bypasses RLS with SERVICE_ROLE_KEY).
   */
  const deleteBusinessListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this business listing? This action cannot be undone.')) {
      return
    }

    try {
      setMessage('Deleting business listing...')
      
      console.log('[MyBusiness] Attempting to delete listing:', listingId)
      console.log('[MyBusiness] User:', { userId: auth.userId, email: auth.email })
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      console.log('[MyBusiness] Calling Netlify function to delete listing...')

      // Call Netlify function to delete (bypasses RLS with SERVICE_ROLE_KEY)
      const response = await fetch('/.netlify/functions/delete-business-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ listing_id: listingId })
      })

      console.log('[MyBusiness] Delete response status:', response.status)

      if (!response.ok) {
        // Try to parse error details
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('[MyBusiness] Delete error details:', errorData)
          errorMessage = errorData.error || errorMessage
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
        } catch (parseErr) {
          const errorText = await response.text()
          console.error('[MyBusiness] Delete error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[MyBusiness] Delete result:', result)

      if (!result.success) {
        throw new Error(result.error || 'Delete failed')
      }

      console.log('[MyBusiness] Successfully deleted listing, refreshing data...')
      setMessage('Business listing deleted successfully!')
      
      // Wait a moment for the database to process the delete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh data to remove deleted listing
      await loadBusinessData()
      
      console.log('[MyBusiness] Data refreshed after deletion')
    } catch (error: any) {
      console.error('[MyBusiness] Error deleting listing:', error)
      setMessage(`Error deleting listing: ${error.message}`)
    }
  }

  return {
    loadBusinessData,
    checkUserPlanChoice,
    requestFreeListingFromApp,
    selectFreeAccount,
    upgradeToFeatured,
    downgradeToFree,
    promptAndUploadImages,
    createBusinessListing,
    updateBusinessListing,
    deleteBusinessListing
  }
}

