import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load notifications
  useEffect(() => {
    if (!auth.isAuthed || !auth.userId) return

    async function loadNotifications() {
      try {
        const allNotifications: Notification[] = []

        // 1. Fetch admin notifications from user_notifications table
        const { data: userNotifs } = await supabase
          .from('user_notifications')
          .select('id, title, message, created_at, is_read')
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (userNotifs && userNotifs.length > 0) {
          const adminNotifs: Notification[] = userNotifs.map((notif) => ({
            id: notif.id,
            type: 'admin_notification' as const,
            title: notif.title,
            message: notif.message,
            timestamp: notif.created_at,
            read: notif.is_read,
            link: '/my-business',
            isAdminNotification: true
          }))
          allNotifications.push(...adminNotifs)
        }

        // 2. Fetch pending business applications (if user has email)
        if (auth.email) {
          const { data: applications } = await supabase
            .from('business_applications')
            .select('id, business_name, status, created_at')
            .eq('email', auth.email)
            .order('created_at', { ascending: false })

          if (applications && applications.length > 0) {
            // Only show pending applications as unread notifications (exclude approved/rejected)
            const appNotifs: Notification[] = applications
              .filter(app => (app.status === 'pending' || !app.status) && app.status !== 'approved' && app.status !== 'rejected')
              .map((app) => ({
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
          }
        }

        // Sort all notifications by timestamp (newest first)
        allNotifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        setNotifications(allNotifications)
      } catch (error) {
        console.error('[NotificationBell] Error loading notifications:', error)
      }
    }

    loadNotifications()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [auth.isAuthed, auth.userId, auth.email])

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right // Align right edge
      })
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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in local state
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    )

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
        className="relative hidden md:inline-flex items-center justify-center border-0 rounded-[calc(0.75rem-0.2rem)] px-4 h-full font-medium cursor-pointer transition-colors duration-300"
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
          className="fixed w-80 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-[9999]"
          style={{ 
            top: `${dropdownPosition.top}px`, 
            right: `${dropdownPosition.right}px` 
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

