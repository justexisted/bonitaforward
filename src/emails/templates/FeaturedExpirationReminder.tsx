/**
 * FEATURED LISTING EXPIRATION REMINDER EMAIL
 * 
 * Sent to business owners when their featured listing is about to expire.
 * Sends reminders at 30 days, 7 days, and 1 day before expiration.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface FeaturedExpirationReminderProps {
  businessName: string
  expirationDate: string
  daysUntilExpiration: number
  renewalPrice: string // e.g., "$97/year"
}

export function FeaturedExpirationReminder({
  businessName,
  expirationDate,
  daysUntilExpiration,
  renewalPrice,
}: FeaturedExpirationReminderProps) {
  const formattedDate = new Date(expirationDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const urgencyLevel = daysUntilExpiration <= 1 ? 'high' : daysUntilExpiration <= 7 ? 'medium' : 'low'
  const urgencyMessage = daysUntilExpiration === 1 
    ? 'Your featured listing expires TOMORROW!'
    : daysUntilExpiration <= 7
    ? `Your featured listing expires in ${daysUntilExpiration} days!`
    : `Your featured listing expires in ${daysUntilExpiration} days`

  return (
    <EmailLayout preview={urgencyMessage}>
      <Heading style={h1}>Featured Listing Expiration Reminder</Heading>
      
      <Text style={text}>
        <strong>{urgencyMessage}</strong>
      </Text>

      <Text style={text}>
        Your featured listing for <strong>{businessName}</strong> will expire on <strong>{formattedDate}</strong>.
      </Text>

      <Section style={urgencyBox[urgencyLevel]}>
        <Text style={urgencyTitle[urgencyLevel]}>
          {daysUntilExpiration === 1 
            ? '⚠️ Action Required: Renew Today!'
            : daysUntilExpiration <= 7
            ? '⏰ Renew Soon to Keep Your Featured Status'
            : '📅 Don\'t Miss Out - Renew Your Featured Listing'
          }
        </Text>
        <Text style={urgencyText[urgencyLevel]}>
          {daysUntilExpiration === 1 
            ? 'Your featured listing benefits will end tomorrow. Renew now to maintain priority placement, enhanced visibility, and all featured benefits.'
            : daysUntilExpiration <= 7
            ? 'Renew your featured listing to continue receiving priority placement in search results, enhanced business description, and all the benefits that help you stand out.'
            : 'Renew your featured listing to maintain your premium visibility and continue attracting more customers.'
          }
        </Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>Current Featured Benefits:</Text>
        
        <table style={benefitsTable}>
          <tbody>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Priority placement in search results</td>
            </tr>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Enhanced business description</td>
            </tr>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Multiple images support</td>
            </tr>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Social media integration</td>
            </tr>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Booking system access</td>
            </tr>
            <tr>
              <td style={benefitIcon}>✓</td>
              <td style={benefitText}>Analytics and insights</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={pricingBox}>
        <Text style={pricingTitle}>Renewal Price:</Text>
        <Text style={pricingAmount}>{renewalPrice}</Text>
        <Text style={pricingNote}>
          Renew now to continue enjoying all featured benefits for another year.
        </Text>
      </Section>

      <Section style={actionBox}>
        <Text style={actionText}>
          <strong>What happens if you don't renew?</strong> Your listing will revert to a free account, and you'll lose priority placement and other featured benefits. Don't let your featured status expire!
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://www.bonitaforward.com/my-business" variant="primary">
          Renew Featured Listing
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Questions about renewing? Contact us at hello@bonitaforward.com
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

// Centered alignment for urgency boxes
const urgencyBox = {
  high: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
    textAlign: 'center' as const,
  },
  medium: {
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
    textAlign: 'center' as const,
  },
  low: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
    textAlign: 'center' as const,
  },
}

const urgencyTitle = {
  high: {
    color: '#991b1b',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },
  medium: {
    color: '#92400e',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },
  low: {
    color: '#1e40af',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },
}

const urgencyText = {
  high: {
    color: '#991b1b',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
    textAlign: 'center' as const,
  },
  medium: {
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
    textAlign: 'center' as const,
  },
  low: {
    color: '#1e40af',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
    textAlign: 'center' as const,
  },
}

// Centered alignment for details box
const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const detailsTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const benefitsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 auto',
}

const benefitIcon = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '4px 8px 4px 0',
  verticalAlign: 'top',
  width: '24px',
  textAlign: 'center' as const,
}

const benefitText = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '4px 0',
  verticalAlign: 'top',
  textAlign: 'left' as const,
}

const pricingBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #10b981',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const pricingTitle = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

// Pricing amount stays large but centered - this is intentional for pricing display
const pricingAmount = {
  color: '#065f46',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const pricingNote = {
  color: '#047857',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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

