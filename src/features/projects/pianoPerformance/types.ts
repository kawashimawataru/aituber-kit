export interface PianoNote {
  time: number
  notes: string[]
  duration: number
  velocity?: number
}

export type PianoScore = PianoNote[]
