import { Info } from "lucide-react"
import { ACTIVITY_CLASSES, activityLabel, type Prediction } from "@/lib/activities"
import { frameImageSrc } from "@/lib/api"
import { fileExtension, formatBytes, formatDuration, formatPercent } from "@/lib/format"
import { Progress } from "@/components/ui/progress"

type VideoSummary = {
  name: string
  size: number
  duration: number | null
}

type ResultsPanelProps = {
  summary: VideoSummary | null
  prediction: Prediction | null
  previewFrames: string[]
  analyzing: boolean
  progress: number
  progressLabel: string
}

export function ResultsPanel({
  summary,
  prediction,
  previewFrames,
  analyzing,
  progress,
  progressLabel,
}: ResultsPanelProps) {
  const serviceFrames = prediction?.source === "api" ? prediction.frames : undefined
  const showLocalFrames = !serviceFrames?.length && previewFrames.length > 0

  return (
    <section aria-labelledby="results-heading" className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="results-heading" className="text-lg font-semibold text-white">
            Recognition result
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            The predicted activity appears here after analysis finishes.
          </p>
        </div>
      </div>

      {analyzing ? (
        <div className="mt-6" role="status" aria-live="polite">
          <p className="text-sm text-slate-200">{progressLabel}</p>
          <Progress value={progress} className="mt-3 h-2 bg-white/10" aria-label="Analysis progress" />
          <p className="mt-2 text-xs text-slate-400">{progress}% complete</p>
        </div>
      ) : null}

      {!analyzing && !prediction ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          Upload a video and choose Analyze Activity. The predicted class and confidence will show up in this panel.
        </p>
      ) : null}

      {!analyzing && prediction ? (
        <div className="rise-in mt-6 space-y-5">
          {prediction.source === "demo" ? (
            <div className="flex gap-3 rounded-2xl border border-violet-300/30 bg-violet-400/10 px-4 py-3 text-sm text-violet-50" role="note">
              <Info className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden="true" />
              <p>
                Demonstration result. These scores are sample figures for the interface. They are not a
                prediction from the trained Keras classifier, and no TensorFlow model ran in the browser.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs tracking-wide text-slate-400 uppercase">Predicted activity</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {activityLabel(prediction.predictedClass)}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">{prediction.predictedClass}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs tracking-wide text-slate-400 uppercase">Confidence</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {formatPercent(prediction.confidence)}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
                role="meter"
                aria-label="Confidence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(prediction.confidence * 100)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                  style={{ width: `${Math.max(0, Math.min(100, prediction.confidence * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {prediction.probabilities ? (
            <div>
              <h3 className="text-sm font-medium text-white">Class probabilities</h3>
              <ul className="mt-3 space-y-3">
                {ACTIVITY_CLASSES.map((name) => {
                  const score = prediction.probabilities?.[name] ?? 0
                  const active = name === prediction.predictedClass
                  return (
                    <li key={name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className={active ? "font-medium text-white" : "text-slate-300"}>
                          {activityLabel(name)}
                        </span>
                        <span className="font-mono text-xs text-slate-300">{formatPercent(score)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={
                            active
                              ? "h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                              : "h-full rounded-full bg-slate-400/70"
                          }
                          style={{ width: `${Math.max(0, Math.min(100, score * 100))}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Class probabilities were not included in this response, so only the predicted activity and
              confidence are shown.
            </p>
          )}

          {summary ? (
            <div>
              <h3 className="text-sm font-medium text-white">Uploaded video</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <SummaryItem label="File name" value={summary.name} />
                <SummaryItem label="File size" value={formatBytes(summary.size)} />
                <SummaryItem label="Format" value={fileExtension(summary.name)} />
                {summary.duration != null ? (
                  <SummaryItem label="Duration" value={formatDuration(summary.duration)} />
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}

      {serviceFrames && serviceFrames.length > 0 ? (
        <FrameStrip
          title="Frames from the recognition service"
          caption="These frames were returned by the Python backend with the prediction."
          frames={serviceFrames.map(frameImageSrc)}
        />
      ) : null}

      {showLocalFrames ? (
        <FrameStrip
          title="Sampled frame preview"
          caption="These frames were sampled in the browser for preview only. They were not passed through the convolutional network."
          frames={previewFrames}
        />
      ) : null}
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <dt className="text-[11px] tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="mt-1 truncate text-sm text-slate-100" title={value}>
        {value}
      </dd>
    </div>
  )
}

function FrameStrip({ title, caption, frames }: { title: string; caption: string; frames: string[] }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{caption}</p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {frames.map((src, index) => (
          <li key={`${src.slice(0, 32)}-${index}`} className="overflow-hidden rounded-xl border border-white/10">
            <img src={src} alt={`Sampled frame ${index + 1}`} className="aspect-square w-full object-cover" />
          </li>
        ))}
      </ul>
    </div>
  )
}
