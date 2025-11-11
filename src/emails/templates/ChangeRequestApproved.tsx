/**
 * CHANGE REQUEST APPROVED EMAIL
 * 
 * Sent when an admin approves a business change request.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface ChangeRequestApprovedProps {
  businessName: string
  requestType: 'update' | 'delete' | 'feature_request' | 'claim'
  changedFields?: string[]
}

export function ChangeRequestApproved({
  businessName,
  requestType,
  changedFields = [],
}: ChangeRequestApprovedProps) {
  const requestTypeLabel = {
    update: 'Business Update',
    delete: 'Business Deletion',
    feature_request: 'Featured Upgrade',
    claim: 'Business Claim',
  }[requestType] || 'Change Request'

  return (
    <EmailLayout preview={`Your ${requestTypeLabel} was approved!`}>
      <Heading style={h1}>Request Approved</Heading>
      
      <Text style={text}>
        Great news! Your {requestTypeLabel.toLowerCase()} for <strong>{businessName}</strong> has been approved by our team.
      </Text>

      {requestType === 'update' && changedFields.length > 0 && (
        <Section style={changeBox}>
          <Text style={changeTitle}>The following changes are now live:</Text>
          {changedFields.map((field) => (
            <Text key={field} style={changeItem}>
              • {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          ))}
        </Section>
      )}

      {requestType === 'feature_request' && (
        <Section style={successBox}>
          <Text style={successText}>
            <strong>Congratulations!</strong> Your business is now a Featured listing with premium placement and enhanced visibility.
          </Text>
        </Section>
      )}

      <Section style={buttonSection}>
        <EmailButton href="https://www.bonitaforward.com/my-business" variant="success">
          View Your Business
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Your changes are now visible to all users on Bonita Forward.
      </Text>
    </EmailLayout>
  )
}

// Styles
// Reduced size so "Bonita Forward" remains the primary large title
const h1 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  padding: '0',
  textAlign: 'center' as const,
}

// Centered text alignment for consistent layout
const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

// Centered alignment for change box
const changeBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const changeTitle = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

// Centered list items for better email client compatibility
const changeItem = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
  textAlign: 'center' as const,
}

// Centered alignment for success box
const successBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const successText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const buttonSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
}

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
}

