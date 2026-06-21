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
    secondary: '#F6F5F0',
    tertiary: '#F1EFE8',
    hover: '#ECE9DF',
  },

  // Brand & Accent
  accent: {
    primary: '#0F5F56',
    primaryHover: '#0B4E48',
    primaryLight: '#E5F3EF',
    secondary: '#C98A16',
    secondaryHover: '#A66F10',
  },

  // Text
  text: {
    primary: '#17201D',
    secondary: '#2F3A35',
    tertiary: '#5F675F',
    muted: '#8A9188',
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
    default: '#DDD8CC',
    strong: '#CFC7B9',
    focus: '#0F5F56',
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
