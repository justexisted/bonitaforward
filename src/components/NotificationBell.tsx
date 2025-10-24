import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Notification = {
  id: string
  type: 'pending_application' | 'approved_application' | 'rejected_application'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
  linkSection?: string
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
    if (!auth.isAuthed || !auth.email) return

    async function loadNotifications() {
      try {
        // Fetch pending business applications
        const { data: applications } = await supabase
          .from('business_applications')
          .select('id, business_name, status, created_at')
          .eq('email', auth.email)
          .order('created_at', { ascending: false })

        if (applications && applications.length > 0) {
          // Only show pending applications as unread notifications
          const notifs: Notification[] = applications
            .filter(app => app.status === 'pending' || !app.status)
            .map((app) => {
              return {
                id: app.id,
                type: 'pending_application' as const,
                title: 'Business Application Pending',
                message: `Your application for "${app.business_name || 'your business'}" is under review.`,
                timestamp: app.created_at,
                read: false,
                link: '/account',
                linkSection: 'applications'
              }
            })

          setNotifications(notifs)
        }
      } catch (error) {
        console.error('[NotificationBell] Error loading notifications:', error)
      }
    }

    loadNotifications()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [auth.isAuthed, auth.email])

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

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    )

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
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
                        notification.type === 'approved_application' ? 'bg-green-500' :
                        notification.type === 'rejected_application' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
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

