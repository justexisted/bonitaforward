/**
 * APP INITIALIZATION COMPONENT
 * 
 * This component handles application initialization tasks:
 * - Loading provider data on mount
 * - Setting up event listeners for data refresh
 * - Managing provider data updates
 * 
 * This is a "headless" component that renders nothing (returns null)
 * but performs critical initialization side effects.
 * 
 * Usage:
 * ```typescript
 * <AppInit setProvidersByCategory={setProvidersByCategory} />
 * ```
 */

import { useEffect } from 'react'
import type { CategoryKey, Provider } from '../types'
import { loadProviders } from '../services/providerService'

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface AppInitProps {
  /**
   * State setter for updating provider data by category
   * This is passed down from the main App component
   */
  setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void
}

// ============================================================================
// APPINIT COMPONENT
// ============================================================================

/**
 * AppInit - Application initialization component
 * 
 * Handles:
 * 1. Initial provider data loading on mount
 * 2. Event listener for manual provider refresh
 * 3. Cleanup of event listeners on unmount
 * 
 * @param props Component props containing setProvidersByCategory function
 * @returns null (this is a headless component)
 */
export default function AppInit({ setProvidersByCategory }: AppInitProps) {
  useEffect(() => {
    // ========================================================================
    // INITIAL DATA LOAD
    // ========================================================================
    
    /**
     * Load provider data immediately on mount
     * Uses the service layer which handles Supabase + Sheets fallback
     */
    const initialLoad = async () => {
      console.log('[AppInit] Starting provider data loading...')
      const supabaseSuccess = await loadProviders(setProvidersByCategory)
      console.log('[AppInit] Initial load completed, Supabase success:', supabaseSuccess)
    }
    
    // Execute initial load
    void initialLoad()
    
    // ========================================================================
    // REFRESH EVENT LISTENER
    // ========================================================================
    
    /**
     * Handle provider data refresh events
     * 
     * This allows other parts of the app to trigger a provider data reload
     * by dispatching a custom 'bf-refresh-providers' event.
     * 
     * Example usage:
     * ```typescript
     * window.dispatchEvent(new CustomEvent('bf-refresh-providers'))
     * ```
     */
    const handleRefresh = async () => {
      console.log('[AppInit] Refreshing provider data...')
      const supabaseSuccess = await loadProviders(setProvidersByCategory)
      console.log('[AppInit] Refresh completed, Supabase success:', supabaseSuccess)
    }
    
    // Register event listener for refresh events
    window.addEventListener('bf-refresh-providers', handleRefresh as EventListener)
    
    // ========================================================================
    // CLEANUP
    // ========================================================================
    
    /**
     * Cleanup function to remove event listeners when component unmounts
     * This prevents memory leaks and ensures clean teardown
     */
    return () => {
      window.removeEventListener('bf-refresh-providers', handleRefresh as EventListener)
      console.log('[AppInit] Event listeners cleaned up')
    }
  }, [setProvidersByCategory])
  
  // This is a headless component - it doesn't render anything
  return null
}

