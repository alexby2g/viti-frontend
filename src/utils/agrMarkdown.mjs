/**
 * Parse assistant Markdown into safe, structured data (never HTML).
 * Vue interpolates and escapes every piece of text in the view.
 */
const tick = String.fromCharCode(96)
const fence = tick.repeat(3)

export function parseAgrInline(text) {
  const parts = String(text || '').split(/(\*\*[^*\n]+\*\*|\x60[^\x60\n]+\x60)/g)
  return parts.filter(Boolean).map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { kind: 'strong', text: part.slice(2, -2) }
    }
    if (part.startsWith(tick) && part.endsWith(tick)) {
      return { kind: 'code', text: part.slice(1, -1) }
    }
    return { kind: 'plain', text: part }
  })
}

export function parseAgrMarkdown(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n')
  const lines = source.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i += 1; continue }

    if (line.startsWith(fence)) {
      const code = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        code.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: 'code', content: code.join('\n') })
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: Math.min(heading[1].length + 1, 5), spans: parseAgrInline(heading[2]) })
      i += 1
      continue
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      const items = []
      while (i < lines.length) {
        const nextLine = lines[i].trim()
        const nextMatch = ordered ? /^\d+[.)]\s+(.+)$/.exec(nextLine) : /^[-*]\s+(.+)$/.exec(nextLine)
        if (!nextMatch) break
        items.push(parseAgrInline(nextMatch[1]))
        i += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    const paragraph = [line]
    i += 1
    while (i < lines.length) {
      const nextLine = lines[i].trim()
      if (!nextLine || /^(#{1,4}\s|[-*]\s|\d+[.)]\s)/.test(nextLine) || nextLine.startsWith(fence)) break
      paragraph.push(nextLine)
      i += 1
    }
    blocks.push({ type: 'paragraph', spans: parseAgrInline(paragraph.join('\n')) })
  }
  return blocks
}
