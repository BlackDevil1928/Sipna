import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import HorizonHero from '../components/landing/HorizonHero'
import {
    Droplets, Shield, Zap, Phone, MonitorSmartphone,
    Camera, Brain, PhoneCall, ArrowRight,
    Waves, Globe2, Factory, Building2, Wifi,
    BarChart3, Eye, MapPin
} from 'lucide-react'

// ── Animation Helpers ────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, direction = 'up', className = '' }: {
    children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right'; className?: string
}) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-50px' })

    const dirMap = { up: [40, 0], down: [-40, 0], left: [0, 40], right: [0, -40] }
    const [y, x] = dirMap[direction] || [40, 0]

    return (
        <motion.div
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: direction === 'up' || direction === 'down' ? y : 0, x: direction === 'left' || direction === 'right' ? x : 0 }}
            animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {children}
        </motion.div>
    )
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })
    const controls = useAnimation()

    useEffect(() => {
        if (!isInView || !ref.current) return
        let start = 0
        const duration = 2000
        const step = (timestamp: number) => {
            if (!start) start = timestamp
            const progress = Math.min((timestamp - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            if (ref.current) (ref.current as HTMLElement).textContent = `${prefix}${Math.floor(eased * target)}${suffix}`
            if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [isInView, target, suffix, prefix])

    return <span ref={ref}>0</span>
}



// ═════════════════════════════════════════════════════════════════════════════
// 2️⃣  PROBLEM SECTION
// ═════════════════════════════════════════════════════════════════════════════
function ProblemSection() {
    return (
        <section className="relative py-24 px-6 bg-[#040810]" id="problem">
            <div className="max-w-6xl mx-auto">
                <FadeIn>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">
                            Water Pollution Monitoring Is{' '}
                            <span className="text-red-400">Broken</span>
                        </h2>
                        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
                            Current systems are expensive, complex, and reactive. We need proactive intelligence.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Traditional */}
                    <FadeIn delay={0.1} direction="left">
                        <div className="relative p-8 rounded-2xl border border-red-500/10 bg-gradient-to-b from-red-500/5 to-transparent">
                            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500/10 rounded-full text-red-400 text-xs font-semibold">OLD WAY</div>
                            <h3 className="text-xl font-bold text-slate-300 mb-6">Traditional Systems</h3>
                            <ul className="space-y-4">
                                {[
                                    { icon: '💰', text: '$5,000–$20,000 per sensor' },
                                    { icon: '🔧', text: 'Complex installation & maintenance' },
                                    { icon: '👁️', text: 'Manual monitoring required' },
                                    { icon: '⏰', text: 'Delayed response times' },
                                    { icon: '📊', text: 'Limited coverage area' },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-400">
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </FadeIn>

                    {/* AquaGuardian */}
                    <FadeIn delay={0.2} direction="right">
                        <div className="relative p-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent shadow-lg shadow-cyan-500/5">
                            <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-500/10 rounded-full text-cyan-400 text-xs font-semibold">AQUAGUARDIAN</div>
                            <h3 className="text-xl font-bold text-white mb-6">Our Solution</h3>
                            <ul className="space-y-4">
                                {[
                                    { icon: '📱', text: 'Uses existing cameras & phones' },
                                    { icon: '🤖', text: 'AI automated detection' },
                                    { icon: '🔔', text: 'Real-time voice alerts' },
                                    { icon: '⚡', text: 'Sub-second detection time' },
                                    { icon: '🌍', text: 'Scalable to any water body' },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-300">
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 3️⃣  HOW IT WORKS
// ═════════════════════════════════════════════════════════════════════════════
function HowItWorks() {
    const steps = [
        { icon: Camera, title: 'Camera Watches Water', desc: 'Any mobile phone or CCTV camera pointed at a water source begins streaming video frames.', color: 'from-blue-500 to-cyan-400' },
        { icon: Brain, title: 'AI Detects Contamination', desc: 'Our trained ResNet CNN model classifies water quality in real-time: clean, moderate, or severe.', color: 'from-cyan-400 to-emerald-400' },
        { icon: PhoneCall, title: 'System Alerts Authorities', desc: 'When contamination is critical, AquaGuardian triggers autonomous voice calls via Vapi + Twilio.', color: 'from-emerald-400 to-yellow-400' },
    ]

    return (
        <section className="relative py-24 px-6 bg-[#060a14]" id="how-it-works">
            <div className="max-w-6xl mx-auto">
                <FadeIn>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
                        <p className="mt-4 text-slate-400">Three simple steps. Zero manual intervention.</p>
                    </div>
                </FadeIn>

                <div className="relative grid md:grid-cols-3 gap-8">
                    {/* Connecting line */}
                    <div className="hidden md:block absolute top-24 left-[16.5%] right-[16.5%] h-0.5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                            style={{ transformOrigin: 'left' }}
                        />
                    </div>

                    {steps.map((step, i) => (
                        <FadeIn key={i} delay={i * 0.2}>
                            <div className="relative text-center">
                                <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mb-6`}>
                                    <div className="w-full h-full rounded-2xl bg-[#0a1020] flex items-center justify-center">
                                        <step.icon size={32} className="text-white" />
                                    </div>
                                </div>
                                <div className="absolute -top-2 -right-2 md:right-auto md:left-1/2 md:ml-8 md:-top-1 w-8 h-8 rounded-full bg-cyan-500 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    {i + 1}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 4️⃣  FEATURES GRID
// ═════════════════════════════════════════════════════════════════════════════
function FeaturesGrid() {
    const features = [
        { icon: MonitorSmartphone, title: 'Mobile Phone as Sensor', desc: 'Turn any smartphone into an edge AI monitoring node. No special hardware needed.', gradient: 'from-blue-500 to-cyan-400' },
        { icon: Eye, title: 'AI Contamination Heatmap', desc: 'Real-time visual overlay showing contamination zones with severity scoring.', gradient: 'from-purple-500 to-pink-400' },
        { icon: Phone, title: 'Autonomous Voice Calling', desc: 'Critical alerts automatically trigger phone calls to authorities via Vapi + Twilio.', gradient: 'from-orange-500 to-red-400' },
        { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Live KPI monitoring with trend charts, compliance scores, and alert management.', gradient: 'from-emerald-500 to-teal-400' },
        { icon: MapPin, title: 'Multi-Site Monitoring', desc: 'Monitor multiple water bodies simultaneously from a single unified dashboard.', gradient: 'from-indigo-500 to-purple-400' },
        { icon: Wifi, title: 'Edge AI Processing', desc: 'Works without internet. All inference happens locally on the device using PyTorch.', gradient: 'from-yellow-500 to-orange-400' },
    ]

    return (
        <section className="relative py-24 px-6 bg-[#040810]" id="features">
            <div className="max-w-6xl mx-auto">
                <FadeIn>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">Key Features</h2>
                        <p className="mt-4 text-slate-400">Industrial-grade capabilities. Consumer-grade simplicity.</p>
                    </div>
                </FadeIn>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feat, i) => (
                        <FadeIn key={i} delay={i * 0.1}>
                            <motion.div
                                className="group relative p-6 rounded-2xl border border-white/5 bg-[#0a1020]/50 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-500"
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            >
                                {/* Glow on hover */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.gradient} p-0.5 mb-4`}>
                                        <div className="w-full h-full rounded-xl bg-[#0a1020] flex items-center justify-center">
                                            <feat.icon size={22} className="text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                                </div>
                            </motion.div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 5️⃣  IMPACT METRICS
// ═════════════════════════════════════════════════════════════════════════════
function ImpactMetrics() {
    const metrics = [
        { value: 95, suffix: '%', label: 'Cost Reduction', desc: 'vs. traditional sensor systems' },
        { value: 1, prefix: '<', suffix: 's', label: 'Detection Time', desc: 'Real-time contamination detection' },
        { value: 24, suffix: '/7', label: 'Autonomous Monitoring', desc: 'Zero manual supervision needed' },
        { value: 100, suffix: '%', label: 'Automated Response', desc: 'Auto-calls. Auto-alerts. Auto-logs.' },
    ]

    return (
        <section className="relative py-24 px-6 bg-[#060a14]">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-transparent to-blue-500/3" />
            <div className="max-w-6xl mx-auto relative z-10">
                <FadeIn>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">Live Impact</h2>
                        <p className="mt-4 text-slate-400">Measurable environmental protection, deployed today.</p>
                    </div>
                </FadeIn>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {metrics.map((m, i) => (
                        <FadeIn key={i} delay={i * 0.1}>
                            <div className="text-center p-6 rounded-2xl border border-white/5 bg-[#0a1020]/30">
                                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                                    <AnimatedCounter target={m.value} suffix={m.suffix} prefix={m.prefix} />
                                </div>
                                <div className="text-white font-semibold mb-1">{m.label}</div>
                                <div className="text-slate-500 text-sm">{m.desc}</div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 6️⃣  SDG SECTION
// ═════════════════════════════════════════════════════════════════════════════
function SDGSection() {
    return (
        <section className="relative py-24 px-6 bg-[#040810]">
            <div className="max-w-5xl mx-auto">
                <FadeIn>
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm mb-4">
                            <Globe2 size={14} />
                            <span>Social Impact</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">
                            Aligned with UN Sustainable Development Goals
                        </h2>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    <FadeIn delay={0.1}>
                        <div className="p-8 rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-transparent text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Waves size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">SDG 6</h3>
                            <p className="text-blue-300 font-semibold mb-2">Clean Water & Sanitation</p>
                            <p className="text-slate-400 text-sm">Ensuring availability and sustainable management of water and sanitation for all.</p>
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.2}>
                        <div className="p-8 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-transparent text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Factory size={32} className="text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">SDG 9</h3>
                            <p className="text-amber-300 font-semibold mb-2">Industry, Innovation & Infrastructure</p>
                            <p className="text-slate-400 text-sm">Building resilient infrastructure and fostering sustainable industrialization.</p>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 7️⃣  CTA SECTION
// ═════════════════════════════════════════════════════════════════════════════
function CTASection() {
    const navigate = useNavigate()

    return (
        <section className="relative py-32 px-6 bg-[#060a14] overflow-hidden">
            {/* Glowing backdrop */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto text-center">
                <FadeIn>
                    <h2 className="text-3xl sm:text-5xl font-bold text-white">
                        See AquaGuardian{' '}
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">In Action</span>
                    </h2>
                </FadeIn>
                <FadeIn delay={0.15}>
                    <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
                        Experience the live monitoring dashboard. Connect your phone camera and
                        watch AI analyze water quality in real-time.
                    </p>
                </FadeIn>
                <FadeIn delay={0.3}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-10 group px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.03] flex items-center gap-3 mx-auto"
                    >
                        Launch Monitoring Dashboard
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </FadeIn>
            </div>
        </section>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 8️⃣  FOOTER
// ═════════════════════════════════════════════════════════════════════════════
function FooterSection() {
    return (
        <footer className="py-12 px-6 bg-[#020408] border-t border-white/5">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8 items-center">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Droplets size={22} className="text-cyan-400" />
                            <span className="text-lg font-bold text-white">AquaGuardian AI</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            AI-powered environmental monitoring for a cleaner tomorrow.
                        </p>
                    </div>

                    {/* Tech Stack */}
                    <div className="text-center">
                        <p className="text-xs text-slate-600 mb-2">BUILT WITH</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['React', 'FastAPI', 'PyTorch', 'Vapi', 'Twilio', 'PostgreSQL'].map(tech => (
                                <span key={tech} className="px-2 py-1 text-xs bg-white/5 rounded text-slate-400">{tech}</span>
                            ))}
                        </div>
                    </div>

                    {/* Team */}
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
                            <Building2 size={14} className="text-cyan-400" />
                            <span className="text-xs text-cyan-400 font-semibold">SIPNA COEL — Hackathon 2025</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            contact@aquaguardian.ai
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-600">
                        © {new Date().getFullYear()} AquaGuardian AI. Protecting water bodies with artificial intelligence.
                    </p>
                </div>
            </div>
        </footer>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// 🏠  MAIN LANDING PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
    return (
        <div className="bg-[#020617] text-white antialiased scroll-smooth">
            {/* 3D Hero — takes 300vh, canvas is fixed behind */}
            <HorizonHero />

            {/* All content below the hero must sit ABOVE the fixed canvas.
                relative + z-50 ensures proper stacking; opaque bg covers canvas. */}
            <div className="relative z-50 bg-[#020617]">
                <ProblemSection />
                <HowItWorks />
                <FeaturesGrid />
                <ImpactMetrics />
                <SDGSection />
                <CTASection />
                <FooterSection />
            </div>
        </div>
    )
}

