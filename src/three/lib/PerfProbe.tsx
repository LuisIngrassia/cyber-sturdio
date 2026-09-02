import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Publica las estadísticas del renderer en `window.__perf`, solo en desarrollo.
 *
 * Los fotogramas por segundo dependen de la máquina, así que no sirven para
 * comparar entre equipos ni para verificar una optimización desde una prueba
 * automatizada. Las llamadas de dibujo, los triángulos y —sobre todo— la
 * cantidad de luces sí son independientes del hardware: si bajan, el trabajo
 * por frame bajó en cualquier máquina.
 */
export function PerfProbe() {
  const scene = useThree((state) => state.scene);
  const frames = useRef(0);

  /**
   * `autoReset = false` es lo que hace que el número sirva.
   *
   * Por defecto three pone el contador en cero al empezar cada render, y este
   * componente corre *antes* de ese render: leído tal cual, siempre devuelve
   * lo que quedó del último pase del postprocesado — un draw call, un
   * triángulo. Acumulando y dividiendo por los frames contados sale el
   * promedio real por cuadro.
   */
  useFrame((state) => {
    // El renderer se toma del estado del frame y no de `useThree`: escribir
    // sobre lo que devolvió un hook rompe las reglas del compilador de React.
    const gl = state.gl;
    if (gl.info.autoReset) gl.info.autoReset = false;

    frames.current++;
    let lights = 0;
    let meshes = 0;
    scene.traverse((node) => {
      if ((node as { isLight?: boolean }).isLight) lights++;
      if ((node as { isMesh?: boolean }).isMesh) meshes++;
    });

    const n = Math.max(1, frames.current);
    (window as unknown as Record<string, unknown>).__perf = {
      callsPorFrame: Math.round(gl.info.render.calls / n),
      trianglesPorFrame: Math.round((gl.info.render.triangles ?? 0) / n),
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      lights,
      meshes,
    };
  });

  return null;
}
