import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { deleteBlogPost, fetchAllBlogPosts, upsertBlogPost, type BlogPost } from '../lib/supabaseData'
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
}

type FunnelRow = {
  id: string
  user_email: string
  category: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category: string
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
  category: string | null
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
  const [blogDraft, setBlogDraft] = useState<{ id?: string; category_key: string; title: string; content: string }>({ category_key: 'restaurants-cafes', title: '', content: '' })
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
  const [section, setSection] = useState<'business-applications' | 'contact-leads' | 'customer-users' | 'business-accounts' | 'business-owners' | 'users' | 'providers' | 'owner-change-requests' | 'job-posts' | 'funnel-responses' | 'bookings' | 'blog'>('business-applications')

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
        const provQuery = isAdmin ? supabase.from('providers').select('*').order('name', { ascending: true }) : null
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
          const { data: jpData } = await supabase.from('provider_job_posts').select('*').order('created_at', { ascending: false })
          setJobPosts((jpData as ProviderJobPost[]) || [])
        } catch {}
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

  // Removed legacy businessAccounts (email-derived). Business accounts now come from profiles.role === 'business'.

  // Inline helpers for admin edits
  const [appEdits, setAppEdits] = useState<Record<string, { category_key: string; tagsInput: string }>>({})

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
    const draft = appEdits[appId] || { category_key: 'professional-services', tagsInput: '' }
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
      category_key: draft.category_key as any,
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
      // Refresh providers
      try {
        const { data: pData } = await supabase.from('providers').select('*').order('name', { ascending: true })
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

  async function saveProvider(p: ProviderRow) {
    setMessage(null)
    const { error } = await supabase
      .from('providers')
      .update({
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
      })
      .eq('id', p.id)
    if (error) setError(error.message)
    else {
      setMessage('Provider saved')
      try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
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

    // In both cases (hard/soft), refresh the providers list from DB
    try {
      const { data: pData, error: pErr } = await supabase.from('providers').select('*').order('name', { ascending: true })
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
                  <option value="business-applications">Business Applications</option>
                  <option value="contact-leads">Contact / Get Featured</option>
                  <option value="customer-users">Customer Users</option>
                  <option value="business-accounts">Business Accounts</option>
                  <option value="users">Users</option>
                  <option value="providers">Providers</option>
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

        {/* Debug Section - Show all change requests for troubleshooting */}
        {isAdmin && (
          <div className="mt-4 mb-2 p-2 bg-gray-100 rounded text-xs">
            <strong>Debug Info:</strong> Total change requests: {changeRequests.length}, 
            Pending: {changeRequests.filter(req => req.status === 'pending').length}, 
            Approved: {changeRequests.filter(req => req.status === 'approved').length}, 
            Rejected: {changeRequests.filter(req => req.status === 'rejected').length}
          </div>
        )}

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
                    <div className="text-xs text-neutral-600 mt-1">Category (requested): {row.category || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Challenge: {row.challenge || '-'}</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={(appEdits[row.id]?.category_key) || 'professional-services'}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category_key: e.target.value, tagsInput: m[row.id]?.tagsInput || '' } }))}
                        className="rounded-xl border border-neutral-200 px-3 py-2 bg-white text-xs"
                      >
                        {catOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.name}</option>
                        ))}
                      </select>
                      <input
                        placeholder="tags (comma separated)"
                        value={appEdits[row.id]?.tagsInput || ''}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category_key: m[row.id]?.category_key || 'professional-services', tagsInput: e.target.value } }))}
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
              <div className="font-medium">Contact / Get Featured</div>
              <div className="mt-2 space-y-2 text-sm">
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
            <div className="mt-2 space-y-2 text-sm">
              {funnels.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {funnels.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <div className="mt-1 text-xs text-neutral-600">User: {row.user_email}</div>
                  <textarea className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" defaultValue={JSON.stringify(row.answers, null, 2)} onChange={(e) => setEditFunnel((m) => ({ ...m, [row.id]: e.target.value }))} />
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
                  <div className="text-neutral-800 font-medium">{row.category}</div>
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
            <div className="font-medium">Providers (Edit existing)</div>
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
                          // Move selected to front so the edit card binds to it
                          setProviders((arr) => {
                            const sel = arr.find((p) => p.id === match.id)
                            if (!sel) return arr
                            return [sel, ...arr.filter((p) => p.id !== match.id)]
                          })
                        }
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2"
                    />
                    <select
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        // Move selected to front for editing
                        setProviders((arr) => {
                          const sel = arr.find((p) => p.id === id)
                          if (!sel) return arr
                          return [sel, ...arr.filter((p) => p.id !== id)]
                        })
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
                  {/* Single edit card bound to the first provider in array */}
                  {providers[0] && (
                    <div className="rounded-xl border border-neutral-200 p-3">
                      <div className="text-neutral-700 font-medium mb-2">Editing: {providers[0].name}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={providers[0].name} onChange={(e) => setProviders((arr) => [{ ...arr[0], name: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Name" />
                        <select value={providers[0].category_key} onChange={(e) => setProviders((arr) => [{ ...arr[0], category_key: e.target.value } as any, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                          {catOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.name}</option>
                          ))}
                        </select>
                        <input value={(providers[0].tags || []).join(', ')} onChange={(e) => setProviders((arr) => [{ ...arr[0], tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Tags" />
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={providers[0].is_member === true} onChange={(e) => setProviders((arr) => [{ ...arr[0], is_member: e.target.checked }, ...arr.slice(1)])} />
                          <span>Featured (Paid)</span>
                        </label>
                        <input value={providers[0].phone || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], phone: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
                        <input value={providers[0].email || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], email: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
                        <input value={providers[0].website || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], website: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Website" />
                        <input value={providers[0].address || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], address: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Address" />
                        <input value={(providers[0].images || []).join(', ')} onChange={(e) => setProviders((arr) => [{ ...arr[0], images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-3" placeholder="Image URLs" />
                      </div>
                      <div className="mt-2">
                        <button onClick={() => saveProvider(providers[0])} className="btn btn-secondary text-xs">Save</button>
                        <button
                          onClick={() => {
                            const id = providers[0].id
                            if (confirmDeleteProviderId === id) deleteProvider(id)
                            else setConfirmDeleteProviderId(id)
                          }}
                          className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs ml-2"
                        >
                          {confirmDeleteProviderId === providers[0].id ? 'Confirm' : 'Delete'}
                        </button>
                        {confirmDeleteProviderId === providers[0].id && (
                          <button onClick={() => setConfirmDeleteProviderId(null)} className="text-xs underline text-neutral-500 ml-2">Cancel</button>
                        )}
                      </div>
                    </div>
                  )}
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
                              {typeof value === 'object' ? JSON.stringify(value) : String(value || 'Not provided')}
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
            <div className="mt-2 space-y-2 text-sm">
              {jobPosts.length === 0 && <div className="text-neutral-500">No job posts yet.</div>}
              {jobPosts.filter((j) => j.status === 'pending').map((j) => (
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setError(null); setMessage(null)
                        const { error } = await upsertBlogPost({ id: blogDraft.id, category_key: blogDraft.category_key, title: blogDraft.title, content: blogDraft.content } as any)
                        if (error) setError(error)
                        else {
                          setMessage('Blog post saved')
                          const posts = await fetchAllBlogPosts()
                          setBlogPosts(posts)
                          setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '' })
                        }
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Save Post
                    </button>
                    {blogDraft.id && (
                      <button onClick={() => setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '' })} className="text-xs underline">New</button>
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
                        <button onClick={() => setBlogDraft({ id: bp.id, category_key: bp.category_key, title: bp.title, content: bp.content })} className="btn btn-secondary text-xs">Edit</button>
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

// Blog Post Manager UI block will be rendered below the providers section
// Inserted at bottom of file in the returned JSX above


