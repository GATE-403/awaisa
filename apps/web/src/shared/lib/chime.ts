const NOTES = [
  { frequency: 1318.5, at: 0 },
  { frequency: 1760, at: 0.12 },
]

let context: AudioContext | null = null

// A short two-note chime, like a calendar alert. Browsers only allow sound after a user gesture,
// so a blocked or missing AudioContext is ignored.
export const playChime = () => {
  try {
    context ??= new AudioContext()
    void context.resume()
    const start = context.currentTime

    for (const note of NOTES) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = note.frequency
      gain.gain.setValueAtTime(0, start + note.at)
      gain.gain.linearRampToValueAtTime(0.18, start + note.at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.at + 0.5)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start + note.at)
      oscillator.stop(start + note.at + 0.55)
    }
  } catch {
    // No audio: the toast is enough.
  }
}
