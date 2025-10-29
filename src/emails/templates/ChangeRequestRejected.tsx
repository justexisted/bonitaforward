/**
 * CHANGE REQUEST REJECTED EMAIL
 * 
 * Sent when an admin rejects a business change request.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface ChangeRequestRejectedProps {
  businessName: string
  requestType: 'update' | 'delete' | 'feature_request' | 'claim'
  reason?: string
}

export function ChangeRequestRejected({
  businessName,
  requestType,
  reason,
}: ChangeRequestRejectedProps) {
  const requestTypeLabel = {
    update: 'Business Update',
    delete: 'Business Deletion',
    feature_request: 'Featured Upgrade Request',
    claim: 'Business Claim',
  }[requestType] || 'Change Request'

  return (
    <EmailLayout preview={`Update on your ${requestTypeLabel}`}>
      <Heading style={h1}>Request Not Approved</Heading>
      
      <Text style={text}>
        We've reviewed your {requestTypeLabel.toLowerCase()} for <strong>{businessName}</strong>.
      </Text>

      <Text style={text}>
        Unfortunately, we're unable to approve this request at this time.
      </Text>

      {reason && (
        <Section style={reasonBox}>
          <Text style={reasonTitle}>Reason:</Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      )}

      <Section style={helpBox}>
        <Text style={helpText}>
          <strong>Need help?</strong> If you have questions about this decision or need to make changes, please contact our support team.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://bonitaforward.com/my-business" variant="primary">
          View My Business
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        You can submit a new request with updated information if needed.
      </Text>
    </EmailLayout>
  )
}

// Styles
const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  padding: '0',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const reasonBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const reasonTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const reasonText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const helpBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const helpText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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
}

