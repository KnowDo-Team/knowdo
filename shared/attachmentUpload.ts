/** Single-file size limit for `/api/upload` — keep in sync with server handler */
export const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024
export const MAX_ATTACHMENT_LABEL_MB = Math.trunc(MAX_ATTACHMENT_BYTES / (1024 * 1024))

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'mp3',
  'wav',
  'm4a',
  'mp4',
  'pdf',
  'doc',
  'docx',
  'zip',
  'rar'
] as const

export const ATTACHMENT_FILE_INPUT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map(ext => `.${ext}`).join(',')

export function isAllowedAttachmentExtension(ext: string): boolean {
  return (ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)
}

export function uploadFetchErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const anyErr = error as { data?: { statusMessage?: string }; statusMessage?: string }
    const fromData = anyErr.data?.statusMessage
    if (fromData) return fromData
    if (anyErr.statusMessage) return anyErr.statusMessage
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
