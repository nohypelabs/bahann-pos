'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollRevealOptions {
  /** Animation delay in ms */
  delay?: number
  /** Animation duration in ms */
  duration?: number
  /** Threshold for intersection (0-1) */
  threshold?: number
  /** Trigger only once */
  once?: boolean
  /** Root margin for intersection */
  rootMargin?: string
}

/**
 * Hook for scroll-triggered reveal animations.
 * Uses Intersection Observer for performance.
 *
 * Usage:
 *   const ref = useScrollReveal({ delay: 100 })
 *   <div ref={ref} className="scroll-reveal">...</div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions = {}) {
  const {
    delay = 0,
    duration = 600,
    threshold = 0.1,
    once = true,
    rootMargin = '0px 0px -50px 0px',
  } = options

  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(element)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  const style: React.CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
  }

  return { ref, style, isVisible }
}

/**
 * Hook for staggered reveal animations (children appear one by one).
 *
 * Usage:
 *   const { ref, getItemStyle } = useStaggerReveal({ count: 4 })
 *   <div ref={ref}>
 *     {items.map((item, i) => <div style={getItemStyle(i)}>...</div>)}
 *   </div>
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(options: {
  count: number
  stagger?: number
  duration?: number
  threshold?: number
} = { count: 1 }) {
  const {
    count,
    stagger = 80,
    duration = 600,
    threshold = 0.1,
  } = options

  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(element)
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  const getItemStyle = (index: number): React.CSSProperties => ({
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${index * stagger}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${index * stagger}ms`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
  })

  return { ref, getItemStyle, isVisible }
}

/**
 * Hook for fade-in-scale animations (good for cards, images).
 */
export function useFadeInScale<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions = {}) {
  const {
    delay = 0,
    duration = 600,
    threshold = 0.1,
    once = true,
    rootMargin = '0px 0px -50px 0px',
  } = options

  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(element)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  const style: React.CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
  }

  return { ref, style, isVisible }
}

/**
 * Hook for slide-in from left/right.
 */
export function useSlideIn<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions & { direction?: 'left' | 'right' } = {}) {
  const {
    delay = 0,
    duration = 700,
    threshold = 0.1,
    once = true,
    rootMargin = '0px 0px -50px 0px',
    direction = 'left',
  } = options

  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(element)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  const translateX = direction === 'left' ? '-40px' : '40px'

  const style: React.CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateX(0)' : `translateX(${translateX})`,
  }

  return { ref, style, isVisible }
}
