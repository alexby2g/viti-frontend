import { api } from '../boot/axios'
export async function downloadFile(url, fallback='archivo.pdf') {
  const response = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = href
  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  link.download = match?.[1] || fallback
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(href)
}
