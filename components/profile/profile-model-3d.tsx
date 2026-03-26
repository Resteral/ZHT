"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, PerspectiveCamera, Text3D, Center } from "@react-three/drei"
import { Suspense, useRef } from "react"
import type { Mesh } from "three"

interface ProfileModel3DProps {
  race: string
}

function StarCraftModel({ race }: { race: string }) {
  const meshRef = useRef<Mesh>(null)

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case "protoss":
        return "#00d4ff"
      case "terran":
        return "#ff6b00"
      case "zerg":
        return "#9d4edd"
      default:
        return "#ffffff"
    }
  }

  return (
    <group>
      {/* Main model placeholder - replace with actual StarCraft 2 model */}
      <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, Math.PI * 0.25, 0]}>
        <boxGeometry args={[1.5, 2, 0.8]} />
        <meshStandardMaterial
          color={getRaceColor(race)}
          metalness={0.7}
          roughness={0.3}
          emissive={getRaceColor(race)}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Race emblem/symbol */}
      <Center position={[0, 1.5, 0.5]}>
        <Text3D font="/fonts/Geist_Bold.json" size={0.3} height={0.05} curveSegments={12}>
          {race.toUpperCase()}
          <meshStandardMaterial color={getRaceColor(race)} emissive={getRaceColor(race)} emissiveIntensity={0.2} />
        </Text3D>
      </Center>

      {/* Floating particles effect */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 0.8) * 2, Math.cos(i * 0.5) * 1.5 + 1, Math.cos(i * 0.8) * 2]}>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color={getRaceColor(race)} emissive={getRaceColor(race)} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function ProfileModel3D({ race }: ProfileModel3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas className="w-full h-full">
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 4}
        />

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00d4ff" />

        <Environment preset="night" />

        <Suspense fallback={null}>
          <StarCraftModel race={race} />
        </Suspense>
      </Canvas>
    </div>
  )
}
