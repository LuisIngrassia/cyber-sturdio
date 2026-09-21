import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { AnimationClip } from "three";

/**
 * Los clips de animación del avatar, que viven en archivos aparte del modelo.
 *
 * Mixamo exporta una animación por descarga, así que el personaje viene en un
 * archivo y cada movimiento en el suyo, sin malla. Se pueden aplicar a
 * cualquiera de los dos porque comparten el mismo esqueleto: los 65 huesos
 * `mixamorig:` tienen los mismos nombres, y el mezclador de three resuelve cada
 * pista buscando el nodo por nombre dentro del objeto raíz.
 *
 * Separarlos así conviene además por peso: el personaje con sus texturas es lo
 * pesado, y cada animación suma unas pocas decenas de KB. Sumar un movimiento
 * nuevo no vuelve a bajar la malla.
 *
 * **Al bajar uno nuevo de Mixamo:** formato FBX binario, 30 fps, sin reducción
 * de fotogramas, *Without Skin*, y **In Place** en todo lo que sea locomoción —
 * sin eso el clip trae el desplazamiento incorporado y el personaje se va
 * caminando solo, porque la posición ya la maneja `playerState`.
 */

/** Los nombres con los que el resto del código pide cada movimiento. */
export type ClipName = "idle" | "walk" | "typing" | "standToSit";

const CLIP_FILES: Record<ClipName, string> = {
  idle: "/models/anim/idle.glb",
  walk: "/models/anim/walking.glb",
  typing: "/models/anim/typing.glb",
  standToSit: "/models/anim/stand-to-sit.glb",
};

for (const url of Object.values(CLIP_FILES)) useGLTF.preload(url);

/**
 * Carga los clips y les pone nombre.
 *
 * Mixamo llama a todas sus animaciones `mixamo.com`, así que los cuatro
 * archivos traen clips homónimos: sin renombrarlos, el mezclador no puede
 * distinguir cuál es cuál. Se clonan en vez de renombrar en el lugar porque
 * `useGLTF` cachea y devuelve siempre la misma instancia — escribirle encima
 * afectaría a cualquier otro componente que cargue el mismo archivo, y además
 * es mutar el valor que devolvió un hook.
 */
export function useAvatarClips(): AnimationClip[] {
  const idle = useGLTF(CLIP_FILES.idle).animations;
  const walk = useGLTF(CLIP_FILES.walk).animations;
  const typing = useGLTF(CLIP_FILES.typing).animations;
  const standToSit = useGLTF(CLIP_FILES.standToSit).animations;

  return useMemo(() => {
    const named: Array<[ClipName, AnimationClip[]]> = [
      ["idle", idle],
      ["walk", walk],
      ["typing", typing],
      ["standToSit", standToSit],
    ];

    return named.flatMap(([name, clips]) => {
      const first = clips[0];
      if (!first) return [];
      const copy = first.clone();
      copy.name = name;
      return [copy];
    });
  }, [idle, walk, typing, standToSit]);
}
