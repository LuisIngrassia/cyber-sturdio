import * as THREE from "three";

import type { Zone } from "../../state/store";
import { clampToWalkable, planPath, rect, type WalkArea } from "./walkable";

/**
 * El estado del avatar, fuera de React.
 *
 * La posición cambia sesenta veces por segundo. Guardarla en estado de React
 * dispararía un re-render por frame de todo lo que la consulte —la cámara, el
 * avatar, los objetos que miden distancia—, para producir exactamente el mismo
 * dibujo que el loop ya está haciendo. Un objeto mutable que el loop lee y
 * escribe es lo correcto acá; el store de zustand queda para lo que sí cambia
 * de a saltos y sí tiene que re-renderizar (qué pantalla está abierta, en qué
 * ambiente estamos).
 */
export const player = {
  position: new THREE.Vector3(2, 0, 6),
  /** Rotación en Y, en radianes. Mirando hacia el local al empezar. */
  facing: Math.PI,
  /** Los puntos que faltan recorrer. Vacío = quieto. */
  path: [] as Array<{ x: number; z: number }>,
  /** Metros por segundo. Un caminar tranquilo, no una marcha. */
  speed: 1.6,
  /** Mientras esté tomado, el avatar no obedece clicks (vuelo de cámara). */
  locked: false,
  /** Se dispara al vaciarse el camino. Sirve para encadenar acciones. */
  onArrive: null as null | (() => void),
};

export type PlayerHandle = typeof player;

/**
 * En desarrollo, el estado del avatar queda colgado de `window`.
 *
 * Un mundo 3D no se puede inspeccionar leyendo el DOM: si el avatar no se
 * mueve, desde afuera no hay forma de distinguir "el click no llegó" de "el
 * destino se descartó" o de "está caminando pero muy lento". Esto le da al
 * script de verificación —y a la consola del navegador— algo concreto que
 * mirar. `import.meta.env.DEV` lo elimina del bundle de producción.
 */
export const debugStats = { frames: 0, lastDelta: 0, advanceCalls: 0 };

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.__player = player;
  w.__stats = debugStats;
}

/**
 * Las zonas caminables.
 *
 * La vereda llega hasta z = 0,6 y no hasta la pared: el frente del local está
 * en z = 0 y el avatar tiene cuerpo. El interior arranca en z = -0,3, del otro
 * lado del muro. Entre ambos queda un hueco a propósito — no se puede caminar
 * de la calle al salón, hay que pasar por la puerta, y de eso se encarga el
 * vuelo de cámara.
 */
export const WALK_AREAS: Record<Zone, WalkArea> = {
  facade: {
    floors: [rect(-7, 7, 0.6, 7)],
    blockers: [],
  },
  interior: {
    // 10 de ancho por 12 de fondo, que es el salón que arma Interior.tsx.
    floors: [rect(-4.6, 4.6, -11.4, -0.3)],
    blockers: [],
  },
  office: {
    floors: [rect(-2.2, 2.2, -3.2, -0.4)],
    blockers: [],
  },
};

/** Manda al avatar a un punto. Devuelve si encontró a dónde ir. */
export function walkTo(zone: Zone, x: number, z: number): boolean {
  if (player.locked) return false;

  const area = WALK_AREAS[zone];
  const goal = clampToWalkable(area, x, z);
  if (!goal) return false;

  player.path = planPath(area, player.position, goal.x, goal.z);
  return true;
}

/** Corta el movimiento donde esté. */
export function stopWalking() {
  player.path = [];
  player.onArrive = null;
}

/**
 * Reubica al avatar sin caminar. Para los cambios de ambiente.
 */
export function teleport(x: number, z: number, facing = player.facing) {
  player.position.set(x, 0, z);
  player.facing = facing;
  player.path = [];
}

/**
 * Avanza el avatar un frame. La devuelve `true` si se movió.
 *
 * La velocidad es constante y el paso se calcula por tiempo, no por
 * interpolación entre origen y destino. Con una interpolación de duración fija
 * el avatar correría cuando el destino está lejos y se arrastraría cuando está
 * cerca, y la animación de caminata dejaría de coincidir con el desplazamiento.
 */
export function advance(delta: number): boolean {
  debugStats.frames++;
  debugStats.lastDelta = delta;

  if (player.path.length === 0) return false;
  debugStats.advanceCalls++;

  // Un tope al delta: si la pestaña estuvo en segundo plano, el primer frame
  // al volver trae varios segundos acumulados y el avatar aparecería del otro
  // lado del salón, atravesando todo lo que hubiera en el medio.
  let remaining = player.speed * Math.min(delta, 0.1);

  while (remaining > 0 && player.path.length > 0) {
    const next = player.path[0];
    const dx = next.x - player.position.x;
    const dz = next.z - player.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= remaining) {
      player.position.x = next.x;
      player.position.z = next.z;
      remaining -= distance;
      player.path.shift();

      if (player.path.length === 0) {
        const callback = player.onArrive;
        player.onArrive = null;
        callback?.();
      }
      continue;
    }

    player.position.x += (dx / distance) * remaining;
    player.position.z += (dz / distance) * remaining;
    player.facing = Math.atan2(dx, dz);
    remaining = 0;
  }

  return true;
}
