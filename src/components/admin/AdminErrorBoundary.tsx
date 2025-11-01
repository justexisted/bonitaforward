import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface AdminErrorBoundaryProps {
  children: ReactNode
  section?: string
}

interface AdminErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * AdminErrorBoundary - Error boundary for admin sections
 * 
 * Prevents a single section crash from taking down the entire admin page.
 * Catches React errors in child components and displays a user-friendly error message.
 * 
 * Usage:
 * <AdminErrorBoundary section="restaurant-tagging">
 *   <RestaurantTaggingSection {...props} />
 * </AdminErrorBoundary>
 */
export class AdminErrorBoundary extends Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AdminErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (but don't expose to users)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 p-6 bg-red-50">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {this.props.section
                  ? `An error occurred in the ${this.props.section} section. Please try refreshing the page or contact support if the problem persists.`
                  : 'An error occurred in this section. Please try refreshing the page.'}
              </p>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

