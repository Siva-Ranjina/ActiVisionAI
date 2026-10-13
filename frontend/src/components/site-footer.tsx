export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>
          ActiVision AI — an academic deep learning project on convolutional neural networks for human
          activity recognition from video sequences.
        </p>
        <p className="text-slate-500">TensorFlow / Keras · UCF101 subset · 16 × 224×224 frames</p>
      </div>
    </footer>
  )
}
