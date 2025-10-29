/**
 * EMAIL BUTTON COMPONENT
 * 
 * Reusable button for email templates with consistent styling.
 */

// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import type { ReactNode } from 'react'
import { Button } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
}

export function EmailButton({ href, children, variant = 'primary' }: EmailButtonProps) {
  const styles = {
    primary: {
      backgroundColor: '#5469d4',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: '#f6f9fc',
      color: '#5469d4',
      border: '1px solid #5469d4',
    },
    success: {
      backgroundColor: '#10b981',
      color: '#ffffff',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
    },
  }

  return (
    <Button
      href={href}
      style={{
        ...buttonBase,
        ...styles[variant],
      }}
    >
      {children}
    </Button>
  )
}

const buttonBase = {
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: '8px',
  cursor: 'pointer',
  lineHeight: '1.5',
  border: 'none',
}

