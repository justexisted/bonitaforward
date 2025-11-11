/**
 * WELCOME EMAIL
 * 
 * Sent to new users after successful signup/onboarding.
 * Welcomes them to Bonita Forward and guides them through the platform.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface WelcomeProps {
  name: string
  role: 'business' | 'community'
}

export function Welcome({
  name,
  role,
}: WelcomeProps) {
  const isBusiness = role === 'business'

  return (
    <EmailLayout preview={`Welcome to Bonita Forward, ${name}!`}>
      <Heading style={h1}>Welcome to Bonita Forward!</Heading>
      
      <Text style={text}>
        Hi {name},
      </Text>

      <Text style={text}>
        We're thrilled to have you join the Bonita Forward community! 🎉
      </Text>

      <Section style={infoBox}>
        <Text style={infoTitle}>
          {isBusiness 
            ? 'Get Started with Your Business Listing'
            : 'Discover Local Businesses & Events'
          }
        </Text>
        <Text style={infoText}>
          {isBusiness
            ? 'Your account is ready! Start by creating your business listing to connect with customers in Bonita.'
            : 'Your account is ready! Explore local businesses, discover community events, and stay connected with what\'s happening in Bonita.'
          }
        </Text>
      </Section>

      <Section style={featuresBox}>
        <Text style={featuresTitle}>
          {isBusiness ? 'What You Can Do:' : 'What You Can Do:'}
        </Text>
        
        <table style={featuresTable}>
          <tbody>
            {isBusiness ? (
              <>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Create and manage your business listing</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Connect with local customers</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Receive and manage booking requests</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Update your business information anytime</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Upgrade to featured listing for enhanced visibility</td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Browse local businesses by category</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Discover community events and activities</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Book appointments and services</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Save your favorite businesses and events</td>
                </tr>
                <tr>
                  <td style={featureIcon}>✓</td>
                  <td style={featureText}>Stay connected with the Bonita community</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={actionBox}>
        <Text style={actionText}>
          <strong>Ready to get started?</strong> Click the button below to {isBusiness ? 'create your business listing' : 'explore local businesses'}.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton 
          href={isBusiness ? 'https://www.bonitaforward.com/business' : 'https://www.bonitaforward.com'} 
          variant="primary"
        >
          {isBusiness ? 'Create Business Listing' : 'Explore Bonita Forward'}
        </EmailButton>
      </Section>

      <Section style={helpBox}>
        <Text style={helpTitle}>Need Help?</Text>
        <Text style={helpText}>
          We're here to help! If you have any questions or need assistance, feel free to reach out to us at{' '}
          <a href="mailto:hello@bonitaforward.com" style={link}>hello@bonitaforward.com</a>
        </Text>
      </Section>

      <Text style={footerNote}>
        Welcome to the Bonita Forward community! We're excited to have you here.
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
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const infoTitle = {
  color: '#1e40af',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

// Centered alignment for features box
const featuresBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const featuresTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const featuresTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 auto',
}

const featureIcon = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '4px 8px 4px 0',
  verticalAlign: 'top',
  width: '24px',
  textAlign: 'center' as const,
}

const featureText = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '4px 0',
  verticalAlign: 'top',
  textAlign: 'left' as const,
}

// Centered alignment for action box
const actionBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const actionText = {
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

