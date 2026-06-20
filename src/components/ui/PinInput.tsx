'use client'

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'

interface PinInputProps {
  length?: 4 | 6
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  label?: string
  className?: string
}

/**
 * PIN input with individual digit boxes
 * Auto-focuses next box on input, supports backspace navigation
 */
export function PinInput({
  length = 6,
  value,
  onChange,
  error,
  disabled = false,
  autoFocus = true,
  label,
  className = '',
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  const handleChange = (index: number, digit: string) => {
    if (disabled) return
    // Only allow single digit
    const clean = digit.replace(/\D/g, '').slice(-1)
    const newValue = value.split('')
    newValue[index] = clean
    const result = newValue.join('').slice(0, length)
    onChange(result)

    // Auto-advance to next box
    if (clean && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move back if current is empty
        const newValue = value.split('')
        newValue[index - 1] = ''
        onChange(newValue.join(''))
        inputRefs.current[index - 1]?.focus()
      } else {
        // Clear current
        const newValue = value.split('')
        newValue[index] = ''
        onChange(newValue.join(''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      // Focus last filled or next empty
      const focusIndex = Math.min(pasted.length, length - 1)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-mobile-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
          {label}
        </label>
      )}
      <div className="flex justify-center gap-2.5">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-xl font-bold
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              border-2 rounded-2xl
              focus:outline-none focus:border-gray-400 dark:focus:border-gray-400
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-600'}
              ${value[i] ? 'border-gray-400 dark:border-gray-500' : ''}
            `}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
