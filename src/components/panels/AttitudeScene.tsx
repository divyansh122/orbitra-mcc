import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { token } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'

const DEG = Math.PI / 180
const ARM_ANGLES = [45, 135, 225, 315].map((d) => d * DEG)
const ARM_LEN = 0.95

/** Quadcopter whose body follows live roll/pitch (read from the store each frame, no React re-render). */
function Drone() {
  const group = useRef<THREE.Group>(null)
  const rotors = useRef<THREE.Mesh[]>([])
  const colors = useMemo(
    () => ({ cyan: token('cyan'), purple: token('purple'), green: token('green'), red: token('red'), blue: token('blue') }),
    [],
  )

  const bodyEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.16, 0.42)), [])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const { roll = 0, pitch = 0 } = useTelemetry.getState().latest
    const k = 1 - Math.exp(-dt * 7)
    // Nose points to -Z: positive pitch lifts the nose, positive roll dips the right side.
    g.rotation.x += (pitch * DEG - g.rotation.x) * k
    g.rotation.z += (-roll * DEG - g.rotation.z) * k
    for (const r of rotors.current) if (r) r.rotation.y += dt * 38
  })

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.62, 0.16, 0.42]} />
        <meshStandardMaterial color="#0d1a2e" metalness={0.7} roughness={0.35} emissive={colors.blue} emissiveIntensity={0.08} />
      </mesh>
      <lineSegments geometry={bodyEdges}>
        <lineBasicMaterial color={colors.cyan} transparent opacity={0.9} />
      </lineSegments>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={colors.cyan} emissive={colors.cyan} emissiveIntensity={0.5} transparent opacity={0.55} />
      </mesh>
      {/* nose indicator */}
      <mesh position={[0, 0, -0.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 12]} />
        <meshStandardMaterial color={colors.green} emissive={colors.green} emissiveIntensity={1.2} />
      </mesh>
      {ARM_ANGLES.map((a, i) => {
        const x = Math.cos(a) * ARM_LEN
        const z = Math.sin(a) * ARM_LEN
        const front = z < 0
        return (
          <group key={i}>
            <mesh position={[x / 2, 0, z / 2]} rotation={[0, -a, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, ARM_LEN, 8]} />
              <meshStandardMaterial color="#1b2b45" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[x, 0.04, z]}>
              <cylinderGeometry args={[0.07, 0.08, 0.12, 16]} />
              <meshStandardMaterial color="#14223a" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[x, -0.06, z]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshStandardMaterial color={front ? colors.green : colors.red} emissive={front ? colors.green : colors.red} emissiveIntensity={2} />
            </mesh>
            <mesh ref={(m) => void (m && (rotors.current[i] = m))} position={[x, 0.12, z]}>
              <cylinderGeometry args={[0.36, 0.36, 0.008, 32]} />
              <meshBasicMaterial color={i % 2 ? colors.cyan : colors.purple} transparent opacity={0.22} />
            </mesh>
            <mesh position={[x, 0.12, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.36, 0.008, 6, 48]} />
              <meshBasicMaterial color={i % 2 ? colors.cyan : colors.purple} transparent opacity={0.85} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Fixed level references: horizon ring and floor grid. */
function Reference() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(8, 16, token('blue'), token('line'))
    const mat = g.material as THREE.Material
    mat.transparent = true
    mat.opacity = 0.45
    return g
  }, [])
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.15
  })
  return (
    <>
      <primitive object={grid} position={[0, -0.9, 0]} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.006, 6, 96]} />
        <meshBasicMaterial color={token('cyan')} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.72, 1.74, 64, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={token('purple')} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export default function AttitudeScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [1.95, 1.25, 2.35], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
    >
      <fog attach="fog" args={['#080f1a', 4, 9]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <pointLight position={[-2, 1, -2]} intensity={6} color={token('cyan')} />
      <pointLight position={[2, -1, 2]} intensity={4} color={token('purple')} />
      <Drone />
      <Reference />
    </Canvas>
  )
}
