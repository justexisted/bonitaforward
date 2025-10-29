/**
 * TAB DROPDOWN NAVIGATION
 * 
 * Mobile-friendly dropdown navigation for MyBusiness tabs.
 * Displays current tab with badge count and dropdown menu to switch tabs.
 */

import type { TabKey } from '../utils/tabs'

interface TabItem {
  readonly key: TabKey
  readonly label: string
  readonly count?: number
}

interface TabDropdownNavProps {
  tabs: readonly TabItem[]
  activeTab: TabKey
  isDropdownOpen: boolean
  onToggleDropdown: () => void
  onSelectTab: (tabKey: TabKey) => void
}

export function TabDropdownNav({
  tabs,
  activeTab,
  isDropdownOpen,
  onToggleDropdown,
  onSelectTab
}: TabDropdownNavProps) {
  const currentTab = tabs.find(tab => tab.key === activeTab) || tabs[0]

  return (
    <div className="mb-6">
      <div className="relative inline-block text-left w-full" data-dropdown-container>
        <div>
          <button
            type="button"
            onClick={onToggleDropdown}
            onKeyDown={(e) => {
              // Close dropdown on Escape key
              if (e.key === 'Escape') {
                onToggleDropdown()
              }
            }}
            className="inline-flex justify-between w-full rounded-xl border border-neutral-300 shadow-sm px-4 py-3 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-100 focus:ring-blue-500 my-business-dropdown-btn"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <span className="flex items-center">
              {currentTab.label}
              {('count' in currentTab) && currentTab.count! > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs">
                  {currentTab.count}
                </span>
              )}
            </span>
            <svg
              className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className="origin-top-right absolute right-0 mt-2 w-full rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
          >
            <div className="py-1" role="none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onSelectTab(tab.key)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center justify-between">
                    <span>{tab.label}</span>
                    {('count' in tab) && tab.count! > 0 && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs">
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

