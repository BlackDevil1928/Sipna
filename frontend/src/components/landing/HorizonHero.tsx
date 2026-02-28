import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import './HorizonHero.css'

gsap.registerPlugin(ScrollTrigger)

interface ThreeRefs {
    scene: THREE.Scene | null
    camera: THREE.PerspectiveCamera | null
    renderer: THREE.WebGLRenderer | null
    composer: EffectComposer | null
    stars: THREE.Points[]
    nebula: THREE.Mesh | null
    mountains: THREE.Mesh[]
    animationId: number | null
    targetCameraX?: number
    targetCameraY?: number
    targetCameraZ?: number
    locations?: number[]
}

export default function HorizonHero() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLDivElement>(null)
    const scrollProgressRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 })

    const [scrollProgress, setScrollProgress] = useState(0)
    const [currentSection, setCurrentSection] = useState(0)
    const [isReady, setIsReady] = useState(false)
    const [heroVisible, setHeroVisible] = useState(true)
    // Opacity for the FIRST section's fixed title (fades as you scroll into section 2)
    const [firstTitleOpacity, setFirstTitleOpacity] = useState(1)
    // Which scroll section is active (for showing/hiding section text)
    const [activeSectionIndex, setActiveSectionIndex] = useState(-1)
    const totalSections = 2

    const threeRefs = useRef<ThreeRefs>({
        scene: null,
        camera: null,
        renderer: null,
        composer: null,
        stars: [],
        nebula: null,
        mountains: [],
        animationId: null,
    })

    // ── Three.js Initialization ──────────────────────────────────────
    useEffect(() => {
        if (!canvasRef.current) return

        const refs = threeRefs.current

        refs.scene = new THREE.Scene()
        refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025)

        refs.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
        refs.camera.position.set(0, 20, 100)

        refs.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true })
        refs.renderer.setSize(window.innerWidth, window.innerHeight)
        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        refs.renderer.toneMapping = THREE.ACESFilmicToneMapping
        refs.renderer.toneMappingExposure = 0.5

        // Post-processing — lower bloom to prevent text washout
        refs.composer = new EffectComposer(refs.renderer)
        refs.composer.addPass(new RenderPass(refs.scene, refs.camera))
        refs.composer.addPass(
            new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.4,   // strength (was 0.8 — halved to stop bright washout)
                0.3,   // radius
                0.9    // threshold (higher = less glow on dim objects)
            )
        )

        // ── Star field (3 layers × 5000 stars) ───────────────────────
        for (let layer = 0; layer < 3; layer++) {
            const count = 5000
            const positions = new Float32Array(count * 3)
            const colors = new Float32Array(count * 3)
            const sizes = new Float32Array(count)

            for (let j = 0; j < count; j++) {
                const radius = 200 + Math.random() * 800
                const theta = Math.random() * Math.PI * 2
                const phi = Math.acos(Math.random() * 2 - 1)

                positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta)
                positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
                positions[j * 3 + 2] = radius * Math.cos(phi)

                const c = new THREE.Color()
                const r = Math.random()
                if (r < 0.7) c.setHSL(0, 0, 0.8 + Math.random() * 0.2)
                else if (r < 0.9) c.setHSL(0.08, 0.5, 0.8)
                else c.setHSL(0.6, 0.5, 0.8)

                colors[j * 3] = c.r
                colors[j * 3 + 1] = c.g
                colors[j * 3 + 2] = c.b
                sizes[j] = Math.random() * 2 + 0.5
            }

            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

            const mat = new THREE.ShaderMaterial({
                uniforms: { time: { value: 0 }, depth: { value: layer } },
                vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          uniform float depth;
          void main() {
            vColor = color;
            vec3 pos = position;
            float angle = time * 0.05 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            pos.xy = rot * pos.xy;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
                fragmentShader: `
          varying vec3 vColor;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, opacity);
          }
        `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })

            const stars = new THREE.Points(geo, mat)
            refs.scene.add(stars)
            refs.stars.push(stars)
        }

        // ── Nebula (toned down opacity) ──────────────────────────────
        const nebulaGeo = new THREE.PlaneGeometry(8000, 4000, 100, 100)
        const nebulaMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x0033ff) },
                color2: { value: new THREE.Color(0xff0066) },
                opacity: { value: 0.15 },  // was 0.3 — halved to reduce brightness
            },
            vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
          pos.z += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
            fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
          float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          alpha *= 1.0 + vElevation * 0.01;
          gl_FragColor = vec4(color, alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
        const nebula = new THREE.Mesh(nebulaGeo, nebulaMat)
        nebula.position.z = -1050
        refs.scene.add(nebula)
        refs.nebula = nebula

        // ── Mountains (4 parallax layers) ────────────────────────────
        const layers = [
            { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
            { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
            { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
            { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 },
        ]

        layers.forEach((layer) => {
            const points: THREE.Vector2[] = []
            const segments = 50
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments - 0.5) * 1000
                const y =
                    Math.sin(i * 0.1) * layer.height +
                    Math.sin(i * 0.05) * layer.height * 0.5 +
                    Math.random() * layer.height * 0.2 -
                    100
                points.push(new THREE.Vector2(x, y))
            }
            points.push(new THREE.Vector2(5000, -300))
            points.push(new THREE.Vector2(-5000, -300))

            const shape = new THREE.Shape(points)
            const geo = new THREE.ShapeGeometry(shape)
            const mat = new THREE.MeshBasicMaterial({
                color: layer.color,
                transparent: true,
                opacity: layer.opacity,
                side: THREE.DoubleSide,
            })

            const mountain = new THREE.Mesh(geo, mat)
            mountain.position.z = layer.distance
            mountain.position.y = layer.distance
            mountain.userData = { baseZ: layer.distance }
            refs.scene!.add(mountain)
            refs.mountains.push(mountain)
        })

        refs.locations = refs.mountains.map((m) => m.position.z)

        // ── Atmosphere (toned down) ──────────────────────────────────
        const atmosphereGeo = new THREE.SphereGeometry(600, 32, 32)
        const atmosphereMat = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
          float pulse = sin(time * 2.0) * 0.05 + 0.95;
          atmosphere *= pulse;
          gl_FragColor = vec4(atmosphere, intensity * 0.15);
        }
      `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
        })
        refs.scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat))

        // ── Animation Loop ───────────────────────────────────────────
        const animate = () => {
            refs.animationId = requestAnimationFrame(animate)
            const time = Date.now() * 0.001

            refs.stars.forEach((s) => {
                if ((s.material as THREE.ShaderMaterial).uniforms) {
                    ; (s.material as THREE.ShaderMaterial).uniforms.time.value = time
                }
            })

            if (refs.nebula) {
                ; (refs.nebula.material as THREE.ShaderMaterial).uniforms.time.value = time * 0.5
            }

            if (refs.camera && refs.targetCameraX !== undefined) {
                const sf = 0.05
                smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * sf
                smoothCameraPos.current.y += (refs.targetCameraY! - smoothCameraPos.current.y) * sf
                smoothCameraPos.current.z += (refs.targetCameraZ! - smoothCameraPos.current.z) * sf

                const floatX = Math.sin(time * 0.1) * 2
                const floatY = Math.cos(time * 0.15) * 1

                refs.camera.position.x = smoothCameraPos.current.x + floatX
                refs.camera.position.y = smoothCameraPos.current.y + floatY
                refs.camera.position.z = smoothCameraPos.current.z
                refs.camera.lookAt(0, 10, -600)
            }

            refs.mountains.forEach((mountain, i) => {
                const pf = 1 + i * 0.5
                mountain.position.x = Math.sin(time * 0.1) * 2 * pf
            })

            refs.composer?.render()
        }

        animate()
        setIsReady(true)

        const handleResize = () => {
            if (!refs.camera || !refs.renderer || !refs.composer) return
            refs.camera.aspect = window.innerWidth / window.innerHeight
            refs.camera.updateProjectionMatrix()
            refs.renderer.setSize(window.innerWidth, window.innerHeight)
            refs.composer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', handleResize)

        return () => {
            if (refs.animationId) cancelAnimationFrame(refs.animationId)
            window.removeEventListener('resize', handleResize)
            refs.stars.forEach((s) => { s.geometry.dispose(); (s.material as THREE.Material).dispose() })
            refs.mountains.forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose() })
            if (refs.nebula) { refs.nebula.geometry.dispose(); (refs.nebula.material as THREE.Material).dispose() }
            refs.renderer?.dispose()
        }
    }, [])

    // ── GSAP entrance animations ─────────────────────────────────────
    useEffect(() => {
        if (!isReady) return

        gsap.set([menuRef.current, titleRef.current, subtitleRef.current, scrollProgressRef.current], {
            visibility: 'visible',
        })

        const tl = gsap.timeline()

        if (menuRef.current) {
            tl.from(menuRef.current, { x: -100, opacity: 0, duration: 1, ease: 'power3.out' })
        }

        if (titleRef.current) {
            const chars = titleRef.current.querySelectorAll('.title-char')
            tl.from(chars, { y: 200, opacity: 0, duration: 1.5, stagger: 0.05, ease: 'power4.out' }, '-=0.5')
        }

        if (subtitleRef.current) {
            const lines = subtitleRef.current.querySelectorAll('.subtitle-line')
            tl.from(lines, { y: 50, opacity: 0, duration: 1, stagger: 0.2, ease: 'power3.out' }, '-=0.8')
        }

        if (scrollProgressRef.current) {
            tl.from(scrollProgressRef.current, { opacity: 0, y: 50, duration: 1, ease: 'power2.out' }, '-=0.5')
        }

        return () => { tl.kill() }
    }, [isReady])

    // ── Scroll handling ──────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return

            const container = containerRef.current
            const containerRect = container.getBoundingClientRect()
            const containerBottom = containerRect.bottom

            // Hide all fixed elements once hero scrolls out of view
            const isInHero = containerBottom > 0
            setHeroVisible(isInHero)
            if (!isInHero) return

            const scrollY = window.scrollY
            const containerHeight = container.offsetHeight
            const maxScroll = containerHeight - window.innerHeight
            const progress = Math.min(scrollY / maxScroll, 1)

            setScrollProgress(progress)

            // Calculate which section we're in (0 = first/AQUAGUARDIAN, 1 = second/COSMOS, 2 = third/INFINITY)
            const sectionHeight = maxScroll / totalSections
            const rawSection = scrollY / sectionHeight
            const newSection = Math.min(Math.floor(rawSection), totalSections - 1)
            setCurrentSection(newSection)

            // Fade out the fixed "AQUAGUARDIAN" title as user scrolls into section 1
            // Starts fading at 20% of first section, fully gone by 80%
            const fadeStart = 0.2
            const fadeEnd = 0.8
            const firstSectionProgress = Math.min(scrollY / sectionHeight, 1)
            if (firstSectionProgress < fadeStart) {
                setFirstTitleOpacity(1)
            } else if (firstSectionProgress > fadeEnd) {
                setFirstTitleOpacity(0)
            } else {
                setFirstTitleOpacity(1 - (firstSectionProgress - fadeStart) / (fadeEnd - fadeStart))
            }

            // Set active scroll section index (0 = COSMOS, 1 = INFINITY)
            // Each section fades in/out based on proximity
            if (rawSection < 0.5) {
                setActiveSectionIndex(-1) // Still on first section, no scroll text
            } else {
                setActiveSectionIndex(Math.floor(rawSection - 0.5))
            }

            // Camera positions
            const refs = threeRefs.current
            const totalProgress = progress * totalSections
            const sectionProgress = totalProgress % 1

            const cameraPositions = [
                { x: 0, y: 30, z: 300 },
                { x: 0, y: 40, z: -50 },
                { x: 0, y: 50, z: -700 },
            ]

            const currentPos = cameraPositions[newSection] || cameraPositions[0]
            const nextPos = cameraPositions[newSection + 1] || currentPos

            refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sectionProgress
            refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sectionProgress
            refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sectionProgress

            refs.mountains.forEach((mountain, i) => {
                if (progress > 0.7) {
                    mountain.position.z = 600000
                } else if (refs.locations) {
                    mountain.position.z = refs.locations[i]
                }
            })

            if (refs.nebula && refs.mountains[3]) {
                refs.nebula.position.z = refs.mountains[3].position.z
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [totalSections])

    const splitTitle = useCallback((text: string) => {
        return text.split('').map((char, i) => (
            <span key={i} className="title-char">{char}</span>
        ))
    }, [])

    const sectionData = [
        {
            title: 'DETECT',
            line1: 'AI vision that identifies contamination',
            line2: 'in real-time from any camera feed'
        },
        {
            title: 'PROTECT',
            line1: 'Autonomous alerts to authorities',
            line2: 'before pollution can spread'
        },
    ]

    // Visibility for all fixed elements (canvas, menu, progress)
    const fixedVis: React.CSSProperties = {
        opacity: heroVisible ? 1 : 0,
        pointerEvents: heroVisible ? 'auto' : 'none',
    }

    return (
        <div ref={containerRef} className="hero-container cosmos-style">
            {/* WebGL canvas */}
            <canvas ref={canvasRef} className="hero-canvas" style={fixedVis} />

            {/* Side menu */}
            <div ref={menuRef} className="side-menu" style={{ visibility: 'hidden', ...fixedVis }}>
                <div className="menu-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div className="vertical-text">AQUA</div>
            </div>

            {/* Fixed title — "AQUAGUARDIAN" — fades out as you scroll into section 2 */}
            <div
                className="hero-content cosmos-content"
                style={{ ...fixedVis, opacity: heroVisible ? firstTitleOpacity : 0 }}
            >
                <h1 ref={titleRef} className="hero-title">
                    {splitTitle('AQUAGUARDIAN')}
                </h1>
                <div ref={subtitleRef} className="hero-subtitle cosmos-subtitle">
                    <p className="subtitle-line">AI That Sees Water Pollution</p>
                    <p className="subtitle-line">Before It Spreads.</p>
                </div>
            </div>

            {/* Scroll progress */}
            <div ref={scrollProgressRef} className="scroll-progress" style={{ visibility: 'hidden', ...fixedVis }}>
                <div className="scroll-text">SCROLL</div>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
                </div>
                <div className="section-counter">
                    {String(currentSection).padStart(2, '0')} / {String(totalSections).padStart(2, '0')}
                </div>
            </div>

            {/* Scroll sections — each only visible when it's the active section */}
            <div className="scroll-sections">
                {sectionData.map((sec, i) => {
                    const isActive = activeSectionIndex === i
                    return (
                        <section
                            key={i}
                            className="content-section"
                            style={{
                                opacity: isActive ? 1 : 0,
                                transition: 'opacity 0.6s ease',
                            }}
                        >
                            <h1 className="hero-title">{sec.title}</h1>
                            <div className="hero-subtitle cosmos-subtitle">
                                <p className="subtitle-line">{sec.line1}</p>
                                <p className="subtitle-line">{sec.line2}</p>
                            </div>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}
