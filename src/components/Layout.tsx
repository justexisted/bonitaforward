import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Home, ArrowRight, ArrowLeft, User, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import SupabasePing from './SupabasePing'
import Navbar from './Navbar'
import Footer from './Footer'
import Dock, { type DockItemData } from './Dock'
import './Layout-mobile.css'

// ============================================================================
// LAYOUT COMPONENT
// ============================================================================

/**
 * Layout component - Main layout wrapper with dock navigation
 * 
 * Features:
 * - Main app layout with header, main content, and footer
 * - Dock navigation with contextual items based on user role
 * - Real-time booking notifications for business owners
 * - Supabase connection monitoring
 * - Responsive design with proper spacing
 */
export default function Layout() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [unreadBookingNotifications, setUnreadBookingNotifications] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Watch for modal-open class on body to hide Dock
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsModalOpen(document.body.classList.contains('modal-open'))
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // Check initial state
    setIsModalOpen(document.body.classList.contains('modal-open'))
    
    return () => observer.disconnect()
  }, [])

  // Load unread booking notifications for business owners
  useEffect(() => {
    if (!auth.isAuthed || !auth.userId) {
      setUnreadBookingNotifications(0)
      return
    }

    const loadNotifications = async () => {
      try {
        // Check if user owns any businesses
        const { data: providers } = await supabase
          .from('providers')
          .select('id')
          .eq('owner_user_id', auth.userId)

        if (!providers || providers.length === 0) {
          setUnreadBookingNotifications(0)
          return
        }

        // Get unread booking notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('user_id', auth.userId)
          .eq('type', 'booking_received')
          .eq('is_read', false)

        if (notificationsError) {
          console.warn('Failed to load booking notifications (table may not exist yet):', notificationsError.message)
          setUnreadBookingNotifications(0)
        } else {
          setUnreadBookingNotifications(notifications?.length || 0)
        }
      } catch (error) {
        console.warn('Failed to load booking notifications:', error)
        setUnreadBookingNotifications(0)
      }
    }

    loadNotifications()

    // Set up real-time subscription for notifications
    const subscription = supabase
      .channel('booking_notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_notifications',
          filter: `user_id=eq.${auth.userId}`
        }, 
        () => {
          // Reload notifications when they change
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [auth.isAuthed, auth.userId])

  const dockItems: DockItemData[] = [
    {
      icon: <ArrowLeft className="w-6 h-6" />,
      label: "Back",
      onClick: () => {
        window.history.back()
        // Scroll to top after a brief delay to ensure navigation completes
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
      },
      className: "!bg-gradient-to-br !from-blue-100 !to-blue-200"
    },
    {
      icon: <ArrowRight className="w-6 h-6" />,
      label: "Forward", 
      onClick: () => {
        window.history.forward()
        // Scroll to top after a brief delay to ensure navigation completes
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
      },
      className: "!bg-gradient-to-br !from-blue-100 !to-blue-200"
    },
    {
      icon: <Home className="w-6 h-6" />,
      label: "Home",
      onClick: () => {
        navigate('/')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      className: "!bg-gradient-to-br !from-red-100 !to-red-200"
    },
    {
      icon: <User className="w-6 h-6" />,
      label: "Profile",
      onClick: () => {
        navigate(auth.isAuthed ? '/account' : '/signin')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      className: "!bg-gradient-to-br !from-orange-100 !to-orange-200"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Blog",
      onClick: () => {
        navigate('/community')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      className: "!bg-gradient-to-br !from-yellow-100 !to-yellow-200"
    }
  ]

  // Add My Business item with notifications for business owners
  if (auth.isAuthed && auth.role === 'business') {
    dockItems.push({
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>,
      label: "My Business",
      onClick: () => {
        navigate('/my-business')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      notificationCount: unreadBookingNotifications,
      className: "!bg-gradient-to-br !from-green-100 !to-green-200"
    })
  }

  return (
    <div className="min-h-full flex flex-col layout-mobile-container">
      <SupabasePing />
      <Navbar />
      <main className="flex-1 overflow-x-hidden pt-4 layout-mobile-main">
        <Outlet />
      </main>
      <Footer />
      
      {/* Dock Navigation - Hidden when modals are open */}
      {!isModalOpen && (
        <Dock 
          items={dockItems}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10"
        />
      )}
    </div>
  )
}
