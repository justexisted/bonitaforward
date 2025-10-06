import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { deleteBlogPost, fetchAllBlogPosts, upsertBlogPost, uploadBlogImage, type BlogPost } from '../lib/supabaseData'
import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'

// Extended type for change requests with joined provider and profile data
type ProviderChangeRequestWithDetails = ProviderChangeRequest & {
  providers?: {
    id: string
    name: string
    email: string | null
  }
  profiles?: {
    id: string
    email: string
    name: string | null
  }
}

type ProviderRow = {
  id: string
  name: string
  category_key: string
  tags: string[] | null
  badges: string[] | null
  rating: number | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  images: string[] | null
  owner_user_id: string | null
  is_member?: boolean | null
  // Enhanced featured provider tracking fields
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null // 'monthly' or 'yearly'
  // REMOVED: tier?: string | null - This column doesn't exist in the database
  // REMOVED: paid?: boolean | null - This column doesn't exist in the database
  // Using existing subscription_type, is_member, is_featured fields instead
  // Enhanced business management fields (matching My Business page)
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  bonita_resident_discount?: string | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
}

type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category_key: string | null
  challenge: string | null
  created_at: string
}

type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * Admin page (per-user): Lists the authenticated user's saved funnel responses and bookings.
 * Requires RLS policies to allow users to select their own rows.
 */
export default function AdminPage() {
  const auth = useAuth()
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogDraft, setBlogDraft] = useState<{ id?: string; category_key: string; title: string; content: string; images?: string[] }>({ category_key: 'restaurants-cafes', title: '', content: '', images: [] })
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiQuery, setEmojiQuery] = useState('')
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [jobPosts, setJobPosts] = useState<ProviderJobPost[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deletingCustomerEmail, setDeletingCustomerEmail] = useState<string | null>(null)
  const [editFunnel, setEditFunnel] = useState<Record<string, string>>({})
  const [editBooking, setEditBooking] = useState<Record<string, { name?: string; notes?: string; answers?: string; status?: string }>>({})
  const [expandedBusinessDetails, setExpandedBusinessDetails] = useState<Record<string, any>>({})
  const [loadingBusinessDetails, setLoadingBusinessDetails] = useState<Record<string, boolean>>({})
  // Filter state for funnel responses - allows filtering by specific user email
  const [funnelUserFilter, setFunnelUserFilter] = useState<string>('')
  // Filter state for featured providers - allows toggling between all, featured, and non-featured
  const [featuredProviderFilter, setFeaturedProviderFilter] = useState<'all' | 'featured' | 'non-featured'>('all')
  // Loading state for provider save operations
  const [savingProvider, setSavingProvider] = useState(false)
  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false)
  // Retry state for failed saves
  const [retryProvider, setRetryProvider] = useState<ProviderRow | null>(null)
  // State for selected provider being edited
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  // State for creating new provider
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
  // State for selected section
  const [section, setSection] = useState< 'providers' |'business-applications' | 'contact-leads' | 'customer-users' | 'business-accounts' | 'business-owners' | 'users' | 'owner-change-requests' | 'job-posts' | 'funnel-responses' | 'bookings' | 'blog'>('providers')

  // Filtered providers based on featured status filter
  // This allows admins to easily view all providers, only featured ones, or only non-featured ones
  const filteredProviders = useMemo(() => {
    if (featuredProviderFilter === 'all') {
      return providers
    } else if (featuredProviderFilter === 'featured') {
      return providers.filter(provider => provider.is_featured === true || provider.is_member === true)
    } else {
      return providers.filter(provider => !provider.is_featured && !provider.is_member)
    }
  }, [providers, featuredProviderFilter])

  /**
   * TOGGLE FEATURED STATUS
   * 
   * This function allows admins to toggle a provider's featured status.
   * It handles both is_featured and is_member fields to ensure proper toggling.
   * When making featured, it sets both is_featured=true and featured_since timestamp.
   * When removing featured, it sets both is_featured=false and is_member=false.
   */
  const toggleFeaturedStatus = async (providerId: string, currentStatus: boolean) => {
    // ADD THIS: Check if session is still valid before updating featured status
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
      
      console.log('[Admin] Toggling featured status:', { providerId, currentStatus, updateData })
      
      const { error } = await supabase
        .from('providers')
        .update(updateData)
        .eq('id', providerId)

      if (error) {
        console.error('[Admin] Error updating featured status:', error)
        throw error
      }

      console.log('[Admin] Featured status updated successfully')
      setMessage(`Provider ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`)
      
      // Refresh providers data
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
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
  const updateSubscriptionType = async (providerId: string, subscriptionType: 'monthly' | 'yearly') => {
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
      
      // Refresh providers data
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      setProviders((pData as ProviderRow[]) || [])
    } catch (error: any) {
      setMessage(`Error updating subscription type: ${error.message}`)
    }
  }

  /**
   * LOAD CHANGE REQUESTS
   * 
   * This function loads all change requests from the database for admin review.
   * It fetches all change requests ordered by creation date (newest first).
   * 
   * How it works:
   * 1. Queries the provider_change_requests table
   * 2. Orders by created_at descending to show newest requests first
   * 3. Updates the changeRequests state with the fetched data
   * 
   * This provides the admin with a complete list of all pending change requests.
   */
  const loadChangeRequests = async () => {
    try {
      console.log('[Admin] Loading change requests via loadChangeRequests function...')
      
      // First, load change requests without joins to avoid foreign key issues
      const { data, error } = await supabase
        .from('provider_change_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Admin] Error loading change requests:', error)
        setError(`Failed to load change requests: ${error.message}`)
        return
      }

      console.log('[Admin] Change requests loaded successfully:', data?.length || 0, 'requests')
      
      // Now enrich the data with provider and profile information
      const enrichedChangeRequests = await Promise.all(
        (data || []).map(async (request) => {
          // Load provider information
          let providerInfo = null
          if (request.provider_id) {
            const { data: providerData } = await supabase
              .from('providers')
              .select('id, name, email')
              .eq('id', request.provider_id)
              .maybeSingle()
            providerInfo = providerData
          }
          
          // Load profile information
          let profileInfo = null
          if (request.owner_user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, email, name')
              .eq('id', request.owner_user_id)
              .maybeSingle()
            profileInfo = profileData
          }
          
          return {
            ...request,
            providers: providerInfo,
            profiles: profileInfo
          }
        })
      )
      
      console.log('[Admin] Enriched change requests via loadChangeRequests:', enrichedChangeRequests.length)
      setChangeRequests(enrichedChangeRequests)
      
    } catch (error: any) {
      console.error('[Admin] Error loading change requests:', error)
      setError(`Failed to load change requests: ${error.message}`)
    }
  }

  useEffect(() => {
    // Load content into editor when switching drafts
    if (editorRef.current) {
      editorRef.current.innerHTML = blogDraft.content || ''
    }
  }, [blogDraft.id])

  function syncEditorToState() {
    if (!editorRef.current) return
    setBlogDraft((d) => ({ ...d, content: editorRef.current!.innerHTML }))
  }

  // Restore admin state when page loads
  useEffect(() => {
    const savedState = localStorage.getItem('admin-state')
    if (savedState) {
      try {
        const { section: savedSection, selectedProviderId: savedProviderId, timestamp } = JSON.parse(savedState)
        
        // Only restore if it's recent (within 2 hours)
        if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
          setSection(savedSection)
          setSelectedProviderId(savedProviderId)
        }
      } catch (err) {
        console.error('Failed to restore admin state:', err)
      }
    }
  }, [])

  // Save admin state when it changes
  useEffect(() => {
    if (section === 'providers' && selectedProviderId) {
      localStorage.setItem('admin-state', JSON.stringify({
        section: 'providers',
        selectedProviderId: selectedProviderId,
        timestamp: Date.now()
      }))
    }
  }, [section, selectedProviderId])

  // Clear saved state function
  const clearSavedState = () => {
    localStorage.removeItem('admin-state')
    setSelectedProviderId(null)
  }

  // Function to start creating a new provider
  const startCreateNewProvider = () => {
    setIsCreatingNewProvider(true)
    setSelectedProviderId(null) // Clear any selected provider
    setMessage(null)
    setError(null)
    // Reset form to default values
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
  }

  // Function to cancel creating new provider
  const cancelCreateProvider = () => {
    setIsCreatingNewProvider(false)
    setSelectedProviderId(null)
    setMessage(null)
    setError(null)
    // Reset form to default values
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
  }

  function applyFormat(cmd: string, value?: string) {
    try {
      editorRef.current?.focus()
      document.execCommand(cmd, false, value)
      syncEditorToState()
    } catch {}
  }

  function wrapSelectionWith(tag: string, className?: string, style?: string) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const text = sel.toString()
    if (!text) return
    const cls = className ? ` class=\"${className}\"` : ''
    const st = style ? ` style=\"${style}\"` : ''
    const html = `<${tag}${cls}${st}>${text}</${tag}>`
    document.execCommand('insertHTML', false, html)
    syncEditorToState()
    editorRef.current?.focus()
  }

  function applyHeading(level: 2 | 3) {
    try {
      const block = level === 2 ? 'H2' : 'H3'
      editorRef.current?.focus()
      document.execCommand('formatBlock', false, block)
      syncEditorToState()
    } catch {
      // Fallback wrap
      wrapSelectionWith(level === 2 ? 'h2' : 'h3')
    }
  }

  function clearFormattingToNormal() {
    try {
      editorRef.current?.focus()
      document.execCommand('removeFormat')
      document.execCommand('formatBlock', false, 'P')
      syncEditorToState()
    } catch {}
  }

  function insertEmoji(emoji: string) {
    try {
      document.execCommand('insertText', false, emoji)
      syncEditorToState()
      editorRef.current?.focus()
    } catch {}
  }

  const allEmojis = ['😀','😁','😂','🤣','😊','😇','🙂','😉','😍','😘','😋','😎','🤩','🥳','🤗','🤔','😴','🤤','🤓','🫶','👍','🔥','⭐','✨','💫','🎉','🏆','🥇','💡','📣','✅','🍔','🍟','🌮','🍣','🍕','🥗','🍜','🍩','☕','🍵','🍺','🍷','🥂','🏡','🏠','🏘️','🔑','📈','💼','⚖️','🧮','🤝','🧘','🏋️','💆','💅','🧴','🧑‍🍳','👨‍🍳','🧑‍🏫','📚','🛠️','🔧','🌿','🌞','🌧️','🌈']
  const filteredEmojis = allEmojis.filter((e) => e.includes(emojiQuery.trim()))
  // Secure server-side admin verification with client-side fallback
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean
    loading: boolean
    verified: boolean
    error?: string
  }>({ isAdmin: false, loading: true, verified: false })
  
  // Legacy client-side check for fallback
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isClientAdmin = useMemo(() => !!auth.email && adminList.includes(auth.email.toLowerCase()), [auth.email, adminList])

  /**
   * CRITICAL FIX: Admin verification race condition
   * 
   * Issue: Admin verification re-runs during auth state changes, causing isAdmin to flip from true to false.
   * 
   * Root cause: useEffect runs on every auth.email change, including during auth initialization.
   * During auth state transitions, auth.email might be temporarily undefined or the verification fails.
   * 
   * Fix: Only run verification once when auth is fully loaded, and cache the result.
   */
  useEffect(() => {
    async function verifyAdmin() {
      console.log('[Admin] Admin verification triggered for:', auth.email, 'loading:', auth.loading)
      
      if (!auth.email) {
        console.log('[Admin] No email, setting admin status to false')
        setAdminStatus({ isAdmin: false, loading: false, verified: false })
        return
      }

      // CRITICAL: Don't re-verify if already verified for this email
      if (adminStatus.verified && adminStatus.isAdmin && auth.email) {
        console.log('[Admin] Already verified as admin for this email, skipping re-verification')
        return
      }

      // CRITICAL: Don't verify during auth loading to prevent race conditions
      if (auth.loading) {
        console.log('[Admin] Auth still loading, skipping verification')
        return
      }

      console.log('[Admin] Starting admin verification for:', auth.email)
      setAdminStatus(prev => ({ ...prev, loading: true }))

      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        
        if (!token) {
          console.log('[Admin] No auth token, using client-side admin check:', isClientAdmin)
          setAdminStatus({ isAdmin: isClientAdmin, loading: false, verified: false })
          return
        }

        let url: string
        if (window.location.hostname === 'localhost') {
          url = 'http://localhost:8888/.netlify/functions/admin-verify'
        } else {
          url = `${window.location.origin}/.netlify/functions/admin-verify`
        }
        
        console.log('[Admin] Making server verification request to:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('[Admin] Server verification response:', response.status, response.ok)

        if (response.ok) {
          const result = await response.json()
          console.log('[Admin] Server verification result:', result)
          setAdminStatus({
            isAdmin: result.isAdmin,
            loading: false,
            verified: true
          })
        } else {
          console.log('[Admin] Server verification failed, using client-side check:', isClientAdmin)
          // Fallback to client-side check if server verification fails
          setAdminStatus({
            isAdmin: isClientAdmin,
            loading: false,
            verified: false,
            error: 'Server verification unavailable'
          })
        }
      } catch (err) {
        console.log('[Admin] Server verification error, using client-side check:', isClientAdmin, 'Error:', err)
        // Fallback to client-side check on error
        setAdminStatus({
          isAdmin: isClientAdmin,
          loading: false,
          verified: false,
          error: 'Server verification failed'
        })
      }
    }

    /**
     * CRITICAL FIX: Prevent re-verification during auth state changes
     * 
     * Issue: useEffect was running on every isClientAdmin change, which happens
     * during auth state updates, causing admin status to flip from true to false.
     * 
     * Root cause: isClientAdmin is a computed value that changes during auth updates,
     * triggering unnecessary re-verification that fails.
     * 
     * Fix: Only run verification when email changes AND auth is not loading.
     * Remove isClientAdmin from dependencies to prevent unnecessary re-runs.
     */
    
    // Only verify when email changes and auth is stable (not loading)
    if (!auth.loading) {
    verifyAdmin()
    }
  }, [auth.email, auth.loading]) // Removed isClientAdmin dependency

  const isAdmin = adminStatus.isAdmin
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!auth.email) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        console.log('[Admin] loading data. isAdmin?', isAdmin, 'selectedUser', selectedUser)
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', auth.email!)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', auth.email!)
        const bizQuery = supabase.from('business_applications').select('*').order('created_at', { ascending: false })
        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })
        // Enhanced providers query with all featured tracking fields
        const provQuery = isAdmin ? supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true }) : null
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }, provRes] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
          provQuery as any,
        ])
        if (cancelled) return
        if (fErr) { console.error('[Admin] funnels error', fErr); setError(fErr.message) }
        if (bErr) { console.error('[Admin] bookings error', bErr); setError((prev) => prev ?? bErr.message) }
        if (bizErr) { console.error('[Admin] business_applications error', bizErr); setError((prev) => prev ?? bizErr.message) }
        if (conErr) { console.error('[Admin] contact_leads error', conErr); setError((prev) => prev ?? conErr.message) }
        console.log('[Admin] funnels', fData)
        console.log('[Admin] bookings', bData)
        console.log('[Admin] business_applications', bizData)
        console.log('[Admin] contact_leads', conData)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])
        if (provRes && 'data' in (provRes as any)) {
          const { data: pData, error: pErr } = (provRes as any)
          if (pErr) { console.error('[Admin] providers error', pErr); setError((prev) => prev ?? pErr.message) }
          setProviders((pData as ProviderRow[]) || [])
        }
        try {
          const posts = await fetchAllBlogPosts()
          setBlogPosts(posts)
        } catch {}
        try {
          if (isAdmin) {
            const { data: session } = await supabase.auth.getSession()
            const token = session.session?.access_token
            
            if (token) {
              let url: string
              if (window.location.hostname === 'localhost') {
                url = 'http://localhost:8888/.netlify/functions/admin-list-profiles'
              } else {
                url = `${window.location.origin}/.netlify/functions/admin-list-profiles`
              }
              const res = await fetch(url, { 
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              if (res.ok) {
                const payload = await res.json() as { profiles?: ProfileRow[] }
                if (payload?.profiles) setProfiles(payload.profiles)
              }
            }
          }
        } catch {}
        try {
          // Load change requests with provider and owner information
          // This should load for all users, not just admins, so they can see their own requests
          console.log('[Admin] Loading change requests...')
          
          // First, load change requests without joins to avoid foreign key issues
          const { data: crData, error: crError } = await supabase
            .from('provider_change_requests')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (crError) {
            console.error('[Admin] Change requests loading error:', crError)
            setError((prev) => prev ?? `Failed to load change requests: ${crError.message}`)
          } else {
            console.log('[Admin] Change requests loaded successfully:', crData?.length || 0, 'requests')
            
            // Now enrich the data with provider and profile information
            const enrichedChangeRequests = await Promise.all(
              (crData || []).map(async (request) => {
                // Load provider information
                let providerInfo = null
                if (request.provider_id) {
                  const { data: providerData } = await supabase
                    .from('providers')
                    .select('id, name, email')
                    .eq('id', request.provider_id)
                    .maybeSingle()
                  providerInfo = providerData
                }
                
                // Load profile information
                let profileInfo = null
                if (request.owner_user_id) {
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, email, name')
                    .eq('id', request.owner_user_id)
                    .maybeSingle()
                  profileInfo = profileData
                }
                
                return {
                  ...request,
                  providers: providerInfo,
                  profiles: profileInfo
                }
              })
            )
            
            console.log('[Admin] Enriched change requests:', enrichedChangeRequests.length)
            setChangeRequests(enrichedChangeRequests)
          }
        } catch (err) {
          console.error('[Admin] Change requests loading exception:', err)
          setError((prev) => prev ?? `Failed to load change requests: ${err}`)
        }
        try {
          console.log('[Admin] Loading job posts...')
          
          // Try the main query first
          const { data: jpData, error: jpError } = await supabase
            .from('provider_job_posts')
            .select('*')
            .order('created_at', { ascending: false })
          
          console.log('[Admin] Job posts query result:', { error: jpError, data: jpData, count: jpData?.length || 0 })
          
          if (jpError) {
            console.error('[Admin] Job posts query error:', jpError)
            
            // Try a simpler query as fallback
            console.log('[Admin] Trying fallback query...')
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('provider_job_posts')
              .select('id, provider_id, owner_user_id, title, status, created_at')
              .order('created_at', { ascending: false })
            
            console.log('[Admin] Fallback query result:', { error: fallbackError, data: fallbackData })
            
            if (fallbackError) {
              setError(`Failed to load job posts: ${jpError.message} (Fallback also failed: ${fallbackError.message})`)
            } else {
              // Use fallback data with minimal fields
              const minimalJobs = (fallbackData || []).map(job => ({
                ...job,
                description: null,
                apply_url: null,
                salary_range: null,
                decided_at: null
              })) as ProviderJobPost[]
              setJobPosts(minimalJobs)
              console.log('[Admin] Using fallback job data:', minimalJobs)
            }
          } else {
            setJobPosts((jpData as ProviderJobPost[]) || [])
            console.log('[Admin] Job posts loaded successfully:', (jpData as ProviderJobPost[]) || [])
          }
        } catch (err: any) {
          console.error('[Admin] Job posts loading exception:', err)
          setError(`Failed to load job posts: ${err.message}`)
        }
      } catch (err: any) {
        console.error('[Admin] unexpected failure', err)
        if (!cancelled) setError(err?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [auth.email, isAdmin, selectedUser, section])

  // Normalizers
  const normalizeEmail = (e?: string | null) => String(e || '').trim().toLowerCase()
  const normalizeRole = (r?: string | null) => String(r || '').trim().toLowerCase()

  // Emails of business owners (from profiles)
  const businessEmails = useMemo(() => {
    return new Set(
      profiles
        .filter((p) => normalizeRole(p.role) === 'business')
        .map((p) => normalizeEmail(p.email))
        .filter(Boolean)
    )
  }, [profiles])

  // Customer users: emails present in funnels/bookings, excluding business owner emails
  const customerUsers = useMemo(() => {
    const set = new Set<string>()
    funnels.forEach((f) => { const e = normalizeEmail(f.user_email); if (e) set.add(e) })
    bookings.forEach((b) => { const e = normalizeEmail(b.user_email); if (e) set.add(e) })
    return Array.from(set)
      .filter((e) => !businessEmails.has(normalizeEmail(e)))
      .sort()
  }, [funnels, bookings, businessEmails])

  // Filtered funnel responses based on user email filter
  // This allows admins to view responses from specific users to avoid overwhelming display
  const filteredFunnels = useMemo(() => {
    if (!funnelUserFilter.trim()) {
      // If no filter is set, show all funnel responses
      return funnels
    }
    // Filter funnels by user email (case-insensitive partial match)
    const filterLower = funnelUserFilter.toLowerCase().trim()
    return funnels.filter(funnel => 
      funnel.user_email.toLowerCase().includes(filterLower)
    )
  }, [funnels, funnelUserFilter])

  // Removed legacy businessAccounts (email-derived). Business accounts now come from profiles.role === 'business'.

  // Inline helpers for admin edits
  const [appEdits, setAppEdits] = useState<Record<string, { category: string; tagsInput: string }>>({})

  const catOptions: { key: string; name: string }[] = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' },
  ]

  async function approveApplication(appId: string) {
    setMessage(null)
    const app = bizApps.find((b) => b.id === appId)
    if (!app) return
    const draft = appEdits[appId] || { category: 'professional-services', tagsInput: '' }
    const tags = draft.tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    // Attempt to find a profile/user by the application's email so we can assign ownership to the applicant
    let ownerUserId: string | null = null
    try {
      if (app.email) {
        const { data: profRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', app.email)
          .limit(1)
        ownerUserId = ((profRows as any[])?.[0]?.id as string | undefined) || null
      }
    } catch {}
    const payload: Partial<ProviderRow> = {
      name: (app.business_name || 'Unnamed Business') as any,
      category_key: draft.category as any,
      tags: tags as any,
      phone: (app.phone || null) as any,
      email: (app.email || null) as any,
      website: null as any,
      address: null as any,
      images: [] as any,
      owner_user_id: (ownerUserId || null) as any,
    }
    const { error } = await supabase.from('providers').insert([payload as any])
    if (error) {
      setError(error.message)
    } else {
      setMessage('Application approved and provider created')
      // Delete the application now that it has been approved
      try {
        await supabase.from('business_applications').delete().eq('id', appId)
        setBizApps((rows) => rows.filter((r) => r.id !== appId))
      } catch {}
      // Refresh providers with enhanced fields
      try {
        const { data: pData } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
      } catch {}
    }
  }

  async function deleteApplication(appId: string) {
    setMessage(null)
    const { error } = await supabase.from('business_applications').delete().eq('id', appId)
    if (error) setError(error.message)
    else {
      setMessage('Application deleted')
      setBizApps((rows) => rows.filter((r) => r.id !== appId))
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
  async function saveProvider(p: ProviderRow) {
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

    // ADD THIS: Check if session is still valid before saving
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expired. Please refresh the page and try again.')
      setSavingProvider(false)
      return
    }
      
    // ADD THIS: Force refresh the Supabase client before making the request
    try {
      await supabase.from('providers').select('id').limit(1)
    } catch (err) {
      console.error('[Admin] Connection test failed:', err)
    }
    
    // CRITICAL FIX: Add timeout to prevent infinite loading state
    // This ensures the loading state is always reset even if the request hangs
    const timeoutId = setTimeout(() => {
      console.error('[Admin] Save provider timeout - resetting loading state')
      setSavingProvider(false)
      setError('Save operation timed out. Please try again.')
    }, 10000) // 10 second timeout
    
    // ADDITIONAL SAFETY: Add a backup timeout that runs regardless of the main timeout
    // This provides a failsafe in case the main timeout doesn't work as expected
    /* const backupTimeoutId = setTimeout(() => {
      console.error('[Admin] Backup timeout triggered - forcing loading state reset')
      setSavingProvider(false)
      setError('Save operation failed. Please refresh the page and try again.')
    }, 15000) // 15 second backup timeout (reduced since we removed connection test) */
    
    try {
      console.log('[Admin] Saving provider:', p.id, 'with data:', p)
      
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
        is_member: p.subscription_type ? p.is_member === true : false,
        
        // PLAN TRACKING FIELDS: Handle the new plan system properly
        // This ensures the database reflects the correct plan status and tracking
        // CRITICAL FIX: When subscription_type is null (free plan), explicitly clear featured status
        is_featured: p.subscription_type ? p.is_featured === true : false,
        featured_since: p.subscription_type ? (p.featured_since || null) : null,
        subscription_type: p.subscription_type || null,
        // REMOVED: tier: p.tier || null, - This field doesn't exist in database
        // REMOVED: paid: p.subscription_type ? p.paid === true : false, - This field doesn't exist in database
        // Using subscription_type instead to track plan (monthly/yearly/free)
        
        // Enhanced business management fields (matching My Business page)
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
        updated_at: new Date().toISOString()
      }
      
      console.log('[Admin] Update data prepared:', updateData)
      
      // SIMPLIFIED APPROACH: Direct database update without connection test
      // The connection test was causing timeouts and preventing saves
      // We'll handle errors directly from the update operation
      console.log('[Admin] Starting database update...')
      const startTime = Date.now()
      
      try {
        // DIRECT UPDATE: Simple, direct update without AbortController complexity
        // This approach is more reliable and less prone to timeout issues
        const { error } = await supabase
          .from('providers')
          .update(updateData)
          .eq('id', p.id)
        
        const duration = Date.now() - startTime
        console.log(`[Admin] Database update completed in ${duration}ms`)
        
        if (error) {
          console.error('[Admin] Provider save error:', error)
          
          // IMPROVED ERROR HANDLING: Provide specific error messages based on error type
          if (error.message.includes('timeout') || error.message.includes('aborted')) {
            setError(`Database operation timed out. This might be due to network issues or server load. Please try again in a moment.`)
            setRetryProvider(p) // Store provider for retry
          } else if (error.message.includes('permission') || error.message.includes('denied')) {
            setError(`Permission denied. Please check your admin access and try again.`)
          } else if (error.message.includes('network') || error.message.includes('connection')) {
            setError(`Network error. Please check your internet connection and try again.`)
            setRetryProvider(p) // Store provider for retry
          } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
            setError(`Database constraint error: ${error.message}. Please contact support.`)
          } else {
            setError(`Failed to save provider: ${error.message}`)
          }
          return
        }
        
        console.log('[Admin] Provider saved successfully')
        setMessage('Provider updated successfully! Changes have been saved to the database.')
        setRetryProvider(null) // Clear retry state on success
        clearSavedState() // Clear saved state after successful save
        
        // CRITICAL FIX: Refresh admin page provider data immediately after save
        // This ensures the admin page shows the updated data without requiring a page refresh
        try {
          const { data: pData } = await supabase
            .from('providers')
            .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
            .order('name', { ascending: true })
          setProviders((pData as ProviderRow[]) || [])
          console.log('[Admin] Provider data refreshed after save')
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
      // CRITICAL FIX: Always clear both timeouts and reset loading state
      // This ensures the UI never gets stuck in loading state
      clearTimeout(timeoutId)
      // clearTimeout(backupTimeoutId)
      setSavingProvider(false)
    }
  }

  // RETRY FUNCTION: Allows users to retry failed save operations
  // This is particularly useful for timeout errors that might be temporary
  const retrySaveProvider = () => {
    if (retryProvider) {
      console.log('[Admin] Retrying save for provider:', retryProvider.id)
      saveProvider(retryProvider)
    }
  }

  // Image upload functionality for admin provider editing
  // Handles both free (1 image) and featured (multiple images) accounts
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>, providerId: string) {
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

  // Remove image from provider
  async function removeImage(providerId: string, imageUrl: string) {
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

  async function deleteProvider(providerId: string) {
    setMessage(null)
    setConfirmDeleteProviderId(null)
    const res = await supabase.from('providers').delete().eq('id', providerId).select('id')
    if (res.error) {
      setError(res.error.message)
      return
    }
    const deletedCount = Array.isArray(res.data) ? res.data.length : 0
    if (deletedCount === 0) {
      // Fallback: soft-delete by tagging as 'deleted' if hard delete is not permitted
      try {
        const { data: row, error: selErr } = await supabase.from('providers').select('badges').eq('id', providerId).single()
        if (selErr) {
          setError('Delete failed and could not load row for archive. Check permissions.')
          return
        }
        const badges = Array.isArray(row?.badges) ? row?.badges as string[] : []
        const next = Array.from(new Set([...(badges || []), 'deleted']))
        const { error: updErr } = await supabase.from('providers').update({ badges: next as any }).eq('id', providerId)
        if (updErr) {
          setError('Delete failed and archive failed. Check permissions.')
          return
        }
        setMessage('Provider archived (soft-deleted)')
      } catch {
        setError('Delete failed and archive failed. Check permissions.')
        return
      }
    }
    else {
      setMessage(`Provider deleted (${deletedCount})`)
    }

    // In both cases (hard/soft), refresh the providers list from DB with enhanced fields
    try {
      const { data: pData, error: pErr } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      if (pErr) {
        setProviders((arr) => arr.filter((p) => p.id !== providerId))
      } else {
        setProviders((pData as ProviderRow[]) || [])
      }
    } catch {
      setProviders((arr) => arr.filter((p) => p.id !== providerId))
    }
    try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
  }

  async function notifyUser(user_id: string | null | undefined, subject: string, body?: string, data?: any) {
    if (!user_id) return
    try { await supabase.from('user_notifications').insert([{ user_id, subject, body: body || null, data: data || null }]) } catch {}
  }

  async function approveChangeRequest(req: ProviderChangeRequestWithDetails) {
    setMessage(null)
    try {
      if (req.type === 'update') {
        const { error } = await supabase.from('providers').update(req.changes as any).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'delete') {
        const res = await supabase.from('providers').delete().eq('id', req.provider_id).select('id')
        if (res.error) {
          // If cannot hard delete, soft-delete by adding 'deleted' badge
          const { data: row } = await supabase.from('providers').select('badges').eq('id', req.provider_id).single()
          const badges = Array.isArray((row as any)?.badges) ? ((row as any)?.badges as string[]) : []
          const next = Array.from(new Set([...(badges || []), 'deleted']))
          await supabase.from('providers').update({ badges: next as any }).eq('id', req.provider_id)
        }
      } else if (req.type === 'feature_request') {
        const { error } = await supabase.from('providers').update({ is_member: true }).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'claim') {
        const { error } = await supabase.from('providers').update({ owner_user_id: req.owner_user_id }).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      }
      await supabase.from('provider_change_requests').update({ status: 'approved', decided_at: new Date().toISOString() as any }).eq('id', req.id)
      await notifyUser(req.owner_user_id, 'Request approved', `Your ${req.type} request was approved.`, { reqId: req.id })
      setMessage('Change request approved')
      try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
      // Refresh the change requests list to show updated status
      await loadChangeRequests()
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request')
    }
  }

  async function rejectChangeRequest(req: ProviderChangeRequestWithDetails, reason?: string) {
    setMessage(null)
    try {
      await supabase.from('provider_change_requests').update({ status: 'rejected', reason: reason || null, decided_at: new Date().toISOString() as any }).eq('id', req.id)
      await notifyUser(req.owner_user_id, 'Request rejected', reason || `Your ${req.type} request was rejected.`, { reqId: req.id })
      setMessage('Change request rejected')
      // Refresh the change requests list to show updated status
      await loadChangeRequests()
    } catch (err: any) {
      setError(err?.message || 'Failed to reject request')
    }
  }

  async function approveJobPost(job: ProviderJobPost) {
    setMessage(null)
    try {
      await supabase.from('provider_job_posts').update({ status: 'approved', decided_at: new Date().toISOString() as any }).eq('id', job.id)
      await notifyUser(job.owner_user_id, 'Job post approved', `Your job post "${job.title}" was approved.`, { jobId: job.id })
      setJobPosts((arr) => arr.map((j) => j.id === job.id ? { ...j, status: 'approved', decided_at: new Date().toISOString() as any } : j))
      setMessage('Job post approved')
    } catch (err: any) {
      setError(err?.message || 'Failed to approve job post')
    }
  }

  async function rejectJobPost(job: ProviderJobPost, reason?: string) {
    setMessage(null)
    try {
      await supabase.from('provider_job_posts').update({ status: 'rejected', decided_at: new Date().toISOString() as any }).eq('id', job.id)
      await notifyUser(job.owner_user_id, 'Job post rejected', reason || `Your job post "${job.title}" was rejected.`, { jobId: job.id })
      setJobPosts((arr) => arr.map((j) => j.id === job.id ? { ...j, status: 'rejected', decided_at: new Date().toISOString() as any } : j))
      setMessage('Job post rejected')
    } catch (err: any) {
      setError(err?.message || 'Failed to reject job post')
    }
  }

  async function deleteJobPost(jobId: string) {
    if (!confirm('Are you sure you want to delete this job post? This action cannot be undone.')) {
      return
    }

    setMessage(null)
    try {
      await supabase.from('provider_job_posts').delete().eq('id', jobId)
      setJobPosts((arr) => arr.filter((j) => j.id !== jobId))
      setMessage('Job post deleted successfully')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete job post')
    }
  }

  async function deleteUser(userId: string) {
    setMessage(null)
    setDeletingUserId(userId)
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: userId } })
      if (error) throw new Error((error as any)?.message || String(error))
      // Remove from local list
      setProfiles((arr) => arr.filter((p) => p.id !== userId))
      setMessage('User deleted')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  async function deleteCustomerUser(email: string) {
    setMessage(null)
    setDeletingCustomerEmail(email)
    try {
      // Remove funnel responses and bookings for this email
      try { await supabase.from('funnel_responses').delete().eq('user_email', email) } catch {}
      try { await supabase.from('bookings').delete().eq('user_email', email) } catch {}
      // If an auth profile exists (and is not a business owner), delete the auth user as well
      try {
        const { data: prof } = await supabase.from('profiles').select('id,role').eq('email', email).limit(1).maybeSingle()
        const pid = (prof as any)?.id as string | undefined
        const role = (prof as any)?.role as string | undefined
        if (pid && role !== 'business') {
          await supabase.functions.invoke('admin-delete-user', { body: { user_id: pid } })
          setProfiles((arr) => arr.filter((p) => p.id !== pid))
        }
      } catch {}
      // Update local UI lists
      setFunnels((arr) => arr.filter((f) => f.user_email !== email))
      setBookings((arr) => arr.filter((b) => b.user_email !== email))
      setMessage('Customer user deleted')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete customer user')
    } finally {
      setDeletingCustomerEmail(null)
    }
  }

  /**
   * FETCH BUSINESS DETAILS
   * 
   * This function fetches business details for a specific business account user.
   * It looks up providers owned by the user and returns business information.
   * 
   * How it works:
   * 1. Sets loading state for the specific user
   * 2. Uses existing profile data to get user email (avoids RLS issues)
   * 3. Queries providers table for businesses owned by the user
   * 4. Returns business name, phone, and other relevant details
   * 5. Updates expandedBusinessDetails state with the fetched data
   */
  async function fetchBusinessDetails(userId: string) {
    console.log('[Admin] Fetching business details for user ID:', userId)
    setLoadingBusinessDetails(prev => ({ ...prev, [userId]: true }))
    
    try {
      // Get the user's email and name from the existing profiles data (avoids RLS issues)
      const userProfile = profiles.find(p => p.id === userId)
      const userEmail = userProfile?.email
      const userName = userProfile?.name

      console.log('[Admin] User profile data from existing data:', { email: userEmail, name: userName })
      console.log('[Admin] Available profiles data:', profiles.map(p => ({ id: p.id, email: p.email, name: p.name, role: p.role })))

      // Fetch providers owned by this user (by owner_user_id)
      const { data: businessDataByOwner, error: ownerError } = await supabase
        .from('providers')
        .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })

      console.log('[Admin] Business data by owner_user_id:', businessDataByOwner)

      // Also try to find businesses by email (in case owner_user_id doesn't match)
      let businessDataByEmail: any[] = []
      if (userEmail) {
        const { data: emailData, error: emailError } = await supabase
          .from('providers')
          .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at')
          .eq('email', userEmail)
          .order('created_at', { ascending: false })
        
        console.log('[Admin] Business data by email:', emailData)
        if (emailError) {
          console.warn('[Admin] Error fetching business details by email:', emailError)
        }
        businessDataByEmail = emailData || []
      }

      // Also try to find businesses by name (in case business name matches user name)
      let businessDataByName: any[] = []
      if (userName) {
        const { data: nameData, error: nameError } = await supabase
          .from('providers')
          .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at')
          .ilike('name', `%${userName}%`)
          .order('created_at', { ascending: false })
        
        console.log('[Admin] Business data by name search:', nameData)
        if (nameError) {
          console.warn('[Admin] Error fetching business details by name:', nameError)
        }
        businessDataByName = nameData || []
      }

      // Combine all results and remove duplicates
      const allBusinessData = [...(businessDataByOwner || []), ...businessDataByEmail, ...businessDataByName]
      const uniqueBusinessData = allBusinessData.filter((business, index, self) => 
        index === self.findIndex(b => b.id === business.id)
      )

      console.log('[Admin] Combined unique business data:', uniqueBusinessData)

      if (ownerError) {
        console.error('[Admin] Error fetching business details by owner:', ownerError)
        setError(`Failed to fetch business details: ${ownerError.message}`)
        return
      }

      // Update expanded details with the fetched business data
      setExpandedBusinessDetails(prev => ({
        ...prev,
        [userId]: uniqueBusinessData
      }))

    } catch (err: any) {
      console.error('[Admin] Error fetching business details:', err)
      setError(`Failed to fetch business details: ${err.message}`)
    } finally {
      setLoadingBusinessDetails(prev => ({ ...prev, [userId]: false }))
    }
  }

  /**
   * COLLAPSE BUSINESS DETAILS
   * 
   * This function collapses the expanded business details for a specific user.
   * It removes the user's data from the expandedBusinessDetails state.
   */
  function collapseBusinessDetails(userId: string) {
    console.log('[Admin] Collapsing business details for user ID:', userId)
    setExpandedBusinessDetails(prev => {
      const newState = { ...prev }
      delete newState[userId]
      return newState
    })
  }

  /**
   * CRITICAL FIX: Admin page auth check
   * 
   * The issue was that auth.email was temporarily undefined during auth loading,
   * causing the "Please sign in" message to show even when user was signed in.
   * 
   * Fix: Check auth.loading state to prevent premature "sign in" message.
   */
  if (!auth.email) {
    // Don't show "please sign in" message while auth is still loading
    if (auth.loading) {
      return (
        <section className="py-8">
          <div className="container-px mx-auto max-w-3xl">
            <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        </section>
      )
    }
    
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: email={auth.email || 'none'}, loading={String(auth.loading)}, isAuthed={String(auth.isAuthed)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        <div className="flex flex-col lg:items-start md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Admin' : 'Your Data'}</h1>
            {isAdmin && (
              <div className="text-xs text-neutral-500 mt-1">
                {adminStatus.verified ? '🔒 Server-verified admin' : '⚠️ Client-side admin (less secure)'}
                {adminStatus.error && ` • ${adminStatus.error}`}
              </div>
            )}
          </div>
          <div className="flex flex-col lg:items-start md:flex-row md:items-center gap-2">
            {isAdmin && (
              <>
                <select value={selectedUser || ''} onChange={(e) => setSelectedUser(e.target.value || null)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="">All users</option>
                  {customerUsers.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <select value={section} onChange={(e) => setSection(e.target.value as any)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="providers">Providers</option>
                  <option value="contact-leads">Contact / Get Featured</option>
                  <option value="customer-users">Customer Users</option>
                  <option value="business-accounts">Business Accounts</option>
                  <option value="users">Users</option>
                  <option value="business-applications">Business Applications</option>
                  <option value="owner-change-requests">Owner Change Requests</option>
                  <option value="job-posts">Job Posts</option>
                  <option value="funnel-responses">Funnel Responses</option>
                  <option value="bookings">Bookings</option>
                  <option value="blog">Blog Manager</option>
                </select>
              </>
            )}
            <button onClick={() => window.location.reload()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200 text-sm">Refresh</button>
          </div>
        </div>
        {loading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton">
                <div className="skeleton-inner space-y-3">
                  <div className="skeleton-line w-1/3"></div>
                  <div className="skeleton-chip"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {message && <div className="mt-3 text-sm text-green-700">{message}</div>}

        {/* Pending Approvals Notification Section */}
        {isAdmin && (
          <div className="mt-6 mb-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">Pending Approvals</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Pending Business Applications */}
                      {bizApps.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Business Applications</div>
                          <div className="text-xs text-amber-600 mt-1">{bizApps.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {bizApps.slice(0, 2).map(app => (
                              <div key={app.id} className="truncate">
                                {app.business_name || app.full_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {bizApps.length > 2 && <div className="text-amber-500">+{bizApps.length - 2} more</div>}
                          </div>
                        </div>
                      )}

                      {/* Pending Change Requests */}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Change Requests</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {changeRequests.filter(req => req.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {changeRequests.filter(req => req.status === 'pending').slice(0, 2).map(req => (
                              <div key={req.id} className="truncate">
                                {/* Show business name if available, otherwise show request type */}
                                {req.providers?.name ? `${req.providers.name} - ` : ''}
                                {req.type === 'feature_request' ? 'Featured Upgrade' : 
                                 req.type === 'update' ? 'Listing Update' : 
                                 req.type === 'delete' ? 'Listing Deletion' :
                                 req.type === 'claim' ? 'Business Claim' : req.type}
                              </div>
                            ))}
                            {changeRequests.filter(req => req.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{changeRequests.filter(req => req.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Job Posts */}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Job Posts</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {jobPosts.filter(job => job.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {jobPosts.filter(job => job.status === 'pending').slice(0, 2).map(job => (
                              <div key={job.id} className="truncate">
                                {job.title}
                              </div>
                            ))}
                            {jobPosts.filter(job => job.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{jobPosts.filter(job => job.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Contact Leads */}
                      {contactLeads.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Contact Leads</div>
                          <div className="text-xs text-amber-600 mt-1">{contactLeads.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {contactLeads.slice(0, 2).map(lead => (
                              <div key={lead.id} className="truncate">
                                {lead.business_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {contactLeads.length > 2 && <div className="text-amber-500">+{contactLeads.length - 2} more</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bizApps.length > 0 && (
                        <button 
                          onClick={() => setSection('business-applications')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Applications ({bizApps.length})
                        </button>
                      )}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('owner-change-requests')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Changes ({changeRequests.filter(req => req.status === 'pending').length})
                        </button>
                      )}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('job-posts')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Jobs ({jobPosts.filter(job => job.status === 'pending').length})
                        </button>
                      )}
                      {contactLeads.length > 0 && (
                        <button 
                          onClick={() => setSection('contact-leads')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Leads ({contactLeads.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin && section === 'business-applications' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Business Applications</div>
              <div className="mt-2 space-y-2 text-sm">
                {bizApps.length === 0 && <div className="text-neutral-500">No applications yet.</div>}
                {bizApps.map((row) => (
                  <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.business_name || '-'}</div>
                      <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Contact: {row.full_name || '-'} • {row.email || '-'} • {row.phone || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Category (requested): {row.category_key || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Challenge: {row.challenge || '-'}</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={(appEdits[row.id]?.category) || 'professional-services'}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category: e.target.value, tagsInput: m[row.id]?.tagsInput || '' } }))}
                        className="rounded-xl border border-neutral-200 px-3 py-2 bg-white text-xs"
                      >
                        {catOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.name}</option>
                        ))}
                      </select>
                      <input
                        placeholder="tags (comma separated)"
                        value={appEdits[row.id]?.tagsInput || ''}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category: m[row.id]?.category || 'professional-services', tagsInput: e.target.value } }))}
                        className="rounded-xl border border-neutral-200 px-3 py-2 text-xs sm:col-span-2"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => approveApplication(row.id)} className="btn btn-primary text-xs">Approve & Create Provider</button>
                      <button onClick={() => deleteApplication(row.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && section === 'contact-leads' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Featured Provider Management</div>
              
              {/* Featured Provider Filter Toggle */}
              <div className="mt-4 mb-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-700">Filter Providers:</label>
                  <div className="flex rounded-lg bg-neutral-100 p-1">
                    <button
                      onClick={() => setFeaturedProviderFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'all'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      All ({providers.length})
                    </button>
                    <button
                      onClick={() => setFeaturedProviderFilter('featured')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'featured'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Featured ({providers.filter(p => p.is_featured === true || p.is_member === true).length})
                    </button>
                    <button
                      onClick={() => setFeaturedProviderFilter('non-featured')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'non-featured'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Non-Featured ({providers.filter(p => !p.is_featured && !p.is_member).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Leads Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Contact Leads ({contactLeads.length})</h3>
                <div className="space-y-2 text-sm">
                {contactLeads.length === 0 && <div className="text-neutral-500">No leads yet.</div>}
                {contactLeads.map((row) => (
                  <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.business_name || '-'}</div>
                      <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Email: {row.contact_email || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Details: {row.details || '-'}</div>
                  </div>
                ))}
                </div>
              </div>

              {/* Featured Providers Management */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">
                  Provider Management ({filteredProviders.length} {featuredProviderFilter === 'all' ? 'total' : featuredProviderFilter})
                </h3>
                <div className="space-y-3 text-sm">
                  {filteredProviders.length === 0 && (
                    <div className="text-neutral-500 text-center py-4">
                      No {featuredProviderFilter === 'all' ? '' : featuredProviderFilter} providers found.
                    </div>
                  )}
                  {filteredProviders.map((provider) => (
                    <div key={provider.id} className="rounded-xl border border-neutral-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              provider.is_featured || provider.is_member
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {provider.is_featured || provider.is_member ? 'Featured' : 'Standard'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600">
                            <div><strong>Category:</strong> {provider.category_key}</div>
                            <div><strong>Email:</strong> {provider.email || 'N/A'}</div>
                            <div><strong>Phone:</strong> {provider.phone || 'N/A'}</div>
                            <div><strong>Created:</strong> {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'N/A'}</div>
                            
                            {/* Featured Status Information */}
                            {provider.is_featured || provider.is_member ? (
                              <>
                                <div><strong>Featured Since:</strong> {provider.featured_since ? new Date(provider.featured_since).toLocaleDateString() : 'Unknown'}</div>
                                <div><strong>Subscription:</strong> {provider.subscription_type || 'Not set'}</div>
                              </>
                            ) : null}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          {/* Featured Status Toggle */}
                          <button
                            onClick={() => toggleFeaturedStatus(provider.id, !!(provider.is_featured || provider.is_member))}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                              provider.is_featured || provider.is_member
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {provider.is_featured || provider.is_member ? 'Remove Featured' : 'Make Featured'}
                          </button>
                          
                          {/* Subscription Type Selector (only for featured providers) */}
                          {(provider.is_featured || provider.is_member) && (
                            <select
                              value={provider.subscription_type || ''}
                              onChange={(e) => {
                                const value = e.target.value as 'monthly' | 'yearly'
                                if (value) updateSubscriptionType(provider.id, value)
                              }}
                              className="px-2 py-1 text-xs border border-neutral-300 rounded-md bg-white"
                            >
                              <option value="">Set Plan</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isAdmin && section === 'customer-users' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
              <div className="font-medium">Customer Users</div>
              <ul className="mt-2 text-sm">
                {customerUsers.length === 0 && <li className="text-neutral-500">No users yet.</li>}
                {customerUsers.map((u) => (
                  <li key={u} className="py-1 border-b border-neutral-100 last:border-0 flex items-center justify-between">
                    <span>{u}</span>
                    {deletingCustomerEmail === u ? (
                      <span className="flex items-center gap-2">
                        <button onClick={() => deleteCustomerUser(u)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                        <button onClick={() => setDeletingCustomerEmail(null)} className="text-xs underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeletingCustomerEmail(u)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && section === 'business-accounts' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Business Accounts</div>
              <div className="mt-2 text-sm">
                {profiles.filter((p) => String(p.role || '').toLowerCase() === 'business').length === 0 && <div className="text-neutral-500">No business accounts yet.</div>}
                {profiles.filter((p) => String(p.role || '').toLowerCase() === 'business').map((p) => (
                  <div key={p.id} className="py-3 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                      <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                      <div className="text-xs text-neutral-500">{p.name || '—'} • business</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Dynamic Button - Shows "See More" or "Back" based on expansion state */}
                        {expandedBusinessDetails[p.id] ? (
                          <button 
                            onClick={() => collapseBusinessDetails(p.id)} 
                            className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs hover:bg-red-100"
                          >
                            Back
                          </button>
                        ) : (
                          <button 
                            onClick={() => fetchBusinessDetails(p.id)} 
                            className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 border border-blue-200 text-xs hover:bg-blue-100"
                            disabled={loadingBusinessDetails[p.id]}
                          >
                            {loadingBusinessDetails[p.id] ? 'Loading...' : 'See More'}
                          </button>
                        )}
                      {deletingUserId === p.id ? (
                        <>
                          <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                          <button onClick={() => setDeletingUserId(null)} className="text-xs underline">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeletingUserId(p.id)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                      )}
                      </div>
                    </div>
                    
                    {/* Expanded Business Details */}
                    {expandedBusinessDetails[p.id] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-2">Business Details:</div>
                        {expandedBusinessDetails[p.id].length === 0 ? (
                          <div className="text-xs text-gray-500">No businesses found for this account.</div>
                        ) : (
                          <div className="space-y-2">
                            {expandedBusinessDetails[p.id].map((business: any) => (
                              <div key={business.id} className="text-xs bg-white p-2 rounded border">
                                <div className="font-medium text-gray-800">{business.name || 'Unnamed Business'}</div>
                                <div className="text-gray-600 mt-1">
                                  {business.phone && <div>📞 {business.phone}</div>}
                                  {business.email && <div>✉️ {business.email}</div>}
                                  {business.website && <div>🌐 {business.website}</div>}
                                  {business.address && <div>📍 {business.address}</div>}
                                  <div className="mt-1">
                                    <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1">
                                      {business.category_key || 'No category'}
                                    </span>
                                    {business.is_member && (
                                      <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mr-1">
                                        Featured
                                      </span>
                                    )}
                                    {business.published ? (
                                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                        Published
                                      </span>
                                    ) : (
                                      <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                        Draft
                                      </span>
                                    )}
                                  </div>
                    </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && section === 'business-owners' && (
            <>
              <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
                <div className="font-medium">Business Owners</div>
                <div className="mt-2 text-sm">
                  {profiles.filter((p) => (p.role || 'community') === 'business').length === 0 && <div className="text-neutral-500">No business owners found.</div>}
                  {profiles.filter((p) => (p.role || 'community') === 'business').map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                        <div className="text-xs text-neutral-500">{p.name || '—'} • business</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deletingUserId === p.id ? (
                          <>
                            <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                            <button onClick={() => setDeletingUserId(null)} className="text-xs underline">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeletingUserId(p.id)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
                <div className="font-medium">Users</div>
                <div className="mt-2 text-sm">
                  {profiles.filter((p) => (p.role || 'community') !== 'business').length === 0 && <div className="text-neutral-500">No users found.</div>}
                  {profiles.filter((p) => (p.role || 'community') !== 'business').map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                        <div className="text-xs text-neutral-500">{p.name || '—'}{p.role ? ` • ${p.role}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deletingUserId === p.id ? (
                          <>
                            <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                            <button onClick={() => setDeletingUserId(null)} className="text-xs underline">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeletingUserId(p.id)} disabled={auth.email?.toLowerCase() === (p.email || '').toLowerCase()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs disabled:opacity-50">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {section === 'funnel-responses' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Funnel Responses</div>
            
            {/* User Filter Section - allows filtering by specific user email to avoid overwhelming display */}
            <div className="mt-3 mb-4">
              <div className="flex items-center gap-3">
                <label htmlFor="funnel-user-filter" className="text-sm font-medium text-neutral-700">
                  Filter by user email:
                </label>
                <div className="flex-1 relative">
                  <input
                    id="funnel-user-filter"
                    type="text"
                    value={funnelUserFilter}
                    onChange={(e) => setFunnelUserFilter(e.target.value)}
                    placeholder="Enter user email to filter..."
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400"
                    list="funnel-user-emails"
                  />
                  {/* Dropdown with existing user emails for quick selection */}
                  <datalist id="funnel-user-emails">
                    {Array.from(new Set(funnels.map(f => f.user_email).filter(Boolean))).sort().map(email => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                </div>
                {funnelUserFilter && (
                  <button
                    onClick={() => setFunnelUserFilter('')}
                    className="rounded-full bg-neutral-100 text-neutral-600 px-3 py-1.5 text-xs hover:bg-neutral-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Show filter status and count */}
              <div className="mt-2 text-xs text-neutral-500">
                {funnelUserFilter ? (
                  <>Showing {filteredFunnels.length} of {funnels.length} responses</>
                ) : (
                  <>Showing all {funnels.length} responses</>
                )}
              </div>
            </div>
            
            <div className="mt-2 space-y-2 text-sm">
              {filteredFunnels.length === 0 && (
                <div className="text-neutral-500">
                  {funnelUserFilter ? 'No responses found for this user.' : 'No entries yet.'}
                </div>
              )}
              {filteredFunnels.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category_key}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <div className="mt-1 text-xs text-neutral-600">User: {row.user_email}</div>
                  <textarea className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" style={{ height: '14vh' }} defaultValue={JSON.stringify(row.answers, null, 2)} onChange={(e) => setEditFunnel((m) => ({ ...m, [row.id]: e.target.value }))} />
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={async () => { try { const next = (() => { try { return JSON.parse(editFunnel[row.id] || JSON.stringify(row.answers || {})) } catch { return row.answers } })(); const { error } = await supabase.from('funnel_responses').update({ answers: next as any }).eq('id', row.id); if (error) setError(error.message); else setMessage('Funnel updated') } catch {} }} className="btn btn-secondary text-xs">Save</button>
                    <button onClick={async () => { const { error } = await supabase.from('funnel_responses').delete().eq('id', row.id); if (error) setError(error.message); else { setFunnels((arr) => arr.filter((f) => f.id !== row.id)); setMessage('Funnel deleted') } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {section === 'bookings' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Bookings</div>
            <div className="mt-2 space-y-2 text-sm">
              {bookings.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {bookings.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category_key}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <input className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" defaultValue={row.name || ''} placeholder="Name" onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), name: e.target.value } }))} />
                  <textarea className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" defaultValue={row.notes || ''} placeholder="Notes" onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), notes: e.target.value } }))} />
                  {row.answers && <textarea className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" defaultValue={JSON.stringify(row.answers, null, 2)} onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), answers: e.target.value } }))} />}
                  <select className="mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs bg-white" defaultValue={row.status || 'new'} onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), status: e.target.value } }))}>
                    <option value="new">new</option>
                    <option value="in_progress">in_progress</option>
                    <option value="closed">closed</option>
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={async () => { const edit = editBooking[row.id] || {}; const payload: any = { name: edit.name ?? row.name, notes: edit.notes ?? row.notes, status: edit.status ?? row.status }; if (typeof edit.answers === 'string') { try { payload.answers = JSON.parse(edit.answers) } catch {} } const { error } = await supabase.from('bookings').update(payload).eq('id', row.id); if (error) setError(error.message); else setMessage('Booking saved') }} className="btn btn-secondary text-xs">Save</button>
                    <button onClick={async () => { const { error } = await supabase.from('bookings').delete().eq('id', row.id); if (error) setError(error.message); else { setBookings((arr) => arr.filter((b) => b.id !== row.id)); setMessage('Booking deleted') } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
        {isAdmin && section === 'providers' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="flex items-center justify-between">
              <div className="font-medium">Providers Management</div>
              <div className="flex items-center gap-2">
                {!isCreatingNewProvider ? (
                  <button
                    onClick={startCreateNewProvider}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm"
                  >
                    + Create New Provider
                  </button>
                ) : (
                  <button
                    onClick={cancelCreateProvider}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium text-sm"
                  >
                    Cancel Create
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 text-sm">
              {providers.length === 0 && <div className="text-neutral-500">No providers found.</div>}
              {providers.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      list="providers-list"
                      placeholder="Type to search provider"
                      onChange={(e) => {
                        const name = e.target.value
                        const match = providers.find((p) => p.name.toLowerCase() === name.toLowerCase())
                        if (match) {
                          setSelectedProviderId(match.id)
                        }
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2"
                    />
                    <select
                      value={selectedProviderId || ''}
                      onChange={(e) => {
                        setSelectedProviderId(e.target.value || null)
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
                    >
                      <option value="">Select provider…</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <datalist id="providers-list">
                      {providers.map((p) => (
                        <option key={p.id} value={p.name}></option>
                      ))}
                    </datalist>
                  </div>
                  {/* Enhanced Provider Edit Form - Matching My Business Page Functionality */}
                  {(() => {
                    // If creating new provider, use the form state
                    if (isCreatingNewProvider) {
                      return (
                        <div className="rounded-xl border border-green-200 p-6 bg-green-50">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-lg font-semibold text-green-900">Create New Provider</h3>
                              <p className="text-sm text-green-700 mt-1">Fill out the form below to create a new provider</p>
                            </div>
                            <button
                              onClick={cancelCreateProvider}
                              className="text-green-600 hover:text-green-800 text-xl"
                            >
                              ✕
                            </button>
                          </div>
                          {/* Use the existing form but with newProviderTemplate */}
                          {/* The existing form content will be copied here - continuing with the form fields */}
                          
                          {/* Core Business Information */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-md font-medium text-green-800 mb-4">Core Business Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Business Name *
                                  </label>
                                  <input 
                                    value={newProviderForm.name || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, name: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="Enter business name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Category *
                                  </label>
                                  <select 
                                    value={newProviderForm.category_key || 'professional-services'} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, category_key: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                  >
                                    {catOptions.map((opt) => (
                                      <option key={opt.key} value={opt.key}>{opt.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Phone Number
                                  </label>
                                  <input 
                                    value={newProviderForm.phone || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, phone: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="(619) 123-4567"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Email Address
                                  </label>
                                  <input 
                                    value={newProviderForm.email || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, email: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="business@example.com"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Website
                                  </label>
                                  <input 
                                    value={newProviderForm.website || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, website: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="https://www.example.com"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Address
                                  </label>
                                  <input 
                                    value={newProviderForm.address || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, address: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="123 Main St, Bonita, CA 91902"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Plan Selection */}
                            <div>
                              <h4 className="text-md font-medium text-green-800 mb-4">Plan Type</h4>
                              <select 
                                value={newProviderForm.subscription_type || 'free'} 
                                onChange={(e) => {
                                  const newPlan = e.target.value
                                  setNewProviderForm(prev => ({
                                    ...prev,
                                    subscription_type: newPlan === 'free' ? null : newPlan,
                                    is_member: newPlan !== 'free',
                                    is_featured: newPlan !== 'free',
                                    featured_since: newPlan !== 'free' ? new Date().toISOString() : null
                                  }))
                                }}
                                className="rounded-lg border border-green-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="free">Free Plan</option>
                                <option value="monthly">Monthly ($100/mo)</option>
                                <option value="yearly">Yearly ($1000/yr)</option>
                              </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4 pt-4 border-t border-green-200">
                              <button 
                                onClick={() => {
                                  const providerToSave: ProviderRow = {
                                    id: 'new',
                                    name: newProviderForm.name || '',
                                    category_key: newProviderForm.category_key || 'professional-services',
                                    tags: newProviderForm.tags || [],
                                    badges: newProviderForm.badges || [],
                                    rating: newProviderForm.rating || null,
                                    phone: newProviderForm.phone || null,
                                    email: newProviderForm.email || null,
                                    website: newProviderForm.website || null,
                                    address: newProviderForm.address || null,
                                    images: newProviderForm.images || [],
                                    owner_user_id: newProviderForm.owner_user_id || null,
                                    is_member: newProviderForm.is_member || false,
                                    is_featured: newProviderForm.is_featured || false,
                                    featured_since: newProviderForm.featured_since || null,
                                    subscription_type: newProviderForm.subscription_type || null,
                                    description: newProviderForm.description || null,
                                    specialties: newProviderForm.specialties || null,
                                    social_links: newProviderForm.social_links || null,
                                    business_hours: newProviderForm.business_hours || null,
                                    service_areas: newProviderForm.service_areas || null,
                                    google_maps_url: newProviderForm.google_maps_url || null,
                                    bonita_resident_discount: newProviderForm.bonita_resident_discount || null,
                                    published: newProviderForm.published ?? true,
                                    created_at: newProviderForm.created_at || null,
                                    updated_at: newProviderForm.updated_at || null,
                                    booking_enabled: newProviderForm.booking_enabled || false,
                                    booking_type: newProviderForm.booking_type || null,
                                    booking_instructions: newProviderForm.booking_instructions || null,
                                    booking_url: newProviderForm.booking_url || null
                                  }
                                  saveProvider(providerToSave)
                                }} 
                                disabled={savingProvider || !newProviderForm.name?.trim()}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {savingProvider && (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                )}
                                {savingProvider ? 'Creating...' : 'Create Provider'}
                              </button>
                              <button
                                onClick={cancelCreateProvider}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Existing logic for editing
                    const editingProvider = selectedProviderId
                      ? providers.find(p => p.id === selectedProviderId)
                      : providers[0]
                    
                    if (!editingProvider) return null
                    
                    return (
                    <div className="rounded-xl border border-neutral-200 p-6 bg-white">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900">Editing: {editingProvider.name}</h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            {(() => {
                              // ACCOUNT STATUS DISPLAY: Use subscription_type to determine account status
                              // This ensures the display matches the actual plan system
                              if (editingProvider.subscription_type) {
                                return 'Featured Account'
                              }
                              return 'Free Account'
                            })()} • 
                            Category: {editingProvider.category_key}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* PLAN DROPDOWN: Replace checkbox with plan selection dropdown */}
                          {/* This allows admins to set providers as free, monthly, or yearly plans */}
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-neutral-700">Plan Type:</label>
                            <select 
                              value={editingProvider.subscription_type || 'free'} 
                              onChange={(e) => {
                                const newPlan = e.target.value
                                const now = new Date().toISOString()
                                setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? {
                                    ...p, 
                                  subscription_type: newPlan === 'free' ? null : newPlan,
                                  is_member: newPlan !== 'free',
                                  is_featured: newPlan !== 'free',
                                    featured_since: newPlan !== 'free' ? (p.featured_since || now) : null
                                  } : p
                                ))
                              }}
                              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                            >
                              <option value="free">Free</option>
                              <option value="monthly">Monthly ($100/mo)</option>
                              <option value="yearly">Yearly ($1000/yr)</option>
                            </select>
                          </div>
                          
                          {/* PLAN DURATION DISPLAY: Show how long the provider has been on their current plan */}
                          {/* This helps admins track plan duration and billing cycles */}
                          {editingProvider.subscription_type && editingProvider.featured_since && (
                            <div className="text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                              Featured since: {new Date(editingProvider.featured_since).toLocaleDateString()}
                              {editingProvider.subscription_type && (
                                <span className="ml-1">
                                  ({editingProvider.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} plan)
                                </span>
                              )}
                              {/* DURATION CALCULATOR: Show how long they've been featured */}
                              {(() => {
                                const startDate = new Date(editingProvider.featured_since!)
                                const now = new Date()
                                const diffTime = Math.abs(now.getTime() - startDate.getTime())
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                const diffMonths = Math.floor(diffDays / 30)
                                const diffYears = Math.floor(diffDays / 365)
                                
                                let durationText = ''
                                if (diffYears > 0) {
                                  durationText = `${diffYears} year${diffYears > 1 ? 's' : ''}`
                                } else if (diffMonths > 0) {
                                  durationText = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
                                } else {
                                  durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`
                                }
                                
                                return (
                                  <span className="ml-1 text-green-600 font-medium">
                                    ({durationText} ago)
                                  </span>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Core Business Information */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">Core Business Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Business Name *
                              </label>
                              <input 
                                value={editingProvider.name || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, name: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="Enter business name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Category *
                              </label>
                              <select 
                                value={editingProvider.category_key} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, category_key: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                              >
                          {catOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.name}</option>
                          ))}
                        </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Phone Number
                        </label>
                              <input 
                                value={editingProvider.phone || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, phone: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="(619) 123-4567"
                              />
                      </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Email Address
                              </label>
                              <input 
                                value={editingProvider.email || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, email: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="business@example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Website
                              </label>
                              <input 
                                value={editingProvider.website || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, website: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://www.example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Address
                              </label>
                              <input 
                                value={editingProvider.address || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, address: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="123 Main St, Bonita, CA 91902"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Business Description */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Description
                              <span className="text-xs text-neutral-500 ml-2">
                                ({(editingProvider.description?.length || 0)}/{editingProvider.is_member ? '500' : '200'} characters)
                              </span>
                            </label>
                            <textarea
                              value={editingProvider.description || ''}
                              onChange={(e) => {
                                const newDescription = e.target.value
                                if (!editingProvider.is_member && newDescription.length > 200) {
                                  return
                                }
                                setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, description: newDescription } : p
                                ))
                              }}
                              rows={4}
                              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                                !editingProvider.is_member && (editingProvider.description?.length || 0) > 200
                                  ? 'border-red-300 focus:ring-red-500'
                                  : 'border-neutral-300 focus:ring-neutral-500'
                              }`}
                              placeholder="Tell customers about your business..."
                              maxLength={editingProvider.is_member ? 500 : 200}
                            />
                          </div>
                        </div>

                        {/* Bonita Residents Discount */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Special Discount for Bonita Residents
                            </label>
                            <input 
                              value={editingProvider.bonita_resident_discount || ''} 
                              onChange={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, bonita_resident_discount: e.target.value } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="e.g., 10% off for Bonita residents, Free consultation for locals"
                            />
                          </div>
                        </div>

                        {/* Service Areas */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Areas You Serve
                            </label>
                            <input 
                              value={(editingProvider.service_areas || []).join(', ')} 
                              onChange={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, service_areas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="Bonita, Chula Vista, San Diego, National City"
                            />
                          </div>
                        </div>

                        {/* Social Media Links - Featured Only */}
                        <div className={!editingProvider.is_member ? 'opacity-50 pointer-events-none' : ''}>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Social Media Links
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
                            )}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
                              <input 
                                value={editingProvider.social_links?.facebook || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { 
                                    ...p, 
                                    social_links: { ...p.social_links, facebook: e.target.value } 
                                  } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://facebook.com/yourbusiness"
                                disabled={!editingProvider.is_member}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                              <input 
                                value={editingProvider.social_links?.instagram || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { 
                                    ...p, 
                                    social_links: { ...p.social_links, instagram: e.target.value } 
                                  } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://instagram.com/yourbusiness"
                                disabled={!editingProvider.is_member}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Image Upload Section */}
                        <div>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Business Images
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(1 image for free accounts)</span>
                            )}
                            {editingProvider.is_member && (
                              <span className="text-sm text-green-600 ml-2">(Up to 10 images for featured accounts)</span>
                            )}
                          </h4>
                          
                          {/* Current Images Display */}
                          {editingProvider.images && editingProvider.images.length > 0 && (
                            <div className="mb-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {editingProvider.images.map((imageUrl, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`Business image ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                                    />
                                    <button
                                      onClick={() => removeImage(editingProvider.id, imageUrl)}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                      title="Remove image"
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
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Upload Images
                              </label>
                              <input
                                type="file"
                                multiple={editingProvider.is_member === true}
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, editingProvider.id)}
                                disabled={uploadingImages}
                                className="w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <p className="text-xs text-neutral-500 mt-1">
                                {editingProvider.is_member 
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
                            {editingProvider.images && editingProvider.images.length >= (editingProvider.is_member ? 10 : 1) && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                  <strong>Image limit reached:</strong> {editingProvider.is_member ? 'Featured accounts can have up to 10 images.' : 'Free accounts can have 1 image.'} 
                                  {!editingProvider.is_member && ' Upgrade to featured to upload more images.'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Booking System - Featured Only */}
                        <div className={!editingProvider.is_member ? 'opacity-50 pointer-events-none' : ''}>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Booking System Configuration
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
                            )}
                          </h4>
                          
                          {!editingProvider.is_member && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-sm text-amber-800">
                                <strong>Upgrade to Featured</strong> to enable online booking and appointment scheduling.
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-4">
                            {/* Enable Booking Toggle */}
                            <div>
                              <label className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={editingProvider.booking_enabled === true} 
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_enabled: e.target.checked } : p
                                  ))} 
                                  className="rounded border-neutral-300"
                                  disabled={!editingProvider.is_member}
                                />
                                <span className="text-sm font-medium text-neutral-700">
                                  Enable Online Booking
                                </span>
                              </label>
                              <p className="text-xs text-neutral-500 mt-1 ml-6">
                                Allow customers to book appointments or reservations online
                              </p>
                            </div>

                            {/* Booking Type */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Booking Type
                                </label>
                                <select 
                                  value={editingProvider.booking_type || ''} 
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_type: e.target.value as any || null } : p
                                  ))} 
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                                  disabled={!editingProvider.is_member}
                                >
                                  <option value="">Select booking type...</option>
                                  <option value="appointment">Appointment</option>
                                  <option value="reservation">Reservation</option>
                                  <option value="consultation">Consultation</option>
                                  <option value="walk-in">Walk-in Only</option>
                                </select>
                              </div>
                            )}

                            {/* Booking Instructions */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Booking Instructions
                                </label>
                                <textarea
                                  value={editingProvider.booking_instructions || ''}
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_instructions: e.target.value } : p
                                  ))}
                                  rows={3}
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                                  placeholder="e.g., Please call ahead for same-day appointments, Book at least 24 hours in advance, Walk-ins welcome during business hours"
                                  disabled={!editingProvider.is_member}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                  Instructions that will be shown to customers when they try to book
                                </p>
                              </div>
                            )}

                            {/* External Booking URL */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  External Booking URL (Optional)
                                </label>
                                <input 
                                  value={editingProvider.booking_url || ''} 
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_url: e.target.value } : p
                                  ))} 
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                  placeholder="https://calendly.com/yourbusiness or https://yourbookingplatform.com"
                                  disabled={!editingProvider.is_member}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                  If you use an external booking platform, enter the URL here. Otherwise, customers will see booking instructions.
                                </p>
                              </div>
                            )}

                            {/* Booking Preview */}
                            {editingProvider.booking_enabled && editingProvider.is_member && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h5 className="text-sm font-medium text-blue-900 mb-2">Booking Preview</h5>
                                <div className="text-sm text-blue-800">
                                  <p><strong>Type:</strong> {editingProvider.booking_type || 'Not specified'}</p>
                                  {editingProvider.booking_url && (
                                    <p><strong>External URL:</strong> <a href={editingProvider.booking_url} target="_blank" rel="noopener noreferrer" className="underline">{editingProvider.booking_url}</a></p>
                                  )}
                                  {editingProvider.booking_instructions && (
                                    <p><strong>Instructions:</strong> {editingProvider.booking_instructions}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Tags</label>
                            <input 
                              value={(editingProvider.tags || []).join(', ')} 
                              onChange={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="professional, reliable, local, certified"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => saveProvider(editingProvider)} 
                            disabled={savingProvider}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {savingProvider && (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {savingProvider ? 'Saving...' : 'Save Changes'}
                          </button>
                        <button
                          onClick={() => {
                            const id = editingProvider.id
                            if (confirmDeleteProviderId === id) deleteProvider(id)
                            else setConfirmDeleteProviderId(id)
                          }}
                            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                        >
                          {confirmDeleteProviderId === editingProvider.id ? 'Confirm Delete' : 'Delete Provider'}
                        </button>
                        {confirmDeleteProviderId === editingProvider.id && (
                            <button 
                              onClick={() => setConfirmDeleteProviderId(null)} 
                              className="px-4 py-2 text-neutral-500 hover:text-neutral-700 underline"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        
                        <div className="text-sm text-neutral-500">
                          Last updated: {editingProvider.updated_at ? new Date(editingProvider.updated_at).toLocaleString() : 'Never'}
                        </div>
                      </div>
                      
                      {/* Save Status Messages */}
                      {message && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-800 font-medium">{message}</span>
                      </div>
                    </div>
                  )}
                      
                      {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-800 font-medium">{error}</span>
                            </div>
                            {/* RETRY BUTTON: Show retry button for timeout and network errors */}
                            {retryProvider && (
                              <button
                                onClick={retrySaveProvider}
                                disabled={savingProvider}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {savingProvider ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Retrying...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Retry
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && section === 'owner-change-requests' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Owner Change Requests</div>
            <div className="mt-2 space-y-2 text-sm">
              {changeRequests.length === 0 && <div className="text-neutral-500">No requests yet.</div>}
              {changeRequests.filter((r) => r.status === 'pending').map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {r.type === 'update' ? 'Business Listing Update' : 
                       r.type === 'delete' ? 'Business Listing Deletion' :
                       r.type === 'feature_request' ? 'Featured Upgrade Request' :
                       r.type === 'claim' ? 'Business Claim Request' : r.type}
                    </div>
                    <div className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  
                  {/* Show the actual changes being requested in a user-friendly format */}
                  {r.changes && Object.keys(r.changes).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-1">Proposed Changes:</div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {Object.entries(r.changes).map(([field, value]) => (
                          <div key={field} className="flex justify-between">
                            <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>
                            <span className="ml-2">
                              {field === 'pricing_options' ? (
                                // Format pricing options nicely
                                typeof value === 'object' && value !== null ? 
                                  (value as any).annual || '$97/year' : 
                                  '$97/year'
                              ) : typeof value === 'object' ? 
                                JSON.stringify(value) : 
                                String(value || 'Not provided')
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-neutral-600 mt-1">
                    <div><strong>Business:</strong> {r.providers?.name || 'Unknown Business'}</div>
                    <div><strong>Owner:</strong> {r.profiles?.name || r.profiles?.email || 'Unknown Owner'}</div>
                    <div><strong>Owner Email:</strong> {r.profiles?.email || 'Unknown Email'}</div>
                    <div><strong>Provider ID:</strong> {r.provider_id}</div>
                  </div>
                  {r.reason && <div className="text-xs text-neutral-600 mt-1">Reason: {r.reason}</div>}
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button 
                      onClick={() => approveChangeRequest(r)} 
                      className="btn btn-primary text-xs"
                      disabled={r.status !== 'pending'}
                    >
                      {r.status === 'pending' ? 'Approve' : r.status}
                    </button>
                    <button 
                      onClick={() => rejectChangeRequest(r)} 
                      className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                      disabled={r.status !== 'pending'}
                    >
                      {r.status === 'pending' ? 'Reject' : r.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isAdmin && section === 'job-posts' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Job Posts</div>
            
            {/* Debug Info */}
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
              <div className="font-medium text-yellow-800 mb-1">Debug Info:</div>
              <div className="text-yellow-700">
                Total jobs: {jobPosts.length} | 
                Pending: {jobPosts.filter(j => j.status === 'pending').length} | 
                Approved: {jobPosts.filter(j => j.status === 'approved').length} | 
                Rejected: {jobPosts.filter(j => j.status === 'rejected').length}
              </div>
              {jobPosts.length > 0 && (
                <div className="mt-1 text-yellow-600">
                  Statuses: {jobPosts.map(j => j.status).join(', ')}
                </div>
              )}
            </div>
            
            <div className="mt-2 space-y-2 text-sm">
              {jobPosts.length === 0 && <div className="text-neutral-500">No job posts yet.</div>}
              
              {/* All Jobs - Grouped by Status */}
              {jobPosts.length > 0 && (
                <div className="space-y-4">
                  {/* Pending Jobs */}
                  {jobPosts.filter((j) => j.status === 'pending').length > 0 && (
                    <div>
                      <h4 className="font-medium text-amber-800 mb-2">Pending Review ({jobPosts.filter((j) => j.status === 'pending').length})</h4>
                      {jobPosts.filter((j) => j.status === 'pending').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                  
                  {/* Approved Jobs */}
                  {jobPosts.filter((j) => j.status === 'approved').length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">Approved ({jobPosts.filter((j) => j.status === 'approved').length})</h4>
                      {jobPosts.filter((j) => j.status === 'approved').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                  
                  {/* Rejected Jobs */}
                  {jobPosts.filter((j) => j.status === 'rejected').length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Rejected ({jobPosts.filter((j) => j.status === 'rejected').length})</h4>
                      {jobPosts.filter((j) => j.status === 'rejected').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Legacy pending jobs display - keeping for now */}
              {false && jobPosts.filter((j) => j.status === 'pending').map((j) => (
                <div key={j.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{j.title}</div>
                    <div className="text-xs text-neutral-500">{new Date(j.created_at).toLocaleString()}</div>
                  </div>
                  {j.description && <div className="mt-1 text-xs text-neutral-700 whitespace-pre-wrap">{j.description}</div>}
                  <div className="mt-1 text-xs text-neutral-600">Apply: {j.apply_url || '-'}</div>
                  <div className="mt-1 text-xs text-neutral-600">Salary: {j.salary_range || '-'}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => approveJobPost(j)} className="btn btn-primary text-xs">Approve</button>
                    <button onClick={() => rejectJobPost(j)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isAdmin && section === 'blog' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Blog Post Manager</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-2">
                  <select value={blogDraft.category_key} onChange={(e) => setBlogDraft((d) => ({ ...d, category_key: e.target.value }))} className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                    <option value="restaurants-cafes">Restaurants & Cafés — Top 5 Restaurants This Month</option>
                    <option value="home-services">Home Services — Bonita Home Service Deals</option>
                    <option value="health-wellness">Health & Wellness — Wellness Spotlight</option>
                    <option value="real-estate">Real Estate — Property Opportunities in Bonita</option>
                    <option value="professional-services">Professional Services — Top Professional Services of Bonita</option>
                  </select>
                  <input value={blogDraft.title} onChange={(e) => setBlogDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Post title" className="rounded-xl border border-neutral-200 px-3 py-2" />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-neutral-500">Format:</span>
                    <button type="button" onClick={() => applyFormat('bold')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white font-semibold">B</button>
                    <button type="button" onClick={() => applyFormat('italic')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white italic">I</button>
                    <button type="button" onClick={() => applyFormat('underline')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white underline">U</button>
                    <button type="button" onClick={() => applyHeading(2)} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">H2</button>
                    <button type="button" onClick={() => applyHeading(3)} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">H3</button>
                    <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:20px;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Large</button>
                    <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:24px; font-weight:700;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">XL Bold</button>
                    <button type="button" onClick={clearFormattingToNormal} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Normal</button>
                    <button type="button" onClick={() => setEmojiOpen(true)} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Emoji</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={syncEditorToState}
                    className="rounded-xl border border-neutral-200 px-3 py-2 min-h-[200px] bg-white prose max-w-none space-y-4"
                    style={{ outline: 'none' as any }}
                  />
                  {emojiOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/20" onClick={() => setEmojiOpen(false)}></div>
                      <div className="relative rounded-2xl border border-neutral-200 bg-white p-3 w-[380px] max-h-[70vh] flex flex-col shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">Choose Emoji</div>
                          <button className="text-sm" onClick={() => setEmojiOpen(false)}>Close</button>
                        </div>
                        <input value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Search…" className="mt-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                        <div className="mt-2 grid grid-cols-8 gap-1 overflow-auto">
                          {filteredEmojis.map((e, i) => (
                            <button key={i} type="button" onClick={() => { insertEmoji(e); setEmojiOpen(false) }} className="h-9 w-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-lg">{e}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Image Upload Section */}
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium text-neutral-700">Images</div>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length === 0) return
                          
                          setMessage('Uploading images...')
                          const uploadPromises = files.map(file => uploadBlogImage(file))
                          const urls = await Promise.all(uploadPromises)
                          const validUrls = urls.filter(url => url !== null) as string[]
                          
                          if (validUrls.length > 0) {
                            setBlogDraft(prev => ({
                              ...prev,
                              images: [...(prev.images || []), ...validUrls]
                            }))
                            setMessage(`${validUrls.length} image(s) uploaded successfully`)
                          } else {
                            setMessage('Failed to upload images')
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white"
                      />
                      <div className="text-xs text-neutral-500">
                        Upload AI-generated images or photos to make your blog posts more engaging
                      </div>
                    </div>
                    
                    {/* Display uploaded images */}
                    {blogDraft.images && blogDraft.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {blogDraft.images.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Blog image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                            />
                            <button
                              onClick={() => {
                                setBlogDraft(prev => ({
                                  ...prev,
                                  images: prev.images?.filter((_, i) => i !== index) || []
                                }))
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setError(null); setMessage(null)
                        const { error } = await upsertBlogPost({ id: blogDraft.id, category_key: blogDraft.category_key, title: blogDraft.title, content: blogDraft.content, images: blogDraft.images } as any)
                        if (error) setError(error)
                        else {
                          setMessage('Blog post saved')
                          const posts = await fetchAllBlogPosts()
                          setBlogPosts(posts)
                          setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '', images: [] })
                        }
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Save Post
                    </button>
                    {blogDraft.id && (
                      <button onClick={() => setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '', images: [] })} className="text-xs underline">New</button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Existing Posts</div>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {blogPosts.length === 0 && <div className="text-neutral-500">No posts yet.</div>}
                  {blogPosts.map((bp) => (
                    <div key={bp.id} className="rounded-xl border border-neutral-200 p-2">
                      <div className="font-medium text-sm">{bp.title}</div>
                      <div className="text-[11px] text-neutral-500">{bp.category_key} • {new Date(bp.created_at).toLocaleString()}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => setBlogDraft({ id: bp.id, category_key: bp.category_key, title: bp.title, content: bp.content, images: bp.images || [] })} className="btn btn-secondary text-xs">Edit</button>
                        <button onClick={async () => { const { error } = await deleteBlogPost(bp.id); if (error) setError(error); else { setMessage('Post deleted'); setBlogPosts((arr) => arr.filter((p) => p.id !== bp.id)) } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Job Card Component for Admin
function JobCard({ 
  job, 
  onApprove, 
  onReject, 
  onDelete 
}: { 
  job: ProviderJobPost
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'rejected': return '❌'
      default: return '📄'
    }
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${getStatusColor(job.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(job.status)}</span>
            <h4 className="font-semibold text-lg">{job.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          <div className="text-sm text-neutral-600">
            Posted: {new Date(job.created_at).toLocaleString()}
            {job.decided_at && (
              <span className="ml-2">
                | Decided: {new Date(job.decided_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        {job.description && (
          <div>
            <span className="text-sm font-medium">Description:</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Apply URL:</span>
            <div className="mt-1">
              {job.apply_url ? (
                <a 
                  href={job.apply_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {job.apply_url}
                </a>
              ) : (
                <span className="text-neutral-500">Not provided</span>
              )}
            </div>
          </div>
          
          <div>
            <span className="font-medium">Salary Range:</span>
            <div className="mt-1">
              {job.salary_range || <span className="text-neutral-500">Not specified</span>}
            </div>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium">Provider ID:</span> {job.provider_id}
        </div>
        <div className="text-sm">
          <span className="font-medium">Owner ID:</span> {job.owner_user_id}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-current border-opacity-20">
        {job.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'approved' && (
          <>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'rejected' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
          </>
        )}
        
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-neutral-600 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

