/**
 * ACCOUNT DELETION CONFIRMATION EMAIL
 * 
 * Sent to user after their account has been successfully deleted.
 * Confirms deletion completed and provides information about data removal.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'

interface AccountDeletionConfirmationProps {
  name: string
  deletedBy: 'self' | 'admin' // Who deleted the account
  businessesDeleted?: number // Number of businesses that were deleted
  businessesKept?: number // Number of businesses that were kept (soft deleted)
}

export function AccountDeletionConfirmation({
  name,
  deletedBy,
  businessesDeleted,
  businessesKept,
}: AccountDeletionConfirmationProps) {
  const wasAdminDeleted = deletedBy === 'admin'

  return (
    <EmailLayout preview="Your account has been deleted">
      <Heading style={h1}>Account Deletion Confirmed</Heading>
      
      <Text style={text}>
        Hi {name},
      </Text>

      <Text style={text}>
        {wasAdminDeleted
          ? 'Your account has been deleted by an administrator.'
          : 'Your account deletion request has been processed and your account has been permanently deleted.'
        }
      </Text>

      <Section style={infoBox}>
        <Text style={infoTitle}>What Was Deleted:</Text>
        <Text style={infoText}>
          All of your personal data, account information, and associated records have been permanently removed from our system. This includes:
        </Text>
        
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={detailIcon}>✓</td>
              <td style={detailText}>Your account and profile</td>
            </tr>
            <tr>
              <td style={detailIcon}>✓</td>
              <td style={detailText}>Your saved businesses and events</td>
            </tr>
            <tr>
              <td style={detailIcon}>✓</td>
              <td style={detailText}>Your booking history</td>
            </tr>
            <tr>
              <td style={detailIcon}>✓</td>
              <td style={detailText}>Your notifications and preferences</td>
            </tr>
            <tr>
              <td style={detailIcon}>✓</td>
              <td style={detailText}>All other associated data</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {(businessesDeleted !== undefined && businessesDeleted > 0) || (businessesKept !== undefined && businessesKept > 0) ? (
        <Section style={businessBox}>
          <Text style={businessTitle}>Business Information:</Text>
          {businessesDeleted !== undefined && businessesDeleted > 0 && (
            <Text style={businessText}>
              <strong>{businessesDeleted} business(es)</strong> were permanently deleted along with your account.
            </Text>
          )}
          {businessesKept !== undefined && businessesKept > 0 && (
            <Text style={businessText}>
              <strong>{businessesKept} business(es)</strong> were unlinked from your account but remain in the system.
            </Text>
          )}
        </Section>
      ) : null}

      <Section style={actionBox}>
        <Text style={actionText}>
          <strong>Important:</strong> Your account cannot be recovered. If you wish to use Bonita Forward again in the future, you will need to create a new account.
        </Text>
      </Section>

      <Section style={helpBox}>
        <Text style={helpTitle}>Questions or Concerns?</Text>
        <Text style={helpText}>
          If you have any questions about this deletion or believe this was done in error, please contact us at{' '}
          <a href="mailto:hello@bonitaforward.com" style={link}>hello@bonitaforward.com</a>
        </Text>
      </Section>

      <Text style={footerNote}>
        Thank you for being part of the Bonita Forward community. We're sorry to see you go.
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

// Centered alignment for info box
const infoBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const infoTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const infoText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

// Centered table for better email client compatibility
const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 auto',
}

const detailIcon = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '4px 8px 4px 0',
  verticalAlign: 'top',
  width: '24px',
  textAlign: 'center' as const,
}

const detailText = {
  color: '#374151',
  fontSize: '14px',
  padding: '4px 0',
  verticalAlign: 'top',
  textAlign: 'left' as const,
}

// Centered alignment for business box
const businessBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const businessTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const businessText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
  textAlign: 'center' as const,
}

// Centered alignment for action box
const actionBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const actionText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

// Centered alignment for help box
const helpBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #10b981',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const helpTitle = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const helpText = {
  color: '#047857',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const link = {
  color: '#059669',
  textDecoration: 'underline',
}

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
}

