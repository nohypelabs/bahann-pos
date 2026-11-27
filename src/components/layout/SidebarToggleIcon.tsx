/** Panel icon for the sidebar toggle: a rounded square with a short bar on the left, the same open or closed. */
export function SidebarToggleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <path d="M8.5 9v6" />
    </svg>
  )
}
