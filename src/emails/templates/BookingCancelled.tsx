/**
 * BOOKING CANCELLED EMAIL
 * 
 * Sent to both customer and business owner when a booking is cancelled.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface BookingCancelledProps {
  businessName: string
  customerName: string
  customerEmail: string
  bookingDate: string
  bookingTime?: string
  cancelledBy: 'customer' | 'business' // Who cancelled the booking
  reason?: string // Optional cancellation reason
}

export function BookingCancelled({
  businessName,
  customerName,
  customerEmail,
  bookingDate,
  bookingTime,
  cancelledBy,
  reason,
}: BookingCancelledProps) {
  const isCustomerView = cancelledBy === 'customer'
  const cancelledByText = cancelledBy === 'customer' 
    ? 'You cancelled' 
    : `${businessName} cancelled`

  return (
    <EmailLayout preview={`Booking cancelled for ${businessName}`}>
      <Heading style={h1}>Booking Cancelled</Heading>
      
      <Text style={text}>
        {cancelledByText} your booking for <strong>{businessName}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>Booking Details:</Text>
        
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={labelCell}>Date:</td>
              <td style={valueCell}>{new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            {bookingTime && (
              <tr>
                <td style={labelCell}>Time:</td>
                <td style={valueCell}>{bookingTime}</td>
              </tr>
            )}
            <tr>
              <td style={labelCell}>Customer:</td>
              <td style={valueCell}>{customerName} ({customerEmail})</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {reason && (
        <Section style={reasonBox}>
          <Text style={reasonTitle}>Cancellation Reason:</Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      )}

      <Section style={infoBox}>
        <Text style={infoText}>
          {isCustomerView 
            ? 'Your booking has been cancelled. If you need to reschedule, please contact the business directly or create a new booking.'
            : 'The customer has been notified of this cancellation. If this was cancelled by mistake, please contact the customer directly.'
          }
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://www.bonitaforward.com/account" variant="primary">
          {isCustomerView ? 'View My Bookings' : 'Manage Bookings'}
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Thank you for using Bonita Forward.
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

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 auto',
}

const labelCell = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '4px 12px 4px 0',
  verticalAlign: 'top',
  fontWeight: '500',
  width: '100px',
  textAlign: 'right' as const,
}

const valueCell = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '4px 0',
  verticalAlign: 'top',
  textAlign: 'left' as const,
}

// Centered alignment for reason box
const reasonBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const reasonTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const reasonText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
}

