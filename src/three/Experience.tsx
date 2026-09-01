import {
  AdaptiveDpr,
  Bvh,
  OrbitControls,
  PerformanceMonitor,
  Preload,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import * as THREE from "three";

import { Effects } from "./Effects";
import { Atmosphere } from "./lib/Atmosphere";
import { useQuality } from "./lib/quality";
import { GreyboxScene } from "./world/GreyboxScene";

/**
 * El canvas y todo lo que vive adentro.
 *
 * Nada de interfaz de usuario entra acá: los modales y formularios son DOM
 * real, montados aparte en UILayer y comunicados por el store. Ver
 * src/state/store.ts.
 */
export function Experience() {
  const quality = useQuality();
  // El monitor de performance baja el DPR si el framerate cae. Empieza en el
  // techo del perfil y se ajusta solo.
  const [dpr, setDpr] = useState(quality.dpr[1]);

  return (
    <Canvas
      dpr={dpr}
      shadows={quality.shadows}
      gl={{
        // El antialiasing del contexto solo cuando SMAA no corre; tenerlos a
        // los dos es pagar dos veces por lo mismo.
        antialias: !quality.smaa,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ position: [0, 3.5, 11], fov: 42, near: 0.1, far: 100 }}
    >
      {/* El vacío negro y la niebla que funde los bordes. */}
      <Atmosphere />

      <PerformanceMonitor
        onDecline={() => setDpr(quality.dpr[0])}
        onIncline={() => setDpr(quality.dpr[1])}
      />

      {/**
       * Bvh acelera el raycasting. Con un puñado de cajas da igual, pero el
       * click-to-walk de la Fase 2 lanza un rayo por movimiento del mouse
       * contra toda la escena, y ahí sin esto se nota.
       */}
      <Bvh firstHitOnly>
        <Suspense fallback={null}>
          <GreyboxScene />
          <Preload all />
        </Suspense>
      </Bvh>

      <Effects />

      {/**
       * Controles de órbita provisorios, para poder inspeccionar la escena
       * mientras se tunea. En la Fase 1 se reemplazan por una órbita con
       * límites, y en la Fase 2 por el CameraRig que sigue al avatar.
       */}
      <OrbitControls
        makeDefault
        target={[0, 1.5, -1]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={20}
      />

      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
