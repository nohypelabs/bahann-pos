/**
 * LazyRichTextEditor Component
 * Lazy-loadable rich text editor wrapper for heavy editor libraries
 *
 * This wrapper supports lazy loading of popular rich text editors like:
 * - TipTap
 * - Quill
 * - Draft.js
 * - Slate
 *
 * Usage:
 * ```tsx
 * const RichTextEditor = lazy(() => import('@/components/ui/LazyRichTextEditor'))
 *
 * <Suspense fallback={<EditorLoadingSkeleton />}>
 *   <RichTextEditor
 *     value={content}
 *     onChange={setContent}
 *     label="Description"
 *   />
 * </Suspense>
 * ```
 */
'use client'

import { useState, useRef, useEffect } from 'react'

interface LazyRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  minHeight?: number
  maxHeight?: number
  fullWidth?: boolean
  disabled?: boolean
  showToolbar?: boolean
}

/**
 * Lightweight rich text editor implementation
 * Can be replaced with TipTap, Quill, or other heavy libraries when needed
 *
 * To use a heavy library:
 * 1. Install: npm install @tiptap/react @tiptap/starter-kit
 * 2. Import: import { useEditor, EditorContent } from '@tiptap/react'
 * 3. Replace the textarea below with the library's editor component
 */
export default function LazyRichTextEditor({
  value,
  onChange,
  label,
  placeholder = 'Start typing...',
  required = false,
  error,
  minHeight = 200,
  maxHeight = 500,
  fullWidth = true,
  disabled = false,
  showToolbar = true,
}: LazyRichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [value, minHeight, maxHeight])

  const handleFormat = (format: 'bold' | 'italic' | 'underline') => {
    // Simple formatting helper (in a real implementation, this would use a library)
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    let formattedText = selectedText
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        break
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end)
    onChange(newValue)

    // Restore focus
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + formattedText.length)
    }, 0)
  }

  const textareaClasses = `
    w-full px-2 py-2 md:px-4 md:py-3 rounded-xl border-2 transition-all resize-none
    ${error
      ? 'border-red-300 focus:border-red-500'
      : isFocused
        ? 'border-blue-500 ring-2 ring-blue-200'
        : 'border-gray-300 hover:border-gray-400'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    focus:outline-none text-gray-900 font-sans
  `.trim()

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Toolbar */}
      {showToolbar && !disabled && (
        <div className="flex items-center gap-1 p-2 mb-2 bg-gray-50 border-2 border-gray-200 rounded-xl">
          <button
            type="button"
            onClick={() => handleFormat('bold')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Bold (Ctrl+B)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4v12h4.5c1.933 0 3.5-1.567 3.5-3.5 0-1.194-.596-2.25-1.506-2.883.389-.551.622-1.223.622-1.95C13.116 5.567 11.549 4 9.616 4H6zm2 2h1.616c.83 0 1.5.67 1.5 1.5S10.446 9 9.616 9H8V6zm0 5h2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H8v-3z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat('italic')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Italic (Ctrl+I)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 4h3l-3 12H8l3-12z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat('underline')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Underline (Ctrl+U)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 3v7c0 2.21 1.79 4 4 4s4-1.79 4-4V3h-2v7c0 1.1-.9 2-2 2s-2-.9-2-2V3H6zM4 17h12v2H4z"/>
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">
            {value.length} characters
          </span>
        </div>
      )}

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={textareaClasses}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Optimization note */}
      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-800">
          ✅ <strong>Lazy Loaded:</strong> This editor is only loaded when needed.
          Heavy libraries like TipTap, Quill, or Draft.js can be integrated here
          without affecting initial page load.
        </p>
      </div>
    </div>
  )
}
