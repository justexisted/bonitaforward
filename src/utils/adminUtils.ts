// Admin utility functions - extracted from Admin.tsx

import type { ProviderRow } from '../types/admin'

// Utility functions for admin operations
export const adminUtils = {
  // Format value for display in admin interface
  formatValueForDisplay(value: any): string {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    return String(value)
  },

  // Compute change diff between current and proposed changes
  computeChangeDiff(currentProvider: ProviderRow | undefined, proposedChanges: Record<string, any> | null) {
    if (!currentProvider || !proposedChanges) return {}

    const diff: Record<string, { current: any; proposed: any }> = {}
    
    for (const [key, proposedValue] of Object.entries(proposedChanges)) {
      const currentValue = (currentProvider as any)[key]
      if (JSON.stringify(currentValue) !== JSON.stringify(proposedValue)) {
        diff[key] = {
          current: currentValue,
          proposed: proposedValue
        }
      }
    }
    
    return diff
  },

  // Normalize email for comparison
  normalizeEmail(email?: string | null): string {
    return String(email || '').trim().toLowerCase()
  },

  // Normalize role for comparison
  normalizeRole(role?: string | null): string {
    return String(role || '').trim().toLowerCase()
  },

  // Extract zip code from location string
  extractZipCode(locationString: string | null | undefined): string | null {
    if (!locationString) return null
    
    // Look for 5-digit zip code pattern
    const zipMatch = locationString.match(/\b(\d{5})\b/)
    return zipMatch ? zipMatch[1] : null
  },

  // Get status color for UI
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'rejected':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'archived':
        return 'text-gray-700 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  },

  // Get status icon for UI
  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '✓'
      case 'rejected':
        return '✗'
      case 'pending':
        return '⏳'
      case 'archived':
        return '📦'
      default:
        return '?'
    }
  },

  // Group change requests by business name
  groupChangeRequestsByBusiness(requests: any[]) {
    const grouped = requests.reduce((acc, request) => {
      const businessName = request.providers?.name || 'Unknown Business'
      if (!acc[businessName]) {
        acc[businessName] = {
          businessName,
          requests: [],
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        }
      }
      
      acc[businessName].requests.push(request)
      
      switch (request.status) {
        case 'pending':
          acc[businessName].pendingCount++
          break
        case 'approved':
          acc[businessName].approvedCount++
          break
        case 'rejected':
          acc[businessName].rejectedCount++
          break
      }
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped)
  },

  // Parse CSV line with proper escaping
  parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    // Add the last field
    result.push(current.trim())
    return result
  },

  // Clean CSV field value
  cleanCSVField(field: string): string {
    return field?.trim().replace(/^["'\s]+|["'\s]+$/g, '') || ''
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Format date for display
  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Invalid Date'
    }
  },

  // Get relative time
  getRelativeTime(dateString: string | null): string {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return date.toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }
}
