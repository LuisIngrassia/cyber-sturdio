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
 */

/** Los nombres con los que el resto del código pide cada movimiento. */
export type ClipName = "idle" | "walk" | "typing" | "standToSit";

/**
 * Los archivos que existen. `idle` no está: se sintetiza más abajo hasta que
 * se baje el suyo de Mixamo, y por eso el mapa es parcial.
 */
const CLIP_FILES: Partial<Record<ClipName, string>> = {
  walk: "/models/anim/walking.glb",
  typing: "/models/anim/typing.glb",
  standToSit: "/models/anim/stand-to-sit.glb",
};

for (const url of Object.values(CLIP_FILES)) if (url) useGLTF.preload(url);

/**
 * En qué momento de `standToSit` se toma la pose de reposo.
 *
 * No en el fotograma cero: el primero de estas animaciones es la pose de bind
 * —de pie con los brazos en cruz— y congelarlo deja al personaje crucificado,
 * con la malla estirada en púas hacia los costados. Un tercio de segundo
 * después el clip ya está en una pose de pie natural.
 */
const IDLE_SAMPLE_TIME = 0.35;

/**
 * Un clip estático con una pose tomada de otro.
 *
 * El reposo de verdad todavía no existe —falta bajar "Breathing Idle" de
 * Mixamo— y un personaje parado en pose de bind, con los brazos en cruz, se ve
 * roto. Como sustituto sirve una pose tomada de `standToSit`, que arranca de
 * pie antes de agacharse.
 *
 * Cada pista queda con **dos** fotogramas idénticos separados un segundo, y no
 * con uno solo. Un clip de un fotograma tiene duración cero, y el mezclador de
 * three divide por la duración al avanzar el tiempo: el resultado son NaN que
 * se propagan a las matrices de los huesos y estiran los brazos del personaje
 * en púas hacia el infinito. Con dos fotogramas iguales la pose es igual de
 * estática y la duración es válida.
 *
 * El día que exista el archivo real alcanza con cargarlo en `CLIP_FILES`: el
 * resto del código pide `idle` y no se entera del cambio.
 */
function freezeAt(
  source: AnimationClip,
  name: string,
  time: number
): AnimationClip {
  const frozen = source.clone();
  frozen.name = name;

  for (const track of frozen.tracks) {
    const size = track.getValueSize();

    // El fotograma más cercano al tiempo pedido. No se interpola: buscar el
    // vecino alcanza para tomar una pose y evita tener que tratar los
    // cuaterniones distinto de las traslaciones.
    let index = 0;
    for (let i = 1; i < track.times.length; i++) {
      if (Math.abs(track.times[i] - time) < Math.abs(track.times[index] - time)) {
        index = i;
      }
    }

    const pose = Array.from(
      track.values.slice(index * size, index * size + size)
    );
    track.times = new Float32Array([0, 1]);
    track.values = new Float32Array([...pose, ...pose]);
  }

  frozen.duration = 1;
  return frozen;
}

/**
 * Carga los clips y les pone nombre.
 *
 * Mixamo llama a todas sus animaciones `mixamo.com`, así que los tres archivos
 * traen clips homónimos: sin renombrarlos, el mezclador no puede distinguir
 * cuál es cuál. Se clonan en vez de renombrar en el lugar porque `useGLTF`
 * cachea y devuelve siempre la misma instancia — escribirle encima afectaría a
 * cualquier otro componente que cargue el mismo archivo, y además es mutar el
 * valor que devolvió un hook.
 */
export function useAvatarClips(): AnimationClip[] {
  const walk = useGLTF(CLIP_FILES.walk!).animations;
  const typing = useGLTF(CLIP_FILES.typing!).animations;
  const standToSit = useGLTF(CLIP_FILES.standToSit!).animations;

  return useMemo(() => {
    const named: Array<[ClipName, AnimationClip[]]> = [
      ["walk", walk],
      ["typing", typing],
      ["standToSit", standToSit],
    ];

    const result = named.flatMap(([name, clips]) => {
      const first = clips[0];
      if (!first) return [];
      const copy = first.clone();
      copy.name = name;
      return [copy];
    });

    const source = result.find((c) => c.name === "standToSit");
    if (source && !result.some((c) => c.name === "idle")) {
      result.push(freezeAt(source, "idle", IDLE_SAMPLE_TIME));
    }

    return result;
  }, [walk, typing, standToSit]);
}
