/**
 * EMAIL VERIFICATION EMAIL
 * 
 * Sent when a user signs up and needs to verify their email address.
 * Uses custom Resend email system instead of Supabase's built-in confirmation.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface EmailVerificationProps {
  name?: string
  verificationUrl: string
}

export function EmailVerification({
  name,
  verificationUrl,
}: EmailVerificationProps) {
  return (
    <EmailLayout preview="Verify your email address to get started with Bonita Forward">
      <Heading style={h1}>Welcome to Bonita Forward!</Heading>
      
      <Text style={text}>
        {name ? `Hi ${name},` : 'Hi there,'}
      </Text>

      <Text style={text}>
        Thanks for signing up! To complete your account setup and start using all features of Bonita Forward, please verify your email address by clicking the button below.
      </Text>

      <Section style={infoBox}>
        <Text style={infoText}>
          <strong>Why verify?</strong> Email verification helps us keep your account secure and ensures you receive important updates about your business listings and bookings.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href={verificationUrl} variant="primary">
          Verify Email Address
        </EmailButton>
      </Section>

      <Text style={linkText}>
        Or copy and paste this link into your browser:<br />
        <a href={verificationUrl} style={link}>
          {verificationUrl}
        </a>
      </Text>

      <Section style={warningBox}>
        <Text style={warningText}>
          ⏰ <strong>This link expires in 24 hours.</strong> If you didn't create an account, you can safely ignore this email.
        </Text>
      </Section>

      <Text style={footerNote}>
        Having trouble? Contact us at{' '}
        <a href="mailto:hello@bonitaforward.com" style={link}>
          hello@bonitaforward.com
        </a>
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
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const buttonSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
  wordBreak: 'break-all' as const,
}

const link = {
  color: '#5469d4',
  textDecoration: 'underline',
}

// Centered alignment for warning box (already has textAlign center on text)
const warningBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  textAlign: 'center' as const,
}

