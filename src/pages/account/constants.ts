import { 
  User, 
  Briefcase, 
  Calendar, 
  Heart, 
  CalendarDays, 
  FileText, 
  Shield, 
  Trash2 
} from 'lucide-react'
import type { SidebarItem } from './types'

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'business', label: 'Business Management', icon: Briefcase },
  { id: 'bookings', label: 'My Bookings', icon: Calendar },
  { id: 'saved-businesses', label: 'Saved', icon: Heart },
  { id: 'my-events', label: 'My Events', icon: CalendarDays },
  { id: 'applications', label: 'Pending Applications', icon: FileText },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'delete', label: 'Delete Account', icon: Trash2 },
]

