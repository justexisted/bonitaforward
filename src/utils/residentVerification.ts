/**
 * BONITA RESIDENT VERIFICATION UTILITIES
 * 
 * Phase 1: ZIP Code Validation + Self-Declaration
 * 
 * This module provides utilities for verifying Bonita residents:
 * - ZIP code validation
 * - Self-declaration verification
 * - Verification method tracking
 */

// Bonita ZIP codes
const BONITA_ZIP_CODES = ['91902', '91908', '91909'] as const

export type VerificationMethod = 
  | 'self-declared' 
  | 'zip-verified' 
  | 'address-verified' 
  | 'document-verified' 
  | 'admin-verified'

export interface ResidentVerificationResult {
  isBonitaResident: boolean
  verificationMethod: VerificationMethod | null
  zipCode: string | null
  verifiedAt: string | null
  error?: string
}

/**
 * Validate if a ZIP code belongs to Bonita area
 * 
 * @param zipCode - ZIP code to validate (can include full ZIP+4, we'll extract first 5 digits)
 * @returns true if ZIP code is a valid Bonita ZIP code
 */
export function isValidBonitaZip(zipCode: string): boolean {
  if (!zipCode || typeof zipCode !== 'string') return false
  
  // Extract first 5 digits (handle ZIP+4 format)
  const cleaned = zipCode.trim().replace(/\D/g, '').substring(0, 5)
  
  if (cleaned.length !== 5) return false
  
  return BONITA_ZIP_CODES.includes(cleaned as typeof BONITA_ZIP_CODES[number])
}

/**
 * Verify Bonita residency via ZIP code
 * 
 * @param zipCode - ZIP code to verify
 * @returns Verification result
 */
export function verifyByZipCode(zipCode: string): ResidentVerificationResult {
  if (!zipCode || typeof zipCode !== 'string') {
    return {
      isBonitaResident: false,
      verificationMethod: null,
      zipCode: null,
      verifiedAt: null,
      error: 'ZIP code is required'
    }
  }

  const cleaned = zipCode.trim().replace(/\D/g, '').substring(0, 5)
  const isValid = isValidBonitaZip(cleaned)

  return {
    isBonitaResident: isValid,
    verificationMethod: isValid ? 'zip-verified' : null,
    zipCode: cleaned || null,
    verifiedAt: isValid ? new Date().toISOString() : null,
    error: isValid ? undefined : `ZIP code ${cleaned} is not a Bonita ZIP code. Valid ZIP codes: ${BONITA_ZIP_CODES.join(', ')}`
  }
}

/**
 * Verify Bonita residency via self-declaration
 * 
 * @param zipCode - Optional ZIP code for additional validation
 * @returns Verification result
 */
export function verifyBySelfDeclaration(zipCode?: string): ResidentVerificationResult {
  const now = new Date().toISOString()
  
  // If ZIP code provided and valid, use zip-verified method
  if (zipCode && isValidBonitaZip(zipCode)) {
    const cleaned = zipCode.trim().replace(/\D/g, '').substring(0, 5)
    return {
      isBonitaResident: true,
      verificationMethod: 'zip-verified',
      zipCode: cleaned,
      verifiedAt: now
    }
  }
  
  // Otherwise, use self-declaration
  return {
    isBonitaResident: true,
    verificationMethod: 'self-declared',
    zipCode: zipCode ? zipCode.trim().replace(/\D/g, '').substring(0, 5) : null,
    verifiedAt: now
  }
}

/**
 * Get display name for verification method
 */
export function getVerificationMethodLabel(method: VerificationMethod | null | undefined): string {
  if (!method) return 'Not verified'
  
  const labels: Record<VerificationMethod, string> = {
    'self-declared': 'Self-declared',
    'zip-verified': 'ZIP Code Verified',
    'address-verified': 'Address Verified',
    'document-verified': 'Document Verified',
    'admin-verified': 'Admin Verified'
  }
  
  return labels[method] || 'Unknown'
}

/**
 * Get all valid Bonita ZIP codes (for display purposes)
 */
export function getBonitaZipCodes(): readonly string[] {
  return BONITA_ZIP_CODES
}

