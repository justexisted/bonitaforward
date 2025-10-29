/**
 * APPLICATION APPROVED EMAIL
 * 
 * Sent when a business application is approved and listing is created.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface ApplicationApprovedProps {
  businessName: string
  category: string
  tier: 'free' | 'featured'
}

export function ApplicationApproved({
  businessName,
  category,
  tier,
}: ApplicationApprovedProps) {
  return (
    <EmailLayout preview={`${businessName} is now live on Bonita Forward!`}>
      <Heading style={h1}>Congratulations!</Heading>
      
      <Text style={text}>
        Your business application for <strong>{businessName}</strong> has been approved!
      </Text>

      <Section style={successBox}>
        <Text style={successTitle}>Your Listing is Now Live</Text>
        <Text style={successText}>
          {businessName} is now listed in the <strong>{category}</strong> category and is visible to all Bonita Forward users.
        </Text>
      </Section>

      {tier === 'featured' && (
        <Section style={featuredBox}>
          <Text style={featuredText}>
            🌟 <strong>Featured Listing:</strong> Your business has premium placement and enhanced visibility across the platform!
          </Text>
        </Section>
      )}

      <Section style={nextStepsBox}>
        <Text style={nextStepsTitle}>Next Steps:</Text>
        <ul style={nextStepsList}>
          <li style={nextStepItem}>Add photos and detailed information</li>
          <li style={nextStepItem}>Set up your business hours</li>
          <li style={nextStepItem}>Connect your Google Calendar for bookings</li>
          <li style={nextStepItem}>Post job openings if you're hiring</li>
          <li style={nextStepItem}>Share your listing on social media</li>
        </ul>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://bonitaforward.com/my-business" variant="success">
          Manage My Business
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Thank you for being part of the Bonita Forward community!
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

const successBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const successTitle = {
  color: '#166534',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const successText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const featuredBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const featuredText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const nextStepsBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const nextStepsTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
}

const nextStepsList = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
  paddingLeft: '20px',
}

const nextStepItem = {
  margin: '6px 0',
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

