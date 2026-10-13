import { ArrowRight, Clapperboard, Layers3, ScanSearch } from "lucide-react"
import { scrollToSection } from "@/lib/scroll"
import { Button } from "@/components/ui/button"

const POINTS = [
  {
    icon: Clapperboard,
    title: "Video sequences",
    text: "Activities are recognized from motion across frames, not from a single still image.",
  },
  {
    icon: Layers3,
    title: "Convolutional features",
    text: "A frozen MobileNetV2 network turns each 224×224 frame into a visual feature vector.",
  },
  {
    icon: ScanSearch,
    title: "Five activities",
    text: "The classifier distinguishes biking, jumping jacks, guitar playing, push-ups, and walking a dog.",
  },
]

export function HeroSection() {
  return (
    <section id="dashboard" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-wide text-sky-100/90">
            Final-year deep learning project
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Understand Human Actions Through AI
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            ActiVision AI reads short video sequences and estimates which human activity is taking place.
            Frames are sampled, resized, and passed through a convolutional network trained on selected
            classes from the UCF101 dataset.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              className="h-11 px-5 text-sm"
              onClick={() => scrollToSection("recognize")}
            >
              Analyze a Video
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 px-5 text-sm"
              onClick={() => scrollToSection("about")}
            >
              About the model
            </Button>
          </div>
        </div>

        <ul className="grid gap-3">
          {POINTS.map((point) => (
            <li key={point.title} className="glass-panel flex gap-4 rounded-2xl p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400/20 to-violet-400/20 text-sky-200">
                <point.icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-white">{point.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-300">{point.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
