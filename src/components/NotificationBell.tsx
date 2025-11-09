import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { query } from '../lib/supabaseQuery'
import { useAuth } from '../contexts/AuthContext'

type Notification = {
  id: string
  type: 'pending_application' | 'approved_application' | 'rejected_application' | 'admin_notification'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
  linkSection?: string
  isAdminNotification?: boolean
}

interface NotificationBellProps {
  buttonBgColor?: string
  buttonTextColor?: string
}

export default function NotificationBell({ buttonBgColor = '#89D185', buttonTextColor = '#000' }: NotificationBellProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right?: number | string; left?: number | string }>({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())
  const acknowledgedIdsRef = useRef<Set<string>>(new Set())

  const ACK_STORAGE_KEY = 'bf_notification_acknowledged_ids'

  // Load acknowledged notification ids from localStorage so we remember which notifications the user already opened.
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(ACK_STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const restored = new Set<string>(parsed.filter((id) => typeof id === 'string'))
          setAcknowledgedIds(restored)
          acknowledgedIdsRef.current = restored
        }
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to restore acknowledged notifications from storage:', err)
    }
  }, [])

  useEffect(() => {
    acknowledgedIdsRef.current = acknowledgedIds
  }, [acknowledgedIds])

  const persistAcknowledgedIds = (next: Set<string>) => {
    acknowledgedIdsRef.current = next
    setAcknowledgedIds(new Set(next))
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(Array.from(next)))
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to persist acknowledged notifications:', err)
    }
  }

  // Load notifications
  useEffect(() => {
    if (!auth.isAuthed || !auth.userId) return

    // Guard against duplicate subscriptions (React StrictMode protection)
    let isMounted = true
    const channels: Array<{ unsubscribe: () => void }> = []

    async function loadNotifications() {
      if (!isMounted) return
      try {
        const allNotifications: Notification[] = []

        // OPTIMIZED: Run all queries in parallel to reduce total request time
        // This still makes 4 REST calls, but they happen simultaneously instead of sequentially
        const [userNotifsResult, applicationsResult, providersResult] = await Promise.allSettled([
          // 1. Fetch admin notifications from user_notifications table
          supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(20),
          
          // 2. Fetch pending business applications (if user has email)
          // CRITICAL: Use centralized query utility for proper RLS handling
          auth.email
            ? query('business_applications', { logPrefix: '[NotificationBell]' })
                .select('id, business_name, status, created_at, email')
                .eq('email', auth.email.trim())
                .order('created_at', { ascending: false })
                .execute()
            : Promise.resolve({ data: null, error: null }),
          
          // 3. Fetch providers owned by user (needed for change requests)
          supabase
            .from('providers')
            .select('id, name')
            .eq('owner_user_id', auth.userId)
        ])

        // Process user notifications
        if (userNotifsResult.status === 'fulfilled') {
          const { data: userNotifs, error: userNotifsError } = userNotifsResult.value

          if (userNotifsError) {
            console.error('[NotificationBell] ❌ Error fetching user notifications:', userNotifsError)
          }

          if (userNotifs && userNotifs.length > 0) {
            const adminNotifs: Notification[] = userNotifs.map((rawNotif) => {
              let metadata: Record<string, any> | null = null
              if (rawNotif.metadata) {
                if (typeof rawNotif.metadata === 'string') {
                  try {
                    metadata = JSON.parse(rawNotif.metadata)
                  } catch (err) {
                    console.warn('[NotificationBell] Failed to parse notification metadata JSON:', err)
                  }
                } else {
                  metadata = rawNotif.metadata
                }
              }

              let dataPayload: Record<string, any> | null = null
              if (rawNotif.data) {
                if (typeof rawNotif.data === 'string') {
                  try {
                    dataPayload = JSON.parse(rawNotif.data)
                  } catch (err) {
                    console.warn('[NotificationBell] Failed to parse notification data JSON:', err)
                  }
                } else {
                  dataPayload = rawNotif.data
                }
              }

              // Consolidated mapping: table has evolved (subject/body vs title/message + optional metadata).
              const title =
                rawNotif.title ||
                rawNotif.subject ||
                (dataPayload?.title as string | undefined) ||
                (metadata?.title as string | undefined) ||
                'Notification'

              const message =
                rawNotif.message ||
                rawNotif.body ||
                (dataPayload?.message as string | undefined) ||
                (metadata?.message as string | undefined) ||
                ''

              const notifType: string | undefined =
                (rawNotif.type as string | undefined) ||
                (metadata?.type as string | undefined) ||
                (dataPayload?.type as string | undefined)

              const inferredType: Notification['type'] =
                notifType === 'application_approved'
                  ? 'approved_application'
                  : notifType === 'application_rejected'
                  ? 'rejected_application'
                  : notifType === 'application_pending'
                  ? 'pending_application'
                  : 'admin_notification'

              const linkOverride =
                rawNotif.link ||
                dataPayload?.link ||
                metadata?.link ||
                (inferredType === 'approved_application'
                  ? '/my-business'
                  : inferredType === 'rejected_application'
                  ? '/account'
                  : '/my-business')

              const linkSectionOverride =
                rawNotif.link_section ||
                dataPayload?.link_section ||
                metadata?.link_section ||
                (inferredType === 'rejected_application' ? 'applications' : undefined)

              const readState =
                rawNotif.is_read ??
                rawNotif.read ??
                Boolean(rawNotif.read_at) ??
                false

              return {
                id: rawNotif.id,
                type: inferredType,
                title,
                message,
                timestamp: rawNotif.created_at,
                read: Boolean(readState),
                link: linkOverride,
                linkSection: linkSectionOverride,
                isAdminNotification: true
              }
            })

            allNotifications.push(...adminNotifs)
          }
        }

        // Process business applications
        if (applicationsResult.status === 'fulfilled') {
          const { data: applications, error: appsError } = applicationsResult.value
          
          // DIAGNOSTIC: Log what we found
          console.log('[NotificationBell] Applications query result:', {
            error: appsError,
            count: applications?.length || 0,
            authEmail: auth.email,
            applications: applications?.map((a: any) => ({
              id: a.id,
              email: a.email,
              businessName: a.business_name,
              status: a.status
            })) || []
          })
          
          if (appsError) {
            console.error('[NotificationBell] ❌ Error fetching applications:', appsError)
          } else if (applications && applications.length > 0) {
            // Only show pending applications as unread notifications (exclude approved/rejected)
            const pendingApps = applications.filter((app: { status?: string | null; business_name?: string | null; id: string; created_at: string }) => (app.status === 'pending' || !app.status) && app.status !== 'approved' && app.status !== 'rejected')
            console.log('[NotificationBell] ✅ Found pending applications:', {
              total: applications.length,
              pending: pendingApps.length,
              businessNames: pendingApps.map((a: { business_name?: string | null }) => a.business_name)
            })
            
            const appNotifs: Notification[] = pendingApps.map((app: { status?: string | null; business_name?: string | null; id: string; created_at: string }) => ({
              id: app.id,
              type: 'pending_application' as const,
              title: 'Business Application Pending',
              message: `Your application for "${app.business_name || 'your business'}" is under review.`,
              timestamp: app.created_at,
              read: false,
              link: '/account',
              linkSection: 'applications',
              isAdminNotification: false
            }))
            allNotifications.push(...appNotifs)
          } else {
            console.log('[NotificationBell] ⚠️ No applications found (this might be expected if user hasn\'t submitted any)')
          }
        }

        // Process change requests (requires providers query to complete first)
        if (providersResult.status === 'fulfilled') {
          const { data: providers } = providersResult.value
          if (providers && providers.length > 0) {
            const providerIds = providers.map(p => p.id)
            
            // Fetch change requests for user's providers
            const { data: changeRequests } = await supabase
              .from('provider_change_requests')
              .select('id, provider_id, type, status, created_at')
              .in('provider_id', providerIds)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })

            if (changeRequests && changeRequests.length > 0) {
              const changeReqNotifs: Notification[] = changeRequests.map((req) => {
                const provider = providers.find(p => p.id === req.provider_id)
                return {
                  id: req.id,
                  type: 'pending_application' as const,
                  title: 'Business Update Pending',
                  message: `Your changes to "${provider?.name || 'your business'}" are awaiting approval.`,
                  timestamp: req.created_at,
                  read: false,
                  link: '/my-business',
                  isAdminNotification: false
                }
              })
              allNotifications.push(...changeReqNotifs)
            }
          }
        }

        // Sort all notifications by timestamp (newest first)
        allNotifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        const filteredNotifications = allNotifications.filter((notification) => {
          if (notification.isAdminNotification) return true
          return !acknowledgedIdsRef.current.has(notification.id)
        })

        setNotifications(filteredNotifications)
      } catch (error) {
        console.error('[NotificationBell] Error loading notifications:', error)
      }
    }

    loadNotifications()

    // Set up real-time subscriptions for immediate updates
    // Use unique channel names with userId to prevent conflicts
    const userId = auth.userId
    const userEmail = auth.email
    
    const userNotifsChannel = supabase
      .channel(`user_notifications_${userId}_${Date.now()}`) // Unique channel name
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          if (isMounted) loadNotifications()
        }
      )
      .subscribe()

    channels.push(userNotifsChannel)

    const changeRequestsChannel = supabase
      .channel(`provider_change_requests_${userId}_${Date.now()}`) // Unique channel name
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_change_requests'
        },
        () => {
          if (isMounted) loadNotifications()
        }
      )
      .subscribe()

    channels.push(changeRequestsChannel)

    const applicationsChannel = supabase
      .channel(`business_applications_${userId}_${Date.now()}`) // Unique channel name
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_applications',
          filter: userEmail ? `email=eq.${userEmail}` : undefined
        },
        () => {
          if (isMounted) loadNotifications()
        }
      )
      .subscribe()

    channels.push(applicationsChannel)

    // Also poll for updates every 5 minutes as backup (real-time subscriptions should handle most updates)
    // Reduced from 30 seconds to 5 minutes to minimize REST API calls
    const interval = setInterval(() => {
      if (isMounted) loadNotifications()
    }, 5 * 60 * 1000) // 5 minutes = 300000ms

    return () => {
      isMounted = false
      // Unsubscribe from all channels
      channels.forEach(channel => {
        try {
          channel.unsubscribe()
        } catch (err) {
          console.warn('[NotificationBell] Error unsubscribing channel:', err)
        }
      })
      clearInterval(interval)
    }
  }, [auth.isAuthed, auth.userId, auth.email])

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const isMobile = window.innerWidth < 768 // Tailwind 'md' breakpoint
      
      if (isMobile) {
        // On mobile: center the dropdown horizontally
        setDropdownPosition({
          top: rect.bottom + 8,
          right: undefined,
          left: '1rem' // 16px from left edge (matching max-w padding)
        })
      } else {
        // On desktop: align to right edge of button
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
          left: undefined
        })
      }
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    setNotifications(prev =>
      prev.filter(notification => notification.isAdminNotification || !acknowledgedIds.has(notification.id))
    )
  }, [acknowledgedIds])

  useEffect(() => {
    if (!isOpen || notifications.length === 0) return

    const toAcknowledge = notifications.filter(notification => 
      !notification.isAdminNotification && !acknowledgedIdsRef.current.has(notification.id)
    )

    if (toAcknowledge.length === 0) return

    const next = new Set(acknowledgedIdsRef.current)
    toAcknowledge.forEach(notification => next.add(notification.id))
    persistAcknowledgedIds(next)
  }, [isOpen, notifications])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in local state
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    )

    if (!notification.isAdminNotification) {
      const next = new Set(acknowledgedIdsRef.current)
      next.add(notification.id)
      persistAcknowledgedIds(next)
    }

    // If it's an admin notification, mark as read in database
    if (notification.isAdminNotification) {
      try {
        await supabase
          .from('user_notifications')
          .update({ is_read: true })
          .eq('id', notification.id)
      } catch (error) {
        console.error('[NotificationBell] Failed to mark notification as read:', error)
      }
    }

    // Navigate to the link with section
    if (notification.link && notification.linkSection) {
      navigate(notification.link, { state: { section: notification.linkSection } })
    } else if (notification.link) {
      navigate(notification.link)
    }

    setIsOpen(false)
  }

  if (!auth.isAuthed) {
    return null
  }

  return (
    <>
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center border-0 rounded-[calc(0.75rem-0.2rem)] px-2 md:px-4 h-full font-medium cursor-pointer transition-colors duration-300 md:ml-0"
        style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10 shadow-lg border-2 border-current">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown - Rendered in Portal to escape navbar overflow */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-[calc(100vw-2rem)] max-w-80 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-[9999]"
          style={{ 
            top: `${dropdownPosition.top}px`,
            ...(dropdownPosition.right !== undefined && { right: typeof dropdownPosition.right === 'number' ? `${dropdownPosition.right}px` : dropdownPosition.right }),
            ...(dropdownPosition.left !== undefined && { left: typeof dropdownPosition.left === 'number' ? `${dropdownPosition.left}px` : dropdownPosition.left })
          }}
        >
          <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
            <h3 className="font-semibold text-neutral-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-neutral-600 mt-0.5">{unreadCount} unread</p>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-600">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'admin_notification' ? (
                          notification.title.includes('Approved') || notification.title.includes('✅') ? 'bg-green-500' :
                          notification.title.includes('Rejected') || notification.title.includes('❌') ? 'bg-red-500' :
                          'bg-blue-500'
                        ) :
                        notification.type === 'approved_application' ? 'bg-green-500' :
                        notification.type === 'rejected_application' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-neutral-600 mb-2 line-clamp-3">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(notification.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="bg-neutral-50 px-4 py-2 border-t border-neutral-200 text-center">
              <button
                onClick={() => {
                  navigate('/account', { state: { section: 'applications' } })
                  setIsOpen(false)
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View All in Account
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

