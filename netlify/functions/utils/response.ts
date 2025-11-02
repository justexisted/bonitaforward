/**
 * Shared response utilities for Netlify functions
 * Standardizes error and success response formats
 */

import { CORS_HEADERS } from './env'

export interface ErrorResponse {
  error: string
  details?: string
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
  const response: ErrorResponse = { error, ...extra }
  if (details) response.details = details
  
  return {
    statusCode,
    headers: headers || CORS_HEADERS,
    body: JSON.stringify(response)
  }
}

/**
 * Create standardized success response
 */
export function successResponse(
  data: any,
  statusCode: number = 200,
  headers?: Record<string, string>
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: headers || CORS_HEADERS,
    body: JSON.stringify(data)
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

