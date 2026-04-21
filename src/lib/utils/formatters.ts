/**
 * Utility Functions for Formatting
 *
 * Centralized formatting utilities to reduce code duplication
 * and ensure consistency across the application.
 */

/**
 * Format number as Indonesian Rupiah currency
 *
 * @param value - Number to format
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string (e.g., "Rp 100.000")
 *
 * @example
 * formatCurrency(100000) // "Rp 100.000"
 * formatCurrency(1500.50) // "Rp 1.500"
 */
export function formatCurrency(
  value: number,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    ...options,
  }).format(value)
}

/**
 * Format date to Indonesian locale
 *
 * @param date - Date string or Date object
 * @param format - Format type ('short' | 'medium' | 'long' | 'full')
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-01-15') // "15 Jan 2024"
 * formatDate(new Date(), 'long') // "15 Januari 2024"
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: {
      day: 'numeric',
      month: 'short',
    },
    medium: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    long: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
    full: {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  }

  return dateObj.toLocaleDateString('id-ID', formatOptions[format])
}

/**
 * Format date and time to Indonesian locale
 *
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTime('2024-01-15T14:30:00') // "15 Jan, 14:30"
 */
const IDR_TO_USD = 17_100

export function formatChartYAxis(value: number, language: string = 'id'): string {
  if (language === 'en') {
    const usd = value / IDR_TO_USD
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
    if (usd >= 1) return `$${usd.toFixed(0)}`
    return `$${usd.toFixed(2)}`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return `${value}`
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time only
 *
 * @param date - Date string or Date object
 * @returns Formatted time string (e.g., "14:30:00")
 *
 * @example
 * formatTime(new Date()) // "14:30:00"
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format number with thousand separators
 *
 * @param value - Number to format
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1000000) // "1.000.000"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format percentage
 *
 * @param value - Decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.5) // "50%"
 * formatPercentage(0.333, 1) // "33.3%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 *
 * @example
 * truncateText("Hello World", 5) // "Hello..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Capitalize first letter of each word
 *
 * @param text - Text to capitalize
 * @returns Capitalized text
 *
 * @example
 * capitalizeWords("hello world") // "Hello World"
 */
export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Generate unique transaction ID
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique transaction ID
 *
 * @example
 * generateTransactionId("TRX") // "TRX-L5X2P-8K9"
 */
export function generateTransactionId(prefix: string = 'TRX'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}
