const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/** "C4", "D#3", "Bb5" → Hz (null if unparseable) */
export function noteNameToFreq(name: string): number | null {
  const m = name.trim().match(/^([A-Ga-g](?:#|b)?)(\d)$/)
  if (!m) return null
  const semi = NOTE_SEMITONES[m[1].charAt(0).toUpperCase() + m[1].slice(1)]
  if (semi === undefined) return null
  const octave = parseInt(m[2], 10)
  const midi = (octave + 1) * 12 + semi
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Normalize flat names to sharp for keyboard lookup. */
export function normalizeNoteName(name: string): string {
  const flatToSharp: Record<string, string> = {
    Db: 'C#',
    Eb: 'D#',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
  }
  const m = name.trim().match(/^([A-Ga-g](?:#|b)?)(\d)$/)
  if (!m) return name
  const base = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  const oct = m[2]
  return `${flatToSharp[base] ?? base}${oct}`
}

/**
 * Schedule a piano-like note using Web Audio API.
 * All nodes route through `dest` (typically a compressor or master gain).
 */
export function schedulePianoNote(
  ctx: AudioContext,
  dest: AudioNode,
  noteName: string,
  startTime: number,
  duration: number,
  velocity = 0.7
): void {
  const freq = noteNameToFreq(noteName)
  if (!freq) return

  const env = ctx.createGain()
  env.connect(dest)

  // ADSR
  const att = 0.008
  const dec = 0.14
  const sus = velocity * 0.35
  const rel = Math.min(0.28, duration * 0.3)
  const end = startTime + duration

  env.gain.setValueAtTime(0, startTime)
  env.gain.linearRampToValueAtTime(velocity * 0.85, startTime + att)
  env.gain.exponentialRampToValueAtTime(sus, startTime + att + dec)
  env.gain.setValueAtTime(sus, end - rel)
  env.gain.exponentialRampToValueAtTime(0.0001, end + 0.05)

  const stop = end + 0.12

  const harmonics: [OscillatorType, number, number][] = [
    ['triangle', 1, 1.0],
    ['sine', 2, 0.22],
    ['sine', 3, 0.07],
    ['sine', 4, 0.03],
  ]

  for (const [type, harmonic, vol] of harmonics) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = vol
    osc.type = type
    osc.frequency.value = freq * harmonic
    osc.connect(g)
    g.connect(env)
    osc.start(startTime)
    osc.stop(stop)
  }
}
