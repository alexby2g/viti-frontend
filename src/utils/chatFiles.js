export const CHAT_FILE_ACCEPT = 'image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.txt'
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024

const documentExtensions = ['pdf','doc','docx','xls','xlsx','txt']

export function extensionOf(name='') {
  return String(name).split('.').pop()?.toLowerCase() || ''
}

export function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'))
}

export function isImageMessage(message) {
  if (!message?.archivo_url) return false
  if (String(message.archivo_mime || '').startsWith('image/')) return true
  return ['jpg','jpeg','png','webp'].includes(extensionOf(message.archivo_nombre))
}

export function isAllowedChatFile(file) {
  if (!file) return false
  if (isImageFile(file)) return true
  return documentExtensions.includes(extensionOf(file.name))
}

export function chatFileIcon(messageOrFile) {
  const ext = extensionOf(messageOrFile?.archivo_nombre || messageOrFile?.name)
  if (ext === 'pdf') return 'picture_as_pdf'
  if (['doc','docx'].includes(ext)) return 'description'
  if (['xls','xlsx'].includes(ext)) return 'table_view'
  if (ext === 'txt') return 'text_snippet'
  return 'attach_file'
}

export function formatFileSize(bytes) {
  const value = Number(bytes || 0)
  if (!value) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function attachmentPreviewLabel(message) {
  if (!message?.archivo_url && !message?.archivo_path) return 'Sin mensajes'
  return isImageMessage(message) ? '📷 Imagen adjunta' : `📎 ${message.archivo_nombre || 'Documento adjunto'}`
}
