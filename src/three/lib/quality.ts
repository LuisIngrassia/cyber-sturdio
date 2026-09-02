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
    /**
     * Tope de 1,5 y no de 2.
     *
     * El DPR eleva al cuadrado el trabajo de cada efecto de pantalla: en un
     * monitor de 1440p, un DPR de 2 significa renderizar a 2880p y pasarle por
     * encima oclusión ambiental, bloom con mipmaps y antialiasing. Es la causa
     * más común de que una escena vaya lenta en una máquina buena. De 1,5 a 2
     * la diferencia visible es mínima y el costo casi se duplica.
     */
    dpr: [1, 1.5],
    bloom: true,
    ambientOcclusion: true,
    shadows: true,
    smaa: true,
  },
  medium: {
    dpr: [1, 1.25],
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
 * Perfil forzado por la URL: `?q=low`, `?q=medium`, `?q=high`.
 *
 * Sirve para ver qué recibe un visitante de gama baja sin tener que conseguir
 * el equipo, y para que las pruebas automatizadas puedan pedir el perfil más
 * liviano — renderizando por software, el postprocesado baja la escena a menos
 * de un cuadro por segundo y cualquier verificación de movimiento se vuelve
 * inviable.
 */
function tierFromUrl(): QualityTier | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("q");
  return value === "low" || value === "medium" || value === "high"
    ? value
    : null;
}

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
    const forced = tierFromUrl();
    if (forced) return { tier: forced, ...PROFILES[forced] };

    let tier: QualityTier = "medium";

    if (gpu.tier === 0 || gpu.isMobile === true) {
      tier = gpu.tier >= 2 && gpu.isMobile ? "medium" : "low";
    } else if (gpu.tier >= 3) {
      tier = "high";
    }

    return { tier, ...PROFILES[tier] };
  }, [gpu.tier, gpu.isMobile]);
}
