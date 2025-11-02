/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - CORS_HEADERS: Standard CORS configuration
 *   → CRITICAL: Required for all HTTP responses
 * 
 * WHAT DEPENDS ON THIS:
 * - ALL Netlify functions: Use successResponse() and errorResponse()
 *   → CRITICAL: Response format must be consistent across ALL functions
 * - ALL frontend code: Parses responses expecting { success: true, ok: true, ... }
 *   → CRITICAL: Frontend checks both success and ok for backward compatibility
 * 
 * BREAKING CHANGES:
 * - If you change successResponse() format → ALL Netlify functions break
 * - If you remove success/ok fields → ALL frontend code breaks
 * - If you change errorResponse() format → ALL error handling breaks
 * 
 * HOW TO SAFELY UPDATE:
 * 1. NEVER change response format without updating ALL consumers
 * 2. Use backward compatibility during migration (include both old and new fields)
 * 3. Search for all usages: grep -r "successResponse\|errorResponse" src/
 * 4. Test ALL admin functions after changing format
 * 5. Update ALL frontend code that parses responses
 * 
 * RELATED FILES:
 * - ALL netlify/functions/*.ts files: Use these utilities
 * - ALL src/*.ts files that call Netlify functions: Parse responses
 * 
 * RECENT BREAKS:
 * - API contract mismatch (2025-01-XX): Changed response format broke frontend
 *   → Fix: successResponse() now ALWAYS includes success: true and ok: true
 * 
 * See: docs/prevention/API_CONTRACT_PREVENTION.md
 */

/**
 * Shared response utilities for Netlify functions
 * Standardizes error and success response formats
 * 
 * CRITICAL: successResponse() ALWAYS includes success: true and ok: true automatically
 * This prevents API contract mismatches between frontend and backend.
 */

import { CORS_HEADERS } from './env'

export interface ErrorResponse {
  success: false
  error: string
  details?: string
  [key: string]: any
}

export interface SuccessResponse<T = any> {
  success: true
  ok: true  // Backward compatibility - will be removed after migration
  data?: T
  message?: string
  [key: string]: any
}

/**
 * Create standardized error response
 */
export function errorResponse(
  statusCode: number,
  error: string,
  details?: string,
  extra?: Record<string, any>,
  headers?: Record<string, string>
): { statusCode: number; headers: Record<string, string>; body: string } {
  const response: ErrorResponse = {
    success: false,
    error,
    ...extra
  }
  if (details) response.details = details
  
  return {
    statusCode,
    headers: headers || CORS_HEADERS,
    body: JSON.stringify(response)
  }
}

/**
 * Create standardized success response
 * 
 * ALWAYS includes success: true and ok: true (backward compatibility)
 * Prevents API contract mismatches.
 * 
 * @param data - Data to include in response (will be merged with success: true and ok: true)
 * @param statusCode - HTTP status code (default: 200)
 * @param headers - Optional custom headers
 * @returns Standardized success response
 * 
 * Usage examples:
 * - successResponse({ profiles: [] })  // Default: 200, auto success: true and ok: true
 * - successResponse({ data: ... }, 201)  // Custom status code
 * - successResponse({ data: ... }, 201, { 'Custom-Header': 'value' })  // With headers
 * 
 * Note: If data already includes success or ok, they will be overwritten with true.
 * This ensures consistent response format.
 */
export function successResponse<T = any>(
  data: any = {},
  statusCode: number = 200,
  headers?: Record<string, string>
): { statusCode: number; headers: Record<string, string>; body: string } {
  // Always include success: true and ok: true (backward compatibility)
  // These MUST come last to override any success/ok in user data
  // This ensures consistent response format regardless of what data contains
  const response: SuccessResponse<T> = {
    ...data,   // User data (may include message, data, deletedCounts, etc.)
    success: true,  // Override any success field in data
    ok: true   // Backward compatibility - remove after frontend migration
  }
  
  return {
    statusCode,
    headers: headers || CORS_HEADERS,
    body: JSON.stringify(response)
  }
}

/**
 * Handle OPTIONS (preflight) requests
 */
export function handleOptions(): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  }
}

