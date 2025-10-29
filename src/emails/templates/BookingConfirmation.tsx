/**
 * BOOKING CONFIRMATION EMAIL
 * 
 * Sent to business owner when a customer books their service.
 */

import { Heading, Text, Section } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface BookingConfirmationProps {
  businessName: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  serviceRequested?: string
  bookingDate: string
  bookingTime?: string
  message?: string
}

export function BookingConfirmation({
  businessName,
  customerName,
  customerEmail,
  customerPhone,
  serviceRequested,
  bookingDate,
  bookingTime,
  message,
}: BookingConfirmationProps) {
  return (
    <EmailLayout preview={`New booking for ${businessName}!`}>
      <Heading style={h1}>📅 New Booking Request!</Heading>
      
      <Text style={text}>
        You have a new booking request for <strong>{businessName}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>Customer Information:</Text>
        
        <table style={detailsTable}>
          <tbody>
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
          </tbody>
        </table>
      </Section>

      <Section style={bookingBox}>
        <Text style={bookingTitle}>Booking Details:</Text>
        
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
            {serviceRequested && (
              <tr>
                <td style={labelCell}>Service:</td>
                <td style={valueCell}>{serviceRequested}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {message && (
        <Section style={messageBox}>
          <Text style={messageTitle}>Customer Message:</Text>
          <Text style={messageText}>"{message}"</Text>
        </Section>
      )}

      <Section style={actionBox}>
        <Text style={actionText}>
          ⚡ <strong>Next Steps:</strong> Please contact the customer directly to confirm the booking and discuss any details.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <EmailButton href="https://bonitaforward.com/my-business" variant="primary">
          View All Bookings
        </EmailButton>
      </Section>

      <Text style={footerNote}>
        Respond to booking requests promptly to provide the best customer experience.
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

const bookingBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const bookingTitle = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
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

const actionBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const actionText = {
  color: '#92400e',
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

