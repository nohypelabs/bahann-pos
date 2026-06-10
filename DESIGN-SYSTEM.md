# LakuPOS Design System

> Hybrid: Professional + UMKM Casual. "Professional tapi ngga formal."
> Last updated: 2026-06-10

---

## COLOR PALETTE

### Surfaces & Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-primary` | `#FFFFFF` | Card backgrounds, modals |
| `surface-secondary` | `#F8F9FA` | Page background |
| `surface-tertiary` | `#F3F4F6` | Sidebar, subtle sections |
| `surface-hover` | `#E5E7EB` | Hover states, active pills |

### Brand & Accent

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `accent-primary` | `#2563EB` | `blue-600` | Primary buttons, links, active states |
| `accent-primary-hover` | `#1D4ED8` | `blue-700` | Primary button hover |
| `accent-primary-light` | `#DBEAFE` | `blue-100` | Primary backgrounds, badges |
| `accent-secondary` | `#EA7317` | custom | Warm accent, highlights |
| `accent-secondary-hover` | `#D97706` | `amber-600` | Secondary hover |

### Text

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `text-primary` | `#1F2937` | `gray-800` | Headings, primary text |
| `text-secondary` | `#374151` | `gray-700` | Body text, labels |
| `text-tertiary` | `#6B7280` | `gray-500` | Captions, hints |
| `text-muted` | `#9CA3AF` | `gray-400` | Placeholder text |

### Semantic (Status)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `success` | `#0A6B2E` | custom | Positive states, stock high |
| `success-light` | `#D1FAE5` | `green-100` | Success backgrounds |
| `warning` | `#EAB308` | `yellow-500` | Caution, stock low |
| `warning-light` | `#FEF9C3` | `yellow-100` | Warning backgrounds |
| `error` | `#8B1A1A` | custom | Errors, stock critical |
| `error-light` | `#FEE2E2` | `red-100` | Error backgrounds |

### Score Colors (specific)

| Level | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Score high | `#0A6B2E` | custom | Green score badges |
| Score mid | `#EAB308` | `yellow-500` | Yellow score badges (NOT brown) |
| Score low | `#8B1A1A` | custom | Red score badges |

### Borders

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `border-default` | `#E5E7EB` | `gray-200` | Default borders |
| `border-strong` | `#D1D5DB` | `gray-300` | Emphasized borders |
| `border-focus` | `#2563EB` | `blue-600` | Focus rings |

---

## TYPOGRAPHY

### Font Stack

| Role | Font | Fallback | Notes |
|------|------|----------|-------|
| **Headlines** | Geist Sans | system-ui, sans-serif | Clean, modern (Vercel/Anthropic feel) |
| **Body** | Geist Sans | system-ui, sans-serif | Same family, different weights |
| **Mono** | Geist Mono | monospace | SKUs, codes, technical data |

### Type Scale (Mobile-first, compact)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-mobile-xs` | 11px | normal | Captions, timestamps |
| `text-mobile-sm` | 12px | normal | Labels, secondary text |
| `text-mobile-base` | 14px | normal | Body text (default) |
| `text-mobile-lg` | 16px | medium | Sub-headings |
| `text-mobile-xl` | 18px | semibold | Section titles |
| `text-mobile-2xl` | 20px | bold | Page titles (mobile) |
| `text-mobile-3xl` | 24px | bold | Page titles (desktop) |

### Responsive Scale

| Breakpoint | Base Size | Touch Target |
|------------|-----------|--------------|
| Mobile (<768px) | 14px | 44px (iOS standard) |
| Tablet (768-1024px) | 13px | 36px |
| Desktop (>1024px) | 16px | 40px |

---

## SPACING

8px grid system. All spacing derives from multiples of 4px/8px.

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Tight gaps, icon margins |
| `space-sm` | 8px | Default gap, padding-sm |
| `space-md` | 12px | Card padding (mobile) |
| `space-lg` | 16px | Card padding (desktop) |
| `space-xl` | 24px | Section spacing |
| `space-2xl` | 32px | Page-level spacing |

---

## COMPONENT RULES

### Cards

```
Background:    white (#FFFFFF)
Border:        1px solid gray-200 (#E5E7EB)
Border radius: 12px (rounded-xl)
Shadow:        Neobrutalist — 3px_3px_0px_0px_rgba(0,0,0,0.1)
Padding:       16px (mobile: 12px)
Hover:         Shadow increases to 4px_4px, slight translate-y(-1px)
```

### Buttons

```
Border radius: 12px (rounded-xl)
Min height:    44px (mobile), 40px (desktop)
Padding:       12px 24px
Font weight:   medium (500)
Shadow:        3px_3px_0px_0px_rgba(0,0,0,0.15)
Active:        translate-x(1px) translate-y(1px), shadow reduces

Variants:
  primary:     bg-blue-600, text-white, hover:bg-blue-700
  secondary:   bg-gray-100, text-gray-800, hover:bg-gray-200
  outline:     bg-transparent, border-2 border-gray-300, hover:bg-gray-50
  danger:      bg-red-600, text-white, hover:bg-red-700
  ghost:       bg-transparent, text-gray-600, hover:bg-gray-100

Sizes:
  sm:          min-h-[36px], px-3, text-sm
  md:          min-h-[44px], px-4, text-base
  lg:          min-h-[48px], px-6, text-lg
```

### Inputs

```
Border radius: 12px (rounded-xl)
Min height:    44px (mobile), 40px (desktop)
Padding:       10px 14px
Border:        2px solid gray-200
Focus:         border-blue-500, ring-2 ring-blue-100
Error:         border-red-500, ring-2 ring-red-100
Label:         text-sm font-medium text-gray-700, mb-1.5
Helper text:   text-xs text-gray-500, mt-1
Error text:    text-xs text-red-600, mt-1
```

### Modals

```
Backdrop:      bg-black/50, backdrop-blur-sm
Container:     bg-white, rounded-2xl (16px)
Shadow:        shadow-2xl
Max width:     sm(400px), md(500px), lg(640px), xl(800px), full(95vw)
Mobile:        Bottom sheet — rounded-t-2xl, max-h-[90vh]
Desktop:       Centered — my-auto
Close:         Backdrop click + Escape key. NO X button.
Animation:     fadeIn + slideUp (mobile: slideUp from bottom)
```

### Tooltips

```
Delay:         10ms (instant feel)
Position:      createPortal to document.body
Z-index:       z-[9999]
Style:         bg-gray-900, text-white, text-xs, rounded-lg, px-2.5 py-1.5
Shadow:        shadow-lg
Implementation: cloneElement (no wrapper div)
```

### Stat Cards

```
Layout:        Icon (left) + Label + Value (right)
Background:    Color-coded light bg (gray/blue/green/yellow/red/purple)
Border radius: 12px (rounded-xl)
Padding:       16px
Icon:          20px, color matches card accent
Label:         text-sm text-gray-600
Value:         text-2xl font-bold text-gray-900
```

---

## ICONS

**Library**: Lucide React (only icon system)
**Default size**: 20px (inline), 24px (standalone)
**Color**: Inherits from parent text color
**Usage**: 31 files import from lucide-react

---

## DATA VISUALIZATION

### Chart Colors (deep saturated, no pastel/glass)

```
emerald:  #10b981    blue:    #3b82f6    amber:   #f59e0b
violet:   #8b5cf6    rose:    #ef4444    sky:     #0ea5e9
orange:   #f97316    teal:    #14b8a6    pink:    #ec4899
indigo:   #6366f1
```

### Score Badge Colors

```
High (green):   #0A6B2E background, white text
Mid (yellow):   #EAB308 background, dark text  ← NOT brown
Low (red):      #8B1A1A background, white text
```

---

## DESIGN PRINCIPLES

1. **Professional tapi ngga formal** — Clean layouts, friendly tone
2. **Touch-first** — 44px min targets, large tap areas for tablet POS
3. **3-4 click checkout** — Minimize steps for transaction speed
4. **Instant feedback** — Loading states, toasts, never blank screens
5. **Never window.confirm()** — Use styled modals always
6. **Progressive disclosure** — Show essentials first, details on demand
7. **Consistent shadows** — Neobrutalist offset style throughout
8. **8px grid** — All spacing derives from multiples of 4/8

---

## EXISTING ISSUES TO FIX

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Dashboard has inline StatCard instead of using ui/StatCard | dashboard/page.tsx | Refactor to use shared component |
| 2 | Products page has inline Modal instead of using ui/Modal | products/page.tsx | Refactor to use shared component |
| 3 | Dark mode force-disabled but 1117 dark: classes exist | ThemeContext | Keep dark: classes, document as future feature |
| 4 | Aggressive !important tablet overrides in globals.css | globals.css | Refactor to Tailwind responsive classes |
| 5 | No design token constants file | — | Create src/lib/design-tokens.ts |
| 6 | Inconsistent error handling (TRPCError vs generic Error) | Multiple routers | Standardize to TRPCError |

---

*Document maintained alongside AUDIT_REPORT_PHASE1.md*
*Stack: Next.js 16 + Tailwind CSS v4 + Geist fonts + Lucide icons*
