import { AppError } from '@/shared/exceptions/AppError'

type SupportedImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp'
type SupportedImageExtension = 'png' | 'jpg' | 'webp'

export interface NormalizedImageUpload {
  buffer: Buffer
  mimeType: SupportedImageMimeType
  extension: SupportedImageExtension
  base64: string
  dataUrl: string
  sizeBytes: number
}

interface NormalizeImageUploadOptions {
  label: string
  maxBytes: number
}

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function normalizeImageUpload(
  input: string,
  options: NormalizeImageUploadOptions,
): NormalizedImageUpload {
  const trimmedInput = input.trim()
  if (!trimmedInput) {
    throw new AppError(`${options.label} wajib diisi.`, 400)
  }

  const dataUrlMatch = trimmedInput.match(DATA_URL_PATTERN)
  const declaredMimeType = dataUrlMatch?.[1]?.toLowerCase() ?? null
  const base64Payload = (dataUrlMatch?.[2] ?? trimmedInput).replace(/\s+/g, '')

  if (!BASE64_PATTERN.test(base64Payload)) {
    throw new AppError(`${options.label} bukan file base64 yang valid.`, 400)
  }

  const buffer = Buffer.from(base64Payload, 'base64')
  if (buffer.length === 0) {
    throw new AppError(`${options.label} kosong atau rusak.`, 400)
  }

  if (buffer.length > options.maxBytes) {
    throw new AppError(`${options.label} melebihi batas ${formatMegabytes(options.maxBytes)} MB.`, 400)
  }

  const detectedType = detectImageType(buffer)
  if (!detectedType) {
    throw new AppError(`${options.label} harus berupa PNG, JPG, atau WEBP.`, 400)
  }

  if (declaredMimeType && !mimeTypesMatch(declaredMimeType, detectedType.mimeType)) {
    throw new AppError(`${options.label} tidak cocok dengan tipe file aslinya.`, 400)
  }

  const normalizedBase64 = buffer.toString('base64')

  return {
    buffer,
    mimeType: detectedType.mimeType,
    extension: detectedType.extension,
    base64: normalizedBase64,
    dataUrl: `data:${detectedType.mimeType};base64,${normalizedBase64}`,
    sizeBytes: buffer.length,
  }
}

function detectImageType(
  buffer: Buffer,
): { mimeType: SupportedImageMimeType; extension: SupportedImageExtension } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: 'image/png', extension: 'png' }
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  return null
}

function mimeTypesMatch(declaredMimeType: string, detectedMimeType: SupportedImageMimeType): boolean {
  if (declaredMimeType === detectedMimeType) {
    return true
  }

  return declaredMimeType === 'image/jpg' && detectedMimeType === 'image/jpeg'
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0)
}
