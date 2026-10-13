const ACCEPTED_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"]

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export function validateVideoFile(file: File): string | null {
  const name = file.name.toLowerCase()
  const accepted = ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))
  if (!accepted) {
    return "This file type is not supported. Upload an MP4, WebM, MOV, or AVI video."
  }
  if (file.size === 0) {
    return "This file is empty. Choose a video that contains frames."
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "This video is larger than 100 MB. Choose a smaller file and try again."
  }
  return null
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url)
      video.removeAttribute("src")
      video.load()
      resolve(value)
    }
    video.onloadedmetadata = () => {
      const duration = video.duration
      finish(Number.isFinite(duration) && duration > 0 && duration !== Infinity ? duration : null)
    }
    video.onerror = () => finish(null)
    video.src = url
  })
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), milliseconds)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  const seek = new Promise<void>((resolve, reject) => {
    const target = Math.min(Math.max(time, 0), Number.isFinite(video.duration) ? Math.max(video.duration - 0.05, 0) : 0)
    if (Math.abs(video.currentTime - target) < 0.01) {
      resolve()
      return
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Could not seek in this video."))
    }
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("error", onError)
    }
    video.addEventListener("seeked", onSeeked)
    video.addEventListener("error", onError)
    video.currentTime = target
  })
  return withTimeout(seek, 1500, "Could not seek in this video.")
}

function drawCover(context: CanvasRenderingContext2D, video: HTMLVideoElement, size: number) {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error("This video has no readable frames.")
  const scale = Math.max(size / width, size / height)
  const drawnWidth = width * scale
  const drawnHeight = height * scale
  context.drawImage(video, (size - drawnWidth) / 2, (size - drawnHeight) / 2, drawnWidth, drawnHeight)
}

export async function samplePreviewFrames(file: File, count = 8): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.preload = "auto"
  video.muted = true
  video.playsInline = true
  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve()
        video.onerror = () => reject(new Error("Could not read frames from this video."))
        video.src = url
      }),
      4000,
      "Could not read frames from this video.",
    )
    if (!video.videoWidth || !video.videoHeight) return []
    const canvas = document.createElement("canvas")
    canvas.width = 224
    canvas.height = 224
    const context = canvas.getContext("2d")
    if (!context) return []
    const total = Math.max(count, 1)
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
    const frames: string[] = []
    for (let index = 0; index < total; index += 1) {
      const time = duration > 0 ? (duration * (index + 0.5)) / total : 0
      await seekTo(video, time)
      context.clearRect(0, 0, 224, 224)
      drawCover(context, video, 224)
      frames.push(canvas.toDataURL("image/jpeg", 0.82))
    }
    return frames
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute("src")
    video.load()
  }
}
