import { useEffect } from 'react'

/**
 * Hook to hide the mobile Dock when a modal/form is open
 * 
 * Usage:
 * ```tsx
 * const MyModal = ({ isOpen }) => {
 *   useHideDock(isOpen)
 *   // ... rest of component
 * }
 * ```
 */
export function useHideDock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [isOpen])
}

