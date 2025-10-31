/**
 * SIDEBAR NAVIGATION - My Business Dashboard
 * 
 * Desktop sidebar and mobile icon grid navigation similar to Account page.
 * Provides a cleaner navigation experience than dropdown menu.
 */

import { 
  Building2, 
  FileText, 
  Briefcase, 
  Clock, 
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import type { TabKey } from '../utils/tabs'

interface TabItem {
  readonly key: TabKey
  readonly label: string
  readonly count?: number
}

interface SidebarNavProps {
  tabs: readonly TabItem[]
  activeTab: TabKey
  onSelectTab: (tabKey: TabKey) => void
}

// Icon mapping for each tab
const TAB_ICONS: Record<TabKey, typeof Building2> = {
  'listings': Building2,
  'applications': FileText,
  'jobs': Briefcase,
  'change-requests': Clock,
  'analytics': BarChart3,
  'recently-approved': CheckCircle,
  'recently-rejected': XCircle,
  'pending-requests': AlertCircle,
}

export function SidebarNav({ tabs, activeTab, onSelectTab }: SidebarNavProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <nav className="bg-white rounded-xl border border-neutral-200 p-4 sticky top-4">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-3">
            Navigation
          </h2>
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const IconComponent = TAB_ICONS[tab.key]
              const isActive = activeTab === tab.key
              
              return (
                <li key={tab.key}>
                  <button
                    onClick={() => onSelectTab(tab.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile Icon Grid */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tabs.map((tab) => {
            const IconComponent = TAB_ICONS[tab.key]
            const isActive = activeTab === tab.key
            
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700'
                }`}
              >
                <IconComponent className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-neutral-600'}`} />
                <span className={`text-xs font-medium text-center ${isActive ? 'text-green-700' : 'text-neutral-900'}`}>
                  {tab.label}
                </span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

