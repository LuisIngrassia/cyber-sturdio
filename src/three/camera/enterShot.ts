import gsap from "gsap";
import * as THREE from "three";

import { player, teleport } from "../player/playerState";
import {
  followPosition,
  FOLLOW_LOOK_HEIGHT,
  shot,
  type CameraBounds,
} from "./CameraRig";

/**
 * El vuelo de entrada: de la vereda al salón, sin corte.
 *
 * Es el momento que define el proyecto, así que vale explicar cómo está armado.
 *
 * La coreografía tiene tres tramos encadenados en una sola timeline:
 *
 *   1. El avatar camina hasta el umbral por su cuenta (eso lo maneja el
 *      sistema de caminado; la timeline recién arranca cuando llegó).
 *   2. La cámara baja, se centra en la puerta y la atraviesa. Acá el avatar se
 *      teletransporta al otro lado — es invisible porque la cámara está justo
 *      en el plano de la puerta y el avatar queda fuera de cuadro.
 *   3. La cámara se abre hacia atrás y arriba hasta el encuadre de seguimiento,
 *      y el control pasa al modo `follow`.
 *
 * El truco central es el del punto 2. Hacer que el avatar cruce físicamente la
 * puerta exigiría que el vano fuera pisable y que el área caminable de la
 * calle y la del salón estuvieran conectadas, y ahí aparecen todos los
 * problemas: el avatar rozando el marco, la cámara metiéndose en la pared, el
 * cambio de ambiente a mitad de un paso. Reubicarlo en el frame en que nadie
 * lo está mirando cuesta una línea y se ve igual.
 */

/** Dónde para el avatar antes de entrar, en la vereda. */
export const DOOR_OUTSIDE = { x: 2, z: 1.6 };

/**
 * Dónde reaparece del otro lado, ya en el salón.
 *
 * Bien adentro y no apenas cruzando el umbral. La cámara de seguimiento va
 * cuatro metros detrás del avatar: dejándolo pegado a la puerta, esa posición
 * cae contra el muro del frente, el recorte la trae hacia adelante y el
 * encuadre queda casi cenital, con el avatar llenando la pantalla.
 *
 * A cinco metros la cámara entra entera en el salón sin necesidad de recorte y
 * el encuadre queda a la distancia de diseño. Además el visitante aterriza
 * mirando hacia el fondo del local, no hacia la pared que acaba de cruzar.
 */
export const DOOR_INSIDE = { x: 2, z: -5 };

export type EnterShotOptions = {
  onEnterInterior: () => void;
  onComplete: () => void;
  /** El recinto del salón, para que el vuelo aterrice donde el rig continuará. */
  bounds?: CameraBounds;
};

/**
 * Arma y arranca la timeline. Devuelve la timeline para poder matarla si el
 * componente se desmonta a mitad de camino.
 */
export function playEnterShot({
  onEnterInterior,
  onComplete,
  bounds,
}: EnterShotOptions) {
  const timeline = gsap.timeline({ onComplete });

  // El vuelo escribe sobre los mismos vectores que lee el rig. Se animan sus
  // componentes sueltas porque GSAP no sabe interpolar un THREE.Vector3.
  const p = shot.position;
  const t = shot.target;

  timeline
    // Tramo 1: la cámara se acomoda frente a la puerta, a la altura de una
    // persona. Bajar hasta acá antes de avanzar es lo que hace que el
    // movimiento se lea como "entrar" y no como "acercar el zoom".
    .to(
      p,
      {
        x: DOOR_OUTSIDE.x,
        y: 1.7,
        z: 4.2,
        duration: 1.1,
        ease: "power2.inOut",
      },
      0
    )
    .to(
      t,
      {
        x: DOOR_OUTSIDE.x,
        y: 1.4,
        z: 0,
        duration: 1.1,
        ease: "power2.inOut",
      },
      0
    )

    // Tramo 2: atraviesa el vano. Se mueve la mirada bien adentro del salón
    // para que la cámara se vaya orientando al fondo mientras cruza, en vez de
    // girar de golpe una vez adentro.
    .to(
      p,
      { x: DOOR_INSIDE.x, y: 1.75, z: -0.6, duration: 0.9, ease: "power1.in" },
      ">-0.1"
    )
    .to(
      t,
      { x: DOOR_INSIDE.x, y: 1.4, z: -6, duration: 0.9, ease: "power1.in" },
      "<"
    )

    // El avatar cambia de lado justo cuando la cámara está en el plano de la
    // puerta y él no se ve.
    .call(() => {
      teleport(DOOR_INSIDE.x, DOOR_INSIDE.z, Math.PI);
      onEnterInterior();
    })

    // Tramo 3: la cámara se abre hasta el encuadre de seguimiento.
    //
    // El destino sale de `followPosition`, la misma función que usa el rig. Si
    // se escribieran las coordenadas a mano, cambiar el desplazamiento de
    // seguimiento dejaría un salto en el frame exacto en que la toma termina y
    // el rig toma el control.
    .to(
      p,
      {
        ...followPosition(DOOR_INSIDE.x, DOOR_INSIDE.z, bounds),
        duration: 1.2,
        ease: "power2.out",
      },
      ">"
    )
    .to(
      t,
      {
        x: DOOR_INSIDE.x,
        y: FOLLOW_LOOK_HEIGHT,
        z: DOOR_INSIDE.z,
        duration: 1.2,
        ease: "power2.out",
      },
      "<"
    );

  return timeline;
}

/**
 * Manda al avatar a la puerta y encadena el vuelo cuando llegue.
 *
 * `locked` se toma acá y no se suelta hasta el final: durante los tres
 * segundos que dura la toma, un click en el piso mandaría al avatar a caminar
 * a otro lado mientras la cámara vuela, y llegaría al salón desde un lugar que
 * no es la puerta.
 */
export function walkInAndEnter(
  walkTo: (x: number, z: number) => boolean,
  options: EnterShotOptions
) {
  if (player.locked) return;

  const start = () => {
    player.locked = true;
    playEnterShot({
      ...options,
      onComplete: () => {
        player.locked = false;
        options.onComplete();
      },
    });
  };

  const alreadyThere =
    new THREE.Vector2(
      player.position.x - DOOR_OUTSIDE.x,
      player.position.z - DOOR_OUTSIDE.z
    ).length() < 0.4;

  if (alreadyThere) {
    start();
    return;
  }

  if (walkTo(DOOR_OUTSIDE.x, DOOR_OUTSIDE.z)) {
    player.onArrive = start;
  }
}
