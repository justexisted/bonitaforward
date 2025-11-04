/**
 * BOOKING REMINDER EMAIL
 * 
 * Sent 24 hours before a booking to remind both customer and business owner.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface BookingReminderProps {
  businessName: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  bookingDate: string
  bookingTime?: string
  bookingDuration?: number // in minutes
  recipientType: 'customer' | 'business' // Who is receiving this email
}

export function BookingReminder({
  businessName,
  customerName,
  customerEmail,
  customerPhone,
  bookingDate,
  bookingTime,
  bookingDuration,
  recipientType,
}: BookingReminderProps) {
  const isCustomer = recipientType === 'customer'
  const bookingDateTime = new Date(bookingDate)
  const formattedDate = bookingDateTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const formattedTime = bookingTime || bookingDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return (
    <EmailLayout preview={`Reminder: Your booking at ${businessName} is tomorrow`}>
      <Heading style={h1}>Booking Reminder</Heading>
      
      <Text style={text}>
        {isCustomer 
          ? `This is a friendly reminder that you have a booking coming up at <strong>${businessName}</strong>.`
          : `This is a reminder that you have a booking with <strong>${customerName}</strong> coming up.`
        }
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightTitle}>
          {isCustomer ? 'Your Booking' : 'Upcoming Booking'}
        </Text>
        <Text style={highlightText}>
          <strong>Date:</strong> {formattedDate}
        </Text>
        <Text style={highlightText}>
          <strong>Time:</strong> {formattedTime}
        </Text>
        {bookingDuration && (
          <Text style={highlightText}>
            <strong>Duration:</strong> {bookingDuration} minutes
          </Text>
        )}
      </Section>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>
          {isCustomer ? 'Business Information:' : 'Customer Information:'}
        </Text>
        
        <table style={detailsTable}>
          <tbody>
            {isCustomer ? (
              <>
                <tr>
                  <td style={labelCell}>Business:</td>
                  <td style={valueCell}>{businessName}</td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td style={labelCell}>Name:</td>
                  <td style={valueCell}>{customerName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>
                    <a href={`mailto:${customerEmail}`} style={link}>{customerEmail}</a>
                  </td>
                </tr>
                {customerPhone && (
                  <tr>
                    <td style={labelCell}>Phone:</td>
                    <td style={valueCell}>
                      <a href={`tel:${customerPhone}`} style={link}>{customerPhone}</a>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={actionBox}>
        <Text style={actionText}>
          {isCustomer
            ? '<strong>Need to reschedule or cancel?</strong> You can manage your booking from your account page.'
            : '<strong>Ready for tomorrow?</strong> Please confirm the booking details and prepare accordingly.'
          }
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://www.bonitaforward.com/account" variant="primary">
          {isCustomer ? 'View My Bookings' : 'Manage Bookings'}
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        We look forward to seeing you!
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

const highlightBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const highlightTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
}

const highlightText = {
  color: '#92400e',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '4px 0',
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

const link = {
  color: '#5469d4',
  textDecoration: 'none',
}

const actionBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const actionText = {
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
  textAlign: 'center' as const,
}

