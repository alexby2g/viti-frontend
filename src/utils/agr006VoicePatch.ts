const FEMALE_HINTS = /(sabina|helena|laura|paulina|lucia|lucía|monica|mónica|sofia|sofía|female|mujer|woman)/i

function preferredSpanishVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const spanish = voices.filter((voice) => String(voice.lang || '').toLowerCase().startsWith('es'))
  if (!spanish.length) return null
  return spanish.find((voice) => FEMALE_HINTS.test(String(voice.name || '')) && String(voice.lang || '').toLowerCase() === 'es-es')
    || spanish.find((voice) => FEMALE_HINTS.test(String(voice.name || '')))
    || spanish.find((voice) => String(voice.lang || '').toLowerCase() === 'es-es')
    || spanish[0]
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const synth = window.speechSynthesis
  const originalSpeak = synth.speak.bind(synth)
  synth.speak = (utterance: SpeechSynthesisUtterance) => {
    if (String(utterance.lang || '').toLowerCase().startsWith('es')) {
      const voice = preferredSpanishVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang || 'es-ES'
        utterance.pitch = 1.08
        utterance.rate = 0.96
      } else {
        utterance.lang = 'es-ES'
      }
    }
    originalSpeak(utterance)
  }
}
