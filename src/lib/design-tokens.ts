/**
 * LakuPOS Design Tokens
 *
 * Centralized color constants for use in JavaScript/TypeScript contexts
 * (charts, dynamic styles, etc.). For CSS classes, use Tailwind directly.
 *
 * See DESIGN-SYSTEM.md for full documentation.
 */

export const colors = {
  // Surfaces
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F3F4F6',
    hover: '#E5E7EB',
  },

  // Brand & Accent
  accent: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryLight: '#DBEAFE',
    secondary: '#EA7317',
    secondaryHover: '#D97706',
  },

  // Text
  text: {
    primary: '#1F2937',
    secondary: '#374151',
    tertiary: '#6B7280',
    muted: '#9CA3AF',
    white: '#FFFFFF',
  },

  // Semantic
  success: '#0A6B2E',
  successLight: '#D1FAE5',
  warning: '#EAB308',
  warningLight: '#FEF9C3',
  error: '#8B1A1A',
  errorLight: '#FEE2E2',

  // Score badges
  score: {
    high: '#0A6B2E',
    mid: '#EAB308',
    low: '#8B1A1A',
  },

  // Borders
  border: {
    default: '#E5E7EB',
    strong: '#D1D5DB',
    focus: '#2563EB',
  },

  // Chart palette (deep saturated, no pastel)
  chart: [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ef4444', // rose
    '#0ea5e9', // sky
    '#f97316', // orange
    '#14b8a6', // teal
    '#ec4899', // pink
    '#6366f1', // indigo
  ],

  // Plan badges
  plan: {
    free: '#6B7280',        // gray
    warung: '#0A6B2E',      // green
    starter: '#2563EB',     // blue
    professional: '#7C3AED', // purple
    business: '#EA7317',    // orange
    enterprise: '#8B1A1A',  // red
  },
} as const

/** Neobrutalist shadow presets */
export const shadows = {
  sm: '2px_2px_0px_0px_rgba(0,0,0,0.1)',
  md: '3px_3px_0px_0px_rgba(0,0,0,0.12)',
  lg: '4px_4px_0px_0px_rgba(0,0,0,0.15)',
  button: '3px_3px_0px_0px_rgba(0,0,0,0.15)',
  card: '3px_3px_0px_0px_rgba(0,0,0,0.1)',
} as const

/** Border radius tokens */
export const radius = {
  sm: '8px',
  md: '12px',   // rounded-xl — standard
  lg: '16px',   // rounded-2xl — cards, modals
  full: '9999px',
} as const

/** Spacing tokens (8px grid) */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const

/** Touch target sizes */
export const touchTarget = {
  mobile: '44px',
  tablet: '36px',
  desktop: '40px',
} as const
