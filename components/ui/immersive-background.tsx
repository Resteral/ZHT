"use client"

import React, { useEffect, useRef } from "react"

export const ImmersiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId: number
        let width = window.innerWidth
        let height = window.innerHeight

        const particles: Particle[] = []
        const particleCount = 50

        class Particle {
            x: number
            y: number
            radius: number
            vx: number
            vy: number
            color: string

            constructor() {
                this.x = Math.random() * width
                this.y = Math.random() * height
                this.radius = Math.random() * 2 + 1
                this.vx = (Math.random() - 0.5) * 0.5
                this.vy = (Math.random() - 0.5) * 0.5
                this.color = Math.random() > 0.5 ? "rgba(59, 130, 246, 0.2)" : "rgba(139, 92, 246, 0.2)"
            }

            update() {
                this.x += this.vx
                this.y += this.vy

                if (this.x < 0 || this.x > width) this.vx *= -1
                if (this.y < 0 || this.y > height) this.vy *= -1
            }

            draw() {
                if (!ctx) return
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
            }
        }

        const init = () => {
            particles.length = 0
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle())
            }
        }

        const handleResize = () => {
            width = window.innerWidth
            height = window.innerHeight
            canvas.width = width
            canvas.height = height
            init()
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)
            
            // Subtle gradient overlay
            const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width)
            gradient.addColorStop(0, "rgba(10, 10, 20, 0)")
            gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)")
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            particles.forEach(p => {
                p.update()
                p.draw()
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        animate()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 pointer-events-none bg-[#050510]"
        />
    )
}
