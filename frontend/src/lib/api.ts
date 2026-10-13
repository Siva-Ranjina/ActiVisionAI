import {
  ACTIVITY_CLASSES,
  type ClassProbabilities,
  type Prediction,
} from "@/lib/activities"

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiError"
  }
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "")
}

export function isApiConfigured(): boolean {
  return apiBaseUrl().length > 0
}

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail
    }
    if (Array.isArray(record.detail)) {
      const first = record.detail.find(
        (item) => item && typeof item === "object" && "msg" in item,
      ) as { msg?: unknown } | undefined
      if (typeof first?.msg === "string" && first.msg.trim()) return first.msg
    }
    if (typeof record.error === "string" && record.error.trim()) return record.error
    if (typeof record.message === "string" && record.message.trim()) return record.message
  }
  return `The recognition service returned an error (${status}).`
}

function parseProbabilities(value: unknown): ClassProbabilities | undefined {
  if (value == null) return undefined
  if (typeof value !== "object") {
    throw new ApiError("The recognition service returned class probabilities in an unexpected format.")
  }
  const record = value as Record<string, unknown>
  const probabilities = {} as ClassProbabilities
  for (const name of ACTIVITY_CLASSES) {
    const score = record[name]
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) {
      throw new ApiError(
        "The recognition service did not return a probability between 0 and 1 for every activity class.",
      )
    }
    probabilities[name] = score
  }
  return probabilities
}

function parseFrames(value: unknown): string[] | undefined {
  if (value == null) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new ApiError("The recognition service returned frame previews in an unexpected format.")
  }
  return value
}

export function parsePrediction(body: unknown): Prediction {
  if (!body || typeof body !== "object") {
    throw new ApiError("The recognition service returned a response this app could not read.")
  }
  const record = body as Record<string, unknown>
  const predictedClass = record.predicted_class
  const confidence = record.confidence
  if (typeof predictedClass !== "string" || !predictedClass.trim()) {
    throw new ApiError("The recognition service did not return a predicted activity.")
  }
  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new ApiError("The recognition service did not return a confidence score between 0 and 1.")
  }

  return {
    predictedClass: predictedClass.trim(),
    confidence,
    probabilities: parseProbabilities(record.probabilities),
    frames: parseFrames(record.frames),
    source: "api",
  }
}

export function frameImageSrc(value: string): string {
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value
  }
  return `data:image/jpeg;base64,${value}`
}

export async function checkHealth(signal: AbortSignal): Promise<boolean> {
  const base = apiBaseUrl()
  if (!base) return false
  try {
    const response = await fetch(`${base}/health`, { signal })
    return response.ok
  } catch {
    return false
  }
}

export function postPredict(
  file: File,
  onProgress: (percent: number) => void,
): Promise<Prediction> {
  const base = apiBaseUrl()
  if (!base) {
    return Promise.reject(new ApiError("No recognition service URL is configured."))
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${base}/predict`)
    xhr.timeout = 120_000
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return
      onProgress(Math.min(85, Math.round((event.loaded / event.total) * 85)))
    }
    xhr.onerror = () => {
      reject(
        new ApiError(
          "Could not reach the recognition service. Check that the backend is running and that VITE_API_BASE_URL is correct.",
        ),
      )
    }
    xhr.ontimeout = () => {
      reject(new ApiError("The recognition service took too long to respond. Try a shorter video."))
    }
    xhr.onload = () => {
      let body: unknown = null
      const text = xhr.responseText?.trim() ?? ""
      if (text) {
        try {
          body = JSON.parse(text) as unknown
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            reject(new ApiError("The recognition service returned a response this app could not read."))
            return
          }
        }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(messageFromBody(body, xhr.status)))
        return
      }
      try {
        onProgress(100)
        resolve(parsePrediction(body))
      } catch (error) {
        reject(error instanceof Error ? error : new ApiError("The recognition service returned an unexpected result."))
      }
    }

    const form = new FormData()
    form.append("video", file, file.name)
    xhr.send(form)
  })
}
