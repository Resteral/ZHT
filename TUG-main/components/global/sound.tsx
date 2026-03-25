"use client"

let cachedAudio: HTMLAudioElement | null = null
let audioFailed = false

function synthPlay() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = 0.0001
    const now = ctx.currentTime
    osc.start(now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.stop(now + 0.36)
  } catch (e) {
    // ignore
  }
}

export function playJoinSound() {
  try {
    if (!audioFailed) {
      if (!cachedAudio) {
        const a = new Audio("/sounds/join.mp3")
        a.preload = "auto"
        a.addEventListener("error", () => {
          audioFailed = true
        })
        cachedAudio = a
      }

      // Attempt to play the custom audio. If it fails (autoplay or missing file), fall back to synth.
      const p = cachedAudio.play()
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          audioFailed = true
          synthPlay()
        })
      }
      return
    }
  } catch (e) {
    // fall through to synth
  }

  synthPlay()
}
