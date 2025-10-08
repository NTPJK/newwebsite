import { useRef, useEffect, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '../../lib/gsap-config'
import siteConfig from '../../config/site.config.json'
import { Play, Users, MapPin, Zap, Server } from 'lucide-react'
import { TypeAnimation } from 'react-type-animation'

/** ensure path begins with "/" for files under /public */
const ensureRooted = (p?: string) => (p ? (p.startsWith('/') ? p : '/' + p) : undefined)

type HeroImageConfig = {
  /** Loading overlay */
  loadingBackground?: string
  loadingVideo?: string
  /** Homepage background */
  mainBackground?: string
  mainVideo?: string
  /** If provided, YouTube iframe will be used instead of <video> */
  youtubeUrl?: string
}

export const Hero = () => {
  /** refs */
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  /** loading overlay state */
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState('Initializing')
  const [currentTip, setCurrentTip] = useState(0)

  /** runtime stats */
  const [playerCount, setPlayerCount] = useState(0)
  const [isServerOnline, setIsServerOnline] = useState(true)

  /** config snapshots */
  const heroCfg = (siteConfig.images?.hero || {}) as HeroImageConfig
  const tips = siteConfig.server?.loadingTips || []

  /** ===== LOADING OVERLAY: tips rotator ===== */
  useEffect(() => {
    if (!isLoading || tips.length === 0) return
    const itv = setInterval(() => setCurrentTip((p) => (p + 1) % tips.length), 3000)
    return () => clearInterval(itv)
  }, [isLoading, tips.length])

  /** ===== LOADING OVERLAY: fake progress + stage text ===== */
  useEffect(() => {
    const t = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(t)
          setTimeout(() => setIsLoading(false), 350)
          return 100
        }
        if (prev < 20) setLoadingStage('Initializing Connection')
        else if (prev < 40) setLoadingStage('Loading Server Data')
        else if (prev < 60) setLoadingStage('Syncing Assets')
        else if (prev < 80) setLoadingStage('Preparing Interface')
        else if (prev < 95) setLoadingStage('Final Checks')
        else setLoadingStage('Ready to Launch')
        const inc = Math.random() * 4 + 1.5
        return Math.min(prev + inc, 100)
      })
    }, 60)
    return () => clearInterval(t)
  }, [])

  /** ===== SERVER STATS ===== */
  useEffect(() => {
  const fetchPlayerData = async () => {
    try {
      const code = siteConfig.api?.serverCode
      if (!code || code === 'replaceme') throw new Error('no code')

      const r = await fetch(`${siteConfig.api.cfxApiUrl}${code}`, {
        headers: { Accept: 'application/json' }
      })
      if (!r.ok) throw new Error('bad status')

      const data = await r.json()
      // จำนวนคนออนไลน์จริง + max slot จาก CFX
      const online = data?.Data?.clients
      const max    = data?.Data?.svMaxclients

      if (typeof online === 'number') setPlayerCount(online)
      if (typeof max === 'number' && siteConfig.server) {
        // ถ้าต้องการอัปเดต max ที่โชว์ให้ตรงด้วย:
        (siteConfig.server as any).maxPlayers = max
      }
      setIsServerOnline(true)
    } catch {
      // fallback แบบสุ่มเล็ก ๆ ถ้าดึงไม่ได้
      setPlayerCount(Math.floor(Math.random() * 50) + 10)
      setIsServerOnline(false)
    }
  }

  fetchPlayerData()
  const iv = setInterval(fetchPlayerData, siteConfig.api?.refreshInterval || 10000)
  return () => clearInterval(iv)
}, [])

  /** ===== GSAP effects ===== */
  useGSAP(() => {
    if (!heroRef.current) return
    const tl = gsap.timeline()
    tl.from(imageRef.current, {
      scale: 1.15,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out'
    })
      .from(
        '.hero-title-word',
        { y: 60, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
        '-=0.6'
      )
      .from(
        '.hero-description',
        { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.3'
      )
      .from(
        '.hero-stats-item',
        { opacity: 0, y: 30, duration: 0.4, stagger: 0.1, ease: 'power3.out' },
        '-=0.3'
      )
      .from(
        '.hero-cta',
        { opacity: 0, y: 30, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
        '-=0.2'
      )

    ScrollTrigger.create({
      trigger: heroRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        if (imageRef.current) {
          gsap.set(imageRef.current, { y: self.progress * 150, scale: 1 + self.progress * 0.1 })
        }
        if (contentRef.current) {
          gsap.set(contentRef.current, { y: self.progress * 60, opacity: 1 - self.progress * 0.6 })
        }
      }
    })
  }, [])

  /** ===== resolved srcs ===== */
  const loadingVideoSrc = ensureRooted(heroCfg.loadingVideo)
  const loadingPoster = ensureRooted(heroCfg.loadingBackground)
  const mainVideoSrc = ensureRooted(heroCfg.mainVideo)
  const mainPoster = ensureRooted(heroCfg.mainBackground)
  const youtubeUrl = heroCfg.youtubeUrl /* external URL – do not root */

  /** ===== LOADING OVERLAY (video preferred) ===== */
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gta-black z-50 overflow-hidden">
        {/* background (video preferred) */}
        <div className="absolute inset-0">
          {loadingVideoSrc ? (
            <video
              className="w-full h-full object-cover pointer-events-none"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              // @ts-ignore (valid attribute in browsers)
              disableRemotePlayback
              poster={
                loadingPoster ||
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
              }
              style={{
                transform: `scale(${1 + loadingProgress * 0.001})`,
                filter: 'brightness(0.30)'
              }}
            >
              <source src={loadingVideoSrc} type="video/mp4" />
            </video>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[20000ms] ease-out"
              style={{
                backgroundImage: `url('${
                  loadingPoster ||
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
                }')`,
                transform: `scale(${1 + loadingProgress * 0.001})`,
                filter: 'brightness(0.30)'
              }}
            />
          )}

          {/* film grain / vignette / scanlines */}
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
            }}
          />
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-gta-black/20 to-gta-black" />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
            }}
          />
        </div>

        {/* foreground content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-16">
          {/* top title */}
          <div className="flex-shrink-0">
            <div className="flex items-start gap-6">
              <div className="flex flex-col gap-2">
                <div
                  className="w-1 bg-accent-blue transition-all duration-500"
                  style={{ height: `${loadingProgress * 2}px` }}
                />
                <div
                  className="w-1 bg-accent-yellow transition-all duration-700"
                  style={{ height: `${loadingProgress * 1.5}px` }}
                />
              </div>
              <div className="min-w-0">
                <h1
                  className="font-display text-5xl lg:text-7xl text-gta-white uppercase mb-3 whitespace-nowrap"
                  style={{ textShadow: '0 0 30px rgba(94, 156, 211, 0.5)' }}
                >
                  <TypeAnimation
                    sequence={[siteConfig.server?.name || 'Los Santos Roleplay', 2000]}
                    wrapper="span"
                    speed={50}
                    cursor={false}
                    style={{ display: 'inline-block', minWidth: '100%' }}
                  />
                </h1>
                <div className="font-heading text-accent-blue uppercase text-lg tracking-widest whitespace-nowrap">
                  <TypeAnimation
                    sequence={[1000, siteConfig.server?.tagline || 'Welcome to the Experience', 1000]}
                    wrapper="span"
                    speed={70}
                    cursor={false}
                    style={{ display: 'inline-block', minWidth: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* center: progress */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-4xl w-full">
              <div className="mb-12">
                <div
                  className="font-display text-[12rem] lg:text-[16rem] text-gta-white leading-none relative inline-block"
                  style={{
                    textShadow: `0 0 60px rgba(94, 156, 211, ${0.4 + (loadingProgress / 100) * 0.3})`
                  }}
                >
                  {Math.floor(loadingProgress)}
                  <span className="text-accent-blue text-8xl lg:text-9xl">%</span>
                </div>
              </div>

              <div className="mb-8">
                <div className="inline-flex items-center gap-4 bg-gta-panel/40 backdrop-blur-md px-8 py-4 border-l-4 border-accent-blue">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-8 bg-accent-blue"
                        style={{
                          animation: 'pulse 1.5s ease-in-out infinite',
                          animationDelay: `${i * 0.15}s`,
                          opacity: 0.3
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-heading text-2xl lg:text-3xl text-gta-white uppercase tracking-wider">
                    {loadingStage}
                  </span>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <div className="relative h-2 bg-gta-panel/50 backdrop-blur-sm overflow-hidden">
                  <div
                    className="absolute -inset-y-2 left-0 blur-xl bg-accent-blue/40 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-blue via-accent-blue-light to-accent-yellow transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }}
                    />
                  </div>
                  {[25, 50, 75].map((m) => (
                    <div
                      key={m}
                      className={`absolute top-0 bottom-0 w-[2px] transition-colors duration-300 ${
                        loadingProgress >= m ? 'bg-accent-yellow' : 'bg-gta-panel-light'
                      }`}
                      style={{ left: `${m}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* bottom: tips */}
          <div className="flex-shrink-0">
            {tips.length > 0 && (
              <div className="max-w-2xl">
                <div className="flex items-start gap-4 bg-gta-panel/30 backdrop-blur-md border-l-4 border-accent-yellow p-6">
                  <Zap className="w-6 h-6 text-accent-yellow flex-shrink-0 mt-1 animate-pulse" />
                  <div className="flex-1">
                    <p className="font-ui text-xs uppercase tracking-wider text-accent-yellow mb-2">
                      Server Tip #{currentTip + 1}
                    </p>
                    <p className="font-body text-base lg:text-lg text-gta-white leading-relaxed">
                      {tips[currentTip]}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* local keyframes */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    )
  }

  /** ===== HOMEPAGE HERO (video or YouTube always on) ===== */
  const joinHref = siteConfig?.api?.directConnect || 'fivem://connect/119.8.186.151:30120'

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-gta-black">
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-start">
        {/* Background source priority: YouTube > MP4 > Image */}
        <div ref={imageRef} className="absolute inset-0 overflow-hidden z-[1]">
  {/* YouTube background */}
  <div className="absolute inset-0">
    <iframe
      className="absolute inset-0 w-full h-full"
      src="https://www.youtube.com/embed/D4HJKgsm3MM?autoplay=1&mute=1&loop=1&playlist=D4HJKgsm3MM&controls=0&modestbranding=1&showinfo=0&rel=0&playsinline=1"
      title="Hero Background"
      frameBorder={0}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      // กันไม่ให้เมาส์ไปโดน iframe
      style={{ pointerEvents: 'none' }}
    />
  </div>

  {/* overlays เพื่อความอ่านง่ายของตัวหนังสือ */}
  <div className="absolute inset-0 bg-gradient-to-r from-gta-black via-gta-black/70 to-transparent" />
  <div className="absolute inset-0 bg-gradient-to-t from-gta-black via-transparent to-gta-black/60" />
  <div className="absolute inset-0 bg-diagonal-stripes opacity-20" />
</div>

        {/* Content */}
        <div className="relative z-10 py-32 w-full px-4 sm:px-6 lg:pl-24">
          <div ref={contentRef} className="max-w-5xl text-left ml-0 mr-auto">
            {/* Top Label */}
            <div className="hero-label mb-8 flex items-center gap-4">
              <div className="h-[2px] w-16 bg-accent-yellow" />
              <div className="bg-accent-yellow px-4 py-2">
                <span className="font-ui text-xs uppercase tracking-wider text-gta-black font-bold">
                  {siteConfig.server?.tagline || 'Welcome Everyone to'}
                </span>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="mb-8">
              {(siteConfig.server?.name || 'Los Santos Roleplay')
                .split(' ')
                .map((word, i, arr) => (
                  <span
                    key={`${word}-${i}`}
                    className="hero-title-word block font-display text-7xl md:text-8xl lg:text-9xl text-gta-white uppercase leading-none mb-2"
                    style={{
                      textShadow:
                        '4px 4px 0 rgba(94, 156, 211, 0.3), 8px 8px 0 rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {i === arr.length - 1 ? <span className="text-accent-blue">{word}</span> : word}
                  </span>
                ))}
            </h1>

            {/* Description */}
            <p className="hero-description font-body text-xl md:text-2xl text-gta-gray-light mb-12 max-w-2xl leading-relaxed">
              {siteConfig.server?.description ||
                'Experience cinematic storytelling in Los Santos. Shape your narrative, build your empire, and become a legend in the most immersive roleplay environment.'}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="hero-stats-item bg-gta-panel/80 backdrop-blur-sm border-l-4 border-accent-blue p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent-blue" />
                  <div>
                    <div className="font-heading text-2xl text-gta-white font-bold">
                      {playerCount}/{siteConfig.server?.maxPlayers || 256}
                    </div>
                    <div className="font-ui text-xs uppercase text-gta-gray-light">Online Now</div>
                  </div>
                </div>
              </div>

              <div className="hero-stats-item bg-gta-panel/80 backdrop-blur-sm border-l-4 border-accent-yellow p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-accent-yellow" />
                  <div>
                    <div className="font-heading text-2xl text-gta-white font-bold">
                      {siteConfig.server?.stats?.totalPlayers || '15,000+'}
                    </div>
                    <div className="font-ui text-xs uppercase text-gta-gray-light">Total Players</div>
                  </div>
                </div>
              </div>

              <div className="hero-stats-item bg-gta-panel/80 backdrop-blur-sm border-l-4 border-accent-green p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-accent-green" />
                  <div>
                    <div className="font-heading text-2xl text-gta-white font-bold">
                      {siteConfig.jobs?.list?.length || 11}
                    </div>
                    <div className="font-ui text-xs uppercase text-gta-gray-light">Active Jobs</div>
                  </div>
                </div>
              </div>

              <div className="hero-stats-item bg-gta-panel/80 backdrop-blur-sm border-l-4 border-accent-blue p-4">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-accent-blue" />
                  <div>
                    <div className="font-heading text-2xl text-gta-white font-bold flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isServerOnline ? 'bg-accent-green' : 'bg-accent-red'
                        } animate-pulse`}
                      />
                      {isServerOnline ? 'UP' : 'DOWN'}
                    </div>
                    <div className="font-ui text-xs uppercase text-gta-gray-light">Server Status</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={joinHref} className="hero-cta btn-gta group">
                <span className="flex items-center gap-3">
                  <Play className="w-5 h-5" />
                  Join Server Now
                </span>
              </a>

              <a
                href={siteConfig.social?.discord || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta btn-gta-outline"
              >
                Join Our Discord
              </a>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 animate-subtle-float">
          <span className="font-ui text-xs uppercase tracking-wider text-accent-blue">
            Scroll to Explore
          </span>
          <div className="w-[2px] h-12 bg-gradient-to-b from-accent-blue to-transparent" />
        </div>
      </div>
    </div>
  )
}
