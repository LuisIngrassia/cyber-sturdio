import { useDetectGPU } from "@react-three/drei";
import { useMemo } from "react";

/**
 * Tres perfiles de calidad, decididos por la GPU del visitante.
 *
 * Se define acá y no al final del proyecto a propósito: si el postprocesado se
 * da por sentado durante meses, después no hay forma de apagarlo sin que la
 * escena se vea rota. Cada efecto nace sabiendo que puede no estar.
 */
export type QualityTier = "low" | "medium" | "high";

export type QualitySettings = {
  tier: QualityTier;
  /** Rango de DPR para <Canvas>. En móviles no vale la pena pasar de 1,5. */
  dpr: [number, number];
  bloom: boolean;
  /** La oclusión ambiental es lo más caro del pipeline y lo primero que cae. */
  ambientOcclusion: boolean;
  /** Sombras dinámicas. Las de contacto son aparte y mucho más baratas. */
  shadows: boolean;
  /** Antialiasing por postprocesado; en tier bajo se usa el del contexto. */
  smaa: boolean;
};

const PROFILES: Record<QualityTier, Omit<QualitySettings, "tier">> = {
  high: {
    dpr: [1, 2],
    bloom: true,
    ambientOcclusion: true,
    shadows: true,
    smaa: true,
  },
  medium: {
    dpr: [1, 1.5],
    bloom: true,
    ambientOcclusion: false,
    shadows: true,
    smaa: false,
  },
  low: {
    dpr: [1, 1],
    bloom: false,
    ambientOcclusion: false,
    shadows: false,
    smaa: false,
  },
};

/**
 * Perfil de calidad para esta sesión.
 *
 * `useDetectGPU` puntúa la placa de 0 a 3 con una base de datos de benchmarks.
 * Tratamos el móvil como un caso aparte porque una GPU móvil rápida sigue
 * teniendo un presupuesto térmico que una de escritorio no tiene: aunque
 * puntúe alto, la damos por media.
 */
export function useQuality(): QualitySettings {
  const gpu = useDetectGPU();

  return useMemo(() => {
    let tier: QualityTier = "medium";

    if (gpu.tier === 0 || gpu.isMobile === true) {
      tier = gpu.tier >= 2 && gpu.isMobile ? "medium" : "low";
    } else if (gpu.tier >= 3) {
      tier = "high";
    }

    return { tier, ...PROFILES[tier] };
  }, [gpu.tier, gpu.isMobile]);
}
