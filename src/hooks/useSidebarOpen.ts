'use client'

import { useEffect, useSyncExternalStore } from 'react'

/** localStorage key for the desktop sidebar's open/closed choice. */
export const SIDEBAR_OPEN_KEY = 'lakupos-sidebar-open'

const listeners = new Set<() => void>()
// Used when storage is blocked (private mode, site data disabled) so the toggle still works this session.
let memoryOpen: boolean | null = null

function readOpen(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_OPEN_KEY)
    if (saved !== null) return saved !== 'false'
  } catch {
    // storage unavailable: fall through to the in-memory value
  }
  return memoryOpen ?? true
}

function writeOpen(open: boolean) {
  memoryOpen = open
  try {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(open))
  } catch {
    // storage unavailable: the in-memory value is enough for this session
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep other tabs in step with the choice.
  const onStorage = (e: StorageEvent) => {
    if (e.key === SIDEBAR_OPEN_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function subscribeNever() {
  return () => {}
}

function readIsMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

/** Flips the desktop sidebar between open and the narrow icon rail. */
export function toggleSidebar() {
  writeOpen(!readOpen())
}

/**
 * Desktop sidebar state, persisted in localStorage. The server render and the first client
 * render both use the default (open); the saved value is applied right after hydration, so
 * there is no hydration mismatch.
 */
export function useSidebarOpen() {
  const open = useSyncExternalStore(subscribe, readOpen, () => true)
  const isMac = useSyncExternalStore(subscribeNever, readIsMac, () => false)
  return { open, toggle: toggleSidebar, shortcut: isMac ? '⌘B' : 'Ctrl+B' }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/** Ctrl+B (Cmd+B on a Mac) toggles the sidebar, except while the user is typing in a field. */
export function useSidebarShortcut(onToggle: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      if (e.key.toLowerCase() !== 'b') return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      onToggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onToggle])
}
