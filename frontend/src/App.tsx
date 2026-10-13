import { AboutSection } from "@/components/about-section"
import { HeroSection } from "@/components/hero-section"
import { RecognitionWorkspace } from "@/components/recognition-workspace"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { useApiStatus } from "@/lib/api-status"

export default function App() {
  const { status, setStatus } = useApiStatus()

  return (
    <div className="min-h-svh">
      <a
        href="#recognize"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to recognition
      </a>
      <SiteHeader status={status} />
      <main>
        <HeroSection />
        <RecognitionWorkspace
          apiStatus={status}
          onApiConnected={() => setStatus("connected")}
        />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  )
}
