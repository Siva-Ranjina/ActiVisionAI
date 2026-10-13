import { Database, Film, Network, Sigma } from "lucide-react"
import { ACTIVITY_CLASSES, ACTIVITY_LABELS } from "@/lib/activities"

const STEPS = [
  {
    icon: Film,
    title: "Frame preprocessing",
    text: "Each video is reduced to 16 frames sampled evenly across the clip. Every frame is resized to 224 × 224 pixels and converted to RGB before MobileNetV2 preprocessing.",
  },
  {
    icon: Network,
    title: "CNN feature extraction",
    text: "A frozen ImageNet MobileNetV2 backbone, without its classification head, encodes each frame. Global average pooling produces a 1,280-dimensional feature vector per frame.",
  },
  {
    icon: Sigma,
    title: "Temporal pooling",
    text: "The 16 frame vectors are averaged over time. That single video-level vector is the input to the trained Keras activity classifier.",
  },
  {
    icon: Database,
    title: "UCF101 subset",
    text: "Training used five action classes drawn from UCF101, a public dataset of realistic human actions recorded in video. The weights live outside this interface, in a Keras file loaded by the Python backend.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.18em] text-violet-200/80 uppercase">About project</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Deep convolutional networks for video activity recognition
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            This college project classifies human activity from video sequences. TensorFlow and Keras
            train and serve the model. The browser only uploads a clip and displays the JSON returned
            by a Python service. It does not run the neural network itself.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {STEPS.map((step) => (
            <article key={step.title} className="glass-panel rounded-2xl p-5">
              <step.icon className="size-5 text-sky-300" aria-hidden="true" />
              <h3 className="mt-3 text-base font-medium text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.text}</p>
            </article>
          ))}
        </div>

        <div className="glass-panel mt-4 rounded-2xl p-5">
          <h3 className="text-base font-medium text-white">Supported activity classes</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Classifier outputs stay in this fixed order: index 0 through 4.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {ACTIVITY_CLASSES.map((name, index) => (
              <li key={name} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <span className="block text-[11px] tracking-wide text-slate-400">Class {index}</span>
                <span className="mt-1 block text-sm font-medium text-white">{ACTIVITY_LABELS[name]}</span>
                <span className="mt-1 block font-mono text-[11px] text-slate-400">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
