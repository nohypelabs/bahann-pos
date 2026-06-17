interface PrintHtmlDocumentOptions {
  title: string
  bodyHtml: string
}

const PRINT_PAGE_STYLE = `
  @page { size: 80mm auto; margin: 0; }
  body { margin: 0; padding: 0; background: white; }
`

export async function printHtmlDocument({ title, bodyHtml }: PrintHtmlDocumentOptions): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !bodyHtml.trim()) {
    return false
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'

  document.body.appendChild(iframe)

  const iframeDocument = iframe.contentDocument
  const iframeWindow = iframe.contentWindow

  if (!iframeDocument || !iframeWindow) {
    iframe.remove()
    return false
  }

  iframeDocument.open()
  iframeDocument.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  ${collectPrintableHead()}
  <style>${PRINT_PAGE_STYLE}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`)
  iframeDocument.close()

  return await new Promise<boolean>((resolve) => {
    let settled = false

    const cleanup = () => {
      iframe.onload = null
      window.clearTimeout(fallbackTimeout)
      window.setTimeout(() => iframe.remove(), 0)
    }

    const finish = (didPrint: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(didPrint)
    }

    const triggerPrint = () => {
      const handleAfterPrint = () => finish(true)
      iframeWindow.addEventListener('afterprint', handleAfterPrint, { once: true })

      window.setTimeout(() => {
        try {
          iframeWindow.focus()
          iframeWindow.print()
          window.setTimeout(() => finish(true), 2000)
        } catch {
          finish(false)
        }
      }, 250)
    }

    const fallbackTimeout = window.setTimeout(() => finish(false), 5000)

    if (iframeDocument.readyState === 'complete') {
      triggerPrint()
      return
    }

    iframe.onload = triggerPrint
  })
}

function collectPrintableHead(): string {
  const styleTags = Array.from(document.querySelectorAll('style')).map((styleTag) => styleTag.outerHTML)
  const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((linkTag) => linkTag.outerHTML)

  return [...stylesheetLinks, ...styleTags].join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
