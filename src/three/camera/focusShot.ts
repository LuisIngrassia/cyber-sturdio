import gsap from "gsap";
import "./gsapSetup";
import * as THREE from "three";

import { player } from "../player/playerState";
import {
  followPosition,
  FOLLOW_LOOK_HEIGHT,
  shot,
  type CameraBounds,
} from "./CameraRig";

/**
 * Acercar la cámara a un objeto y devolverla después.
 *
 * Es el mismo recurso que el vuelo de entrada —una timeline de GSAP que escribe
 * sobre `shot`, que es lo que el rig copia— pero para un movimiento corto y
 * reversible: mirar una pantalla y volver.
 *
 * La vuelta no va a una posición escrita a mano sino a `followPosition`, la
 * misma función que usa el rig para seguir al avatar. Si se duplicara el
 * cálculo, cambiar el encuadre de seguimiento dejaría un salto en el frame
 * exacto en que la toma termina y el rig retoma el control.
 */

const DURATION = 0.9;

export type FocusTarget = {
  /** Dónde está lo que se quiere mirar. */
  look: THREE.Vector3;
  /** Desde dónde mirarlo. */
  from: THREE.Vector3;
};

let current: gsap.core.Timeline | null = null;

function retarget(from: THREE.Vector3, look: THREE.Vector3, ease: string) {
  // Se mata la timeline anterior antes de empezar otra: sin eso, dos enfoques
  // encadenados —el visitante cambia de computadora sin volver— dejan dos
  // animaciones escribiendo sobre el mismo vector y la cámara tiembla.
  current?.kill();

  current = gsap
    .timeline()
    .to(shot.position, { x: from.x, y: from.y, z: from.z, duration: DURATION, ease }, 0)
    .to(shot.target, { x: look.x, y: look.y, z: look.z, duration: DURATION, ease }, 0);

  return current;
}

/** Acerca la cámara a mirar algo. */
export function focusOn(target: FocusTarget) {
  return retarget(target.from, target.look, "power2.out");
}

/**
 * Devuelve la cámara al encuadre de seguimiento.
 *
 * `onComplete` corre cuando la cámara ya llegó, no al pedirlo: el rig no debe
 * retomar el control a mitad del movimiento o la transición se corta en seco.
 */
export function releaseFocus(bounds: CameraBounds, onComplete?: () => void) {
  // Con el rumbo actual del avatar: el encuadre de seguimiento gira con él, así
  // que volver a la posición "de fábrica" dejaría un salto al retomar.
  const from = followPosition(
    player.position.x,
    player.position.z,
    bounds,
    player.facing
  );
  const look = new THREE.Vector3(
    player.position.x,
    FOLLOW_LOOK_HEIGHT,
    player.position.z
  );

  const timeline = retarget(from, look, "power2.inOut");
  if (onComplete) timeline.eventCallback("onComplete", onComplete);
  return timeline;
}
