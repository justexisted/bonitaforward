/**
 * EMAIL LAYOUT COMPONENT
 * 
 * Base layout for all Bonita Forward emails.
 * Provides consistent branding, header, footer, and styling.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import type { ReactNode } from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface EmailLayoutProps {
  preview: string
  children: ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Bonita Forward</Text>
            <Text style={tagline}>Your Community, Your Businesses</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Bonita Forward. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://www.bonitaforward.com" style={link}>
                Visit Website
              </Link>
              {' · '}
              <Link href="https://www.bonitaforward.com/my-business" style={link}>
                Manage Business
              </Link>
              {' · '}
              <Link href="https://www.bonitaforward.com/account" style={link}>
                Account Settings
              </Link>
              {' · '}
              <Link href="https://www.bonitaforward.com/unsubscribe" style={link}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerTextSmall}>
              This transactional email was sent to you because you have a business listing with Bonita Forward.
              You're receiving this notification about your business account activity.
            </Text>
            <Text style={footerTextSmall}>
              Bonita Forward<br />
              San Diego, CA 92108<br />
              United States
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 32px 0',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
  padding: '0',
}

const tagline = {
  fontSize: '14px',
  color: '#666666',
  margin: '4px 0 0 0',
  padding: '0',
}

const content = {
  padding: '32px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  padding: '0 32px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
}

const footerTextSmall = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
}

const link = {
  color: '#5469d4',
  textDecoration: 'none',
}

