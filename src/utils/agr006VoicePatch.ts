import { api } from '../boot/axios'

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null

function fallbackVoice() {
  const voices = window.speechSynthesis.getVoices()
  const spanish = voices.filter((voice) => String(voice.lang || '').toLowerCase().startsWith('es'))
  if (!spanish.length) return null
  const maleHints = /(jorge|carlos|diego|miguel|antonio|raul|raúl|juan|manuel|alejandro|sergio|gabriel|male|hombre|man)/i
  return spanish.find((voice) => maleHints.test(String(voice.name || '')) && String(voice.lang || '').toLowerCase() === 'es-mx')
    || spanish.find((voice) => maleHints.test(String(voice.name || '')))
    || spanish.find((voice) => String(voice.lang || '').toLowerCase() === 'es-mx')
    || spanish[0]
}

function base64ToBlob(base64: string, mime = 'audio/mpeg'): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

async function speakWith006Voice(text: string): Promise<boolean> {
  try {
    const response = await api.post('/agr/voice', { text })
    const audioBase64 = String(response?.data?.audio || '')
    if (!audioBase64) return false

    currentAudio?.pause()
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)

    currentObjectUrl = URL.createObjectURL(base64ToBlob(audioBase64, String(response?.data?.mime || 'audio/mpeg')))
    currentAudio = new Audio(currentObjectUrl)
    currentAudio.preload = 'auto'
    await currentAudio.play()
    return true
  } catch {
    return false
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const synth = window.speechSynthesis
  const originalSpeak = synth.speak.bind(synth)

  synth.speak = (utterance: SpeechSynthesisUtterance) => {
    if (!String(utterance.lang || '').toLowerCase().startsWith('es')) {
      originalSpeak(utterance)
      return
    }

    const text = String(utterance.text || '').trim()
    if (!text) return

    void speakWith006Voice(text).then((premiumReady) => {
      if (premiumReady) return

      const voice = fallbackVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang || 'es-MX'
      } else {
        utterance.lang = 'es-MX'
      }
      // Fallback local de 006: masculino, grave, pausado y firme.
      utterance.pitch = 0.78
      utterance.rate = 0.90
      originalSpeak(utterance)
    })
  }
}
