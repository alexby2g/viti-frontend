const MALE_HINTS = /(jorge|carlos|diego|miguel|antonio|raul|raúl|juan|manuel|alejandro|sergio|gabriel|male|hombre|man)/i

function preferredSpanishVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const spanish = voices.filter((voice) => String(voice.lang || '').toLowerCase().startsWith('es'))
  if (!spanish.length) return null
  return spanish.find((voice) => MALE_HINTS.test(String(voice.name || '')) && String(voice.lang || '').toLowerCase() === 'es-mx')
    || spanish.find((voice) => MALE_HINTS.test(String(voice.name || '')) && String(voice.lang || '').toLowerCase() === 'es-es')
    || spanish.find((voice) => MALE_HINTS.test(String(voice.name || '')))
    || spanish.find((voice) => String(voice.lang || '').toLowerCase() === 'es-mx')
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
        utterance.lang = voice.lang || 'es-MX'
        // Perfil vocal propio de 006: masculino, grave, pausado y firme.
        utterance.pitch = 0.78
        utterance.rate = 0.90
      } else {
        utterance.lang = 'es-MX'
        utterance.pitch = 0.78
        utterance.rate = 0.90
      }
    }
    originalSpeak(utterance)
  }
}
