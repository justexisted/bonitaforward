/**
 * BOOKING UPDATED EMAIL
 * 
 * Sent to customer when business owner updates booking details.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface BookingUpdatedProps {
  businessName: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  bookingDate: string
  bookingTime?: string
  bookingDuration?: number
  changes: string[] // e.g., ['date', 'time', 'notes']
  message?: string
}

export function BookingUpdated({
  businessName,
  customerName,
  customerEmail, // Recipient email - not displayed in template but required for API compatibility
  customerPhone,
  bookingDate,
  bookingTime,
  bookingDuration,
  changes,
  message,
}: BookingUpdatedProps) {
  // customerEmail is the recipient address, not displayed in email template
  void customerEmail
  
  const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const formattedTime = bookingTime || new Date(bookingDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const changeLabels: Record<string, string> = {
    'booking_date': 'Date',
    'date': 'Date',
    'booking_duration_minutes': 'Duration',
    'duration': 'Duration',
    'booking_notes': 'Notes',
    'notes': 'Notes',
    'booking_time': 'Time',
    'time': 'Time',
  }

  const changeDescriptions = changes.map(change => changeLabels[change] || change).join(', ')

  return (
    <EmailLayout preview={`Booking updated at ${businessName}`}>
      <Heading style={h1}>Booking Details Updated</Heading>
      
      <Text style={text}>
        {customerName ? `Hi ${customerName},` : 'Hi there,'} your booking at <strong>{businessName}</strong> has been updated.
      </Text>

      <Section style={changesBox}>
        <Text style={changesTitle}>What Changed:</Text>
        <Text style={changesText}>
          The following details have been updated: <strong>{changeDescriptions}</strong>
        </Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>Updated Booking Details:</Text>
        
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={labelCell}>Date:</td>
              <td style={valueCell}>{formattedDate}</td>
            </tr>
            {bookingTime && (
              <tr>
                <td style={labelCell}>Time:</td>
                <td style={valueCell}>{formattedTime}</td>
              </tr>
            )}
            {bookingDuration && (
              <tr>
                <td style={labelCell}>Duration:</td>
                <td style={valueCell}>{bookingDuration} minutes</td>
              </tr>
            )}
            {customerPhone && (
              <tr>
                <td style={labelCell}>Your Phone:</td>
                <td style={valueCell}>{customerPhone}</td>
              </tr>
            )}
            <tr>
              <td style={labelCell}>Business:</td>
              <td style={valueCell}>{businessName}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {message && (
        <Section style={messageBox}>
          <Text style={messageTitle}>Message from {businessName}:</Text>
          <Text style={messageText}>"{message}"</Text>
        </Section>
      )}

      <Section style={infoBox}>
        <Text style={infoText}>
          <strong>Important:</strong> Please review the updated booking details above. If you have any questions or need to make changes, please contact the business directly.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://www.bonitaforward.com/account" variant="primary">
          View My Bookings
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Thank you for using Bonita Forward.
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

const changesBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const changesTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const changesText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const detailsTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
}

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const labelCell = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '4px 12px 4px 0',
  verticalAlign: 'top',
  fontWeight: '500',
  width: '100px',
}

const valueCell = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '4px 0',
  verticalAlign: 'top',
}

const messageBox = {
  backgroundColor: '#f9fafb',
  borderLeft: '4px solid #5469d4',
  padding: '16px',
  margin: '16px 0',
}

const messageTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const messageText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic',
}

const infoBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const infoText = {
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

