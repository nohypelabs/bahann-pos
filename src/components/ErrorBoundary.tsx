'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the crashed component tree.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * Or with custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error using centralized logger
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    })

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // Send error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-4 md:p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-3 md:mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-red-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-xs md:text-lg md:text-3xl font-bold text-gray-900 text-center mb-4">
                Oops! Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 text-center mb-3 md:mb-6">
                We apologize for the inconvenience. An unexpected error has occurred.
                Our team has been notified and is working on a fix.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-3 md:mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-900 mb-2">Error Details:</p>
                  <p className="text-sm text-red-800 font-mono mb-3">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-red-700">
                      <summary className="cursor-pointer font-semibold mb-2">
                        Component Stack Trace
                      </summary>
                      <pre className="whitespace-pre-wrap font-mono bg-red-100 p-3 rounded overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-3 md:px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-3 md:px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Go to Home
                </button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-gray-500 text-center mt-3 md:mt-6">
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:agdscid@gmail.com"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  agdscid@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
