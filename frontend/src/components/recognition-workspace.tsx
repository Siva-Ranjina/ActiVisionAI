import { useId, useRef, useState } from "react"
import { FileVideo, Trash2, Upload } from "lucide-react"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { DEMO_PREDICTION, type Prediction } from "@/lib/activities"
import { isApiConfigured, postPredict } from "@/lib/api"
import type { ApiStatus } from "@/lib/api-status"
import { fileExtension, formatBytes, formatDuration } from "@/lib/format"
import { readVideoDuration, samplePreviewFrames, validateVideoFile } from "@/lib/video"
import { cn } from "cn"

type SelectedVideo = {
  file: File
  url: string
  duration: number | null
}

type RecognitionWorkspaceProps = {
  apiStatus: ApiStatus
  onApiConnected: () => void
}

export function RecognitionWorkspace({ apiStatus, onApiConnected }: RecognitionWorkspaceProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const runToken = useRef(0)
  const selectToken = useRef(0)
  const [selected, setSelected] = useState<SelectedVideo | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [previewFrames, setPreviewFrames] = useState<string[]>([])

  function clearSelection() {
    runToken.current += 1
    selectToken.current += 1
    setAnalyzing(false)
    setProgress(0)
    setPrediction(null)
    setPreviewFrames([])
    setError(null)
    setSelected((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
    if (inputRef.current) inputRef.current.value = ""
  }

  async function acceptFile(file: File | undefined) {
    if (!file) return
    const validationError = validateVideoFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    runToken.current += 1
    const token = ++selectToken.current
    setAnalyzing(false)
    setProgress(0)
    setPrediction(null)
    setPreviewFrames([])
    setError(null)
    const url = URL.createObjectURL(file)
    const duration = await readVideoDuration(file)
    if (token !== selectToken.current) {
      URL.revokeObjectURL(url)
      return
    }
    setSelected((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return { file, url, duration }
    })
  }

  async function analyze() {
    if (!selected || analyzing) return
    const token = ++runToken.current
    const file = selected.file
    setError(null)
    setPrediction(null)
    setPreviewFrames([])
    setAnalyzing(true)
    setProgress(8)
    setProgressLabel(
      isApiConfigured()
        ? "Uploading the video to the recognition service…"
        : "Preparing a labeled demonstration result…",
    )

    const frameTask = samplePreviewFrames(file).catch(() => [] as string[])

    try {
      let next: Prediction
      if (isApiConfigured()) {
        next = await postPredict(file, (percent) => {
          if (token !== runToken.current) return
          setProgress(percent)
          if (percent >= 85) setProgressLabel("Waiting for the activity prediction…")
        })
        if (token !== runToken.current) return
        onApiConnected()
      } else {
        next = await runDemonstration((percent) => {
          if (token !== runToken.current) return
          setProgress(percent)
        })
      }
      if (token !== runToken.current) return
      setPrediction(next)
      setProgress(100)
      const frames = await frameTask
      if (token !== runToken.current) return
      setPreviewFrames(frames)
    } catch (caught) {
      if (token !== runToken.current) return
      const message =
        caught instanceof Error
          ? caught.message
          : "Activity recognition could not be completed."
      setError(message)
      setPrediction(null)
    } finally {
      if (token === runToken.current) setAnalyzing(false)
    }
  }

  return (
    <section id="recognize" className="scroll-mt-20 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.18em] text-sky-200/80 uppercase">Recognize activity</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Analyze a video sequence</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            Drop a short clip of one of the five activities. The workspace checks the file, previews it,
            and then requests a prediction.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="glass-panel rounded-3xl p-5 sm:p-6">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                void acceptFile(file)
              }}
            />

            <div
              onDragEnter={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                void acceptFile(event.dataTransfer.files?.[0])
              }}
              className={cn(
                "flex flex-col items-center rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
                dragOver ? "border-sky-300/70 bg-sky-400/10" : "border-white/20 bg-white/5",
              )}
            >
              <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-violet-400/25 text-sky-100">
                  <Upload className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-base font-medium text-white">Drag and drop a video</span>
                <span className="mt-1 max-w-sm text-sm text-slate-300">
                  MP4, WebM, MOV, or AVI up to 100 MB. Activate to browse files.
                </span>
              </label>
              <Button
                type="button"
                className="mt-5 h-10 px-4"
                onClick={(event) => {
                  event.stopPropagation()
                  inputRef.current?.click()
                }}
              >
                Browse Files
              </Button>
            </div>

            {apiStatus === "demo" ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                No backend URL is configured. Analyze Activity will show a labeled demonstration result
                for Playing Guitar. It will not be presented as a real model prediction.
              </p>
            ) : null}
            {apiStatus === "unavailable" ? (
              <p className="mt-4 text-sm leading-relaxed text-amber-100">
                A recognition service URL is set, but it is not responding yet. Analysis will report the
                service error instead of filling in a demonstration score.
              </p>
            ) : null}

            {selected ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileVideo className="mt-0.5 size-4 shrink-0 text-sky-200" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white" title={selected.file.name}>
                        {selected.file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {formatBytes(selected.file.size)} · {fileExtension(selected.file.name)}
                        {selected.duration != null ? ` · ${formatDuration(selected.duration)}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${selected.file.name}`}
                    disabled={analyzing}
                    onClick={clearSelection}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <video
                  key={selected.url}
                  src={selected.url}
                  controls
                  playsInline
                  className="aspect-video w-full rounded-2xl bg-black"
                  aria-label={`Preview of ${selected.file.name}`}
                />

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={analyzing} onClick={() => inputRef.current?.click()}>
                    Replace video
                  </Button>
                  <Button type="button" className="h-9 px-4" disabled={analyzing} onClick={() => void analyze()}>
                    {analyzing ? "Analyzing…" : "Analyze Activity"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Select a video to enable Analyze Activity.</p>
            )}

            {error ? (
              <p className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-50" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <ResultsPanel
            summary={
              selected
                ? { name: selected.file.name, size: selected.file.size, duration: selected.duration }
                : null
            }
            prediction={prediction}
            previewFrames={previewFrames}
            analyzing={analyzing}
            progress={progress}
            progressLabel={progressLabel}
          />
        </div>
      </div>
    </section>
  )
}

function runDemonstration(onProgress: (percent: number) => void): Promise<Prediction> {
  return new Promise((resolve) => {
    const started = performance.now()
    const duration = 1200
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started
      const percent = Math.min(96, Math.round((elapsed / duration) * 100))
      onProgress(percent)
      if (elapsed >= duration) {
        window.clearInterval(timer)
        onProgress(100)
        resolve(DEMO_PREDICTION)
      }
    }, 80)
  })
}
