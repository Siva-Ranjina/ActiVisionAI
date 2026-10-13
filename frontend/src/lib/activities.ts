export const ACTIVITY_CLASSES = [
  "Biking",
  "JumpingJack",
  "PlayingGuitar",
  "PushUps",
  "WalkingWithDog",
] as const

export type ActivityClass = (typeof ACTIVITY_CLASSES)[number]

export const ACTIVITY_LABELS: Record<ActivityClass, string> = {
  Biking: "Biking",
  JumpingJack: "Jumping Jack",
  PlayingGuitar: "Playing Guitar",
  PushUps: "Push Ups",
  WalkingWithDog: "Walking With Dog",
}

export type ClassProbabilities = Record<ActivityClass, number>

export type PredictionSource = "demo" | "api"

export type Prediction = {
  predictedClass: string
  confidence: number
  probabilities?: ClassProbabilities
  frames?: string[]
  source: PredictionSource
}

export const DEMO_PREDICTION: Prediction = {
  predictedClass: "PlayingGuitar",
  confidence: 0.86,
  probabilities: {
    Biking: 0.04,
    JumpingJack: 0.03,
    PlayingGuitar: 0.86,
    PushUps: 0.03,
    WalkingWithDog: 0.04,
  },
  source: "demo",
}

export function activityLabel(className: string): string {
  if ((ACTIVITY_CLASSES as readonly string[]).includes(className)) {
    return ACTIVITY_LABELS[className as ActivityClass]
  }
  return className
}

export function isActivityClass(value: string): value is ActivityClass {
  return (ACTIVITY_CLASSES as readonly string[]).includes(value)
}
