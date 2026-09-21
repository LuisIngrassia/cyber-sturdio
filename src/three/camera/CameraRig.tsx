import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { player } from "../player/playerState";

/**
 * La cámara.
 *
 * Tiene tres modos y uno solo manda a la vez:
 *
 *   - `orbit`    — la fachada. Los controles de órbita mueven la cámara y este
 *                  rig no toca nada.
 *   - `cinematic`— una toma guionada, como el vuelo hacia adentro. GSAP escribe
 *                  directamente sobre `shot`, y el rig se limita a copiarlo.
 *   - `follow`   — dentro del local. Sigue al avatar con un retardo.
 *
 * El estado vive fuera de React por lo mismo que el del avatar: cambia todos
 * los frames. Lo que sí es estado de React es *qué modo* está activo, y eso lo
 * decide el árbol de componentes al montar cada ambiente.
 */

export type CameraMode = "orbit" | "cinematic" | "follow";

/**
 * La posición y el objetivo que la cámara debería tener.
 *
 * En modo `cinematic` esto es lo que GSAP anima. En `follow` lo calcula el rig
 * a partir del avatar. Tenerlo en un objeto compartido en vez de tocar la
 * cámara directamente permite que una toma termine y el seguimiento retome
 * desde donde quedó, sin saltos.
 */
export const shot = {
  position: new THREE.Vector3(0, 2.8, 10),
  target: new THREE.Vector3(0, 1.9, 0),
};

/**
 * El desplazamiento de la cámara respecto del avatar dentro del local.
 *
 * Atrás y arriba, mirando un poco hacia abajo. La altura está elegida contra
 * los muros de 4,8: más arriba y la cámara se asoma por encima de la pared del
 * fondo, y se ve que el salón no tiene techo.
 */
export const FOLLOW_OFFSET = new THREE.Vector3(0, 2.6, 4);

/** Eje vertical, reutilizado para no crear un vector por frame. */
const UP = new THREE.Vector3(0, 1, 0);

/**
 * El rumbo con el que el desplazamiento está escrito.
 *
 * `FOLLOW_OFFSET` describe la cámara para alguien que mira hacia -Z, que es el
 * rumbo con el que el visitante entra al local. Para cualquier otro, el
 * desplazamiento se gira por la diferencia.
 */
const OFFSET_HEADING = Math.PI;
/** A qué altura del avatar mira. Al pecho, no a los pies. */
export const FOLLOW_LOOK_HEIGHT = 1.3;

/**
 * El recinto donde la cámara tiene permitido estar.
 *
 * Sin esto, un desplazamiento fijo hacia atrás deja la cámara del otro lado de
 * la pared apenas el avatar se acerca al frente del salón: parado en la
 * puerta, la cámara termina en la vereda mirando el toldo, y del salón no se
 * ve nada porque el muro está en el medio. Acotarla es lo que resuelve el caso
 * —y es lo que hace cualquier cámara de tercera persona— a costa de un ángulo
 * más picado cuando el avatar está contra una pared.
 */
export type CameraBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Cuánto se despega la cámara de las paredes. */
const BOUNDS_MARGIN = 0.7;

/**
 * Dónde debería estar la cámara para un avatar en esta posición.
 *
 * Se exporta para que el vuelo de entrada aterrice exactamente en el encuadre
 * de seguimiento. Si cada uno calculara su propia posición, cambiar el
 * desplazamiento acá dejaría un salto al final del vuelo — el tipo de detalle
 * que nadie sabe explicar pero que se siente roto.
 */
export function followPosition(
  x: number,
  z: number,
  bounds?: CameraBounds,
  heading = OFFSET_HEADING
): THREE.Vector3 {
  const offset = FOLLOW_OFFSET.clone().applyAxisAngle(
    UP,
    heading - OFFSET_HEADING
  );

  const position = new THREE.Vector3(x + offset.x, offset.y, z + offset.z);

  if (bounds) {
    position.x = THREE.MathUtils.clamp(
      position.x,
      bounds.minX + BOUNDS_MARGIN,
      bounds.maxX - BOUNDS_MARGIN
    );
    position.z = THREE.MathUtils.clamp(
      position.z,
      bounds.minZ + BOUNDS_MARGIN,
      bounds.maxZ - BOUNDS_MARGIN
    );
  }

  return position;
}

export type CameraRigProps = {
  mode: CameraMode;
  /** Cuánto tarda en alcanzar al avatar. Más alto, más pegada. */
  stiffness?: number;
  bounds?: CameraBounds;
};

export function CameraRig({ mode, stiffness = 2.4, bounds }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const lookAt = useRef(new THREE.Vector3());
  /**
   * Hacia dónde está mirando la cámara alrededor del avatar.
   *
   * Persigue al rumbo del avatar, pero mucho más lento. Con un desplazamiento
   * fijo en el mundo, la cámara miraba siempre hacia el fondo del salón y los
   * puestos —que están contra la pared izquierda— nunca entraban en cuadro: el
   * visitante no podía ni verlos ni clickearlos. Girando con el personaje,
   * caminar hacia ellos los trae al frente.
   *
   * La lentitud no es un detalle. Con el click-to-walk el rumbo cambia de golpe
   * en cada esquina del recorrido, y una cámara que copiara eso al instante
   * daría un latigazo por cada giro.
   */
  const yaw = useRef(OFFSET_HEADING);

  useFrame((_, delta) => {
    if (import.meta.env.DEV) {
      /**
       * Cámara libre para inspeccionar, desde la consola:
       *
       *   __freeCam = { pos: [x,y,z], target: [x,y,z] }
       *   __freeCam = null   // devuelve el control
       *
       * Colocar muebles a ojo exige mirarlos desde donde uno quiere, y los tres
       * modos del rig están atados al avatar o a una toma guionada. Sin esto,
       * cada verificación obliga a mover al personaje y conformarse con el
       * ángulo que resulte.
       */
      const free = (window as unknown as Record<string, unknown>).__freeCam as
        | { pos: [number, number, number]; target: [number, number, number] }
        | null
        | undefined;

      if (free) {
        camera.position.set(...free.pos);
        lookAt.current.set(...free.target);
        camera.lookAt(lookAt.current);
        return;
      }
    }

    if (import.meta.env.DEV) {
      // Una cámara mal ubicada se ve como "hay una pared adelante" y desde
      // afuera no hay forma de distinguir eso de un problema de geometría.
      (window as unknown as Record<string, unknown>).__camera = {
        mode,
        pos: camera.position.toArray().map((v) => +v.toFixed(2)),
        look: lookAt.current.toArray().map((v) => +v.toFixed(2)),
        want: shot.position.toArray().map((v) => +v.toFixed(2)),
      };
    }

    if (mode === "orbit") {
      // Mandan los OrbitControls. Igual se guarda dónde quedó la cámara, para
      // que el vuelo hacia adentro arranque exactamente desde ahí en lugar de
      // saltar a una posición fija.
      shot.position.copy(camera.position);
      return;
    }

    if (mode === "follow") {
      // Diferencia de ángulo por el camino corto, para que cruzar de +170° a
      // -170° no haga girar la cámara 340 grados para el lado largo.
      const turn =
        THREE.MathUtils.euclideanModulo(
          player.facing - yaw.current + Math.PI,
          Math.PI * 2
        ) - Math.PI;
      yaw.current += turn * (1 - Math.exp(-1.6 * delta));

      shot.position.copy(
        followPosition(player.position.x, player.position.z, bounds, yaw.current)
      );
      shot.target.set(
        player.position.x,
        FOLLOW_LOOK_HEIGHT,
        player.position.z
      );
    }

    /**
     * Amortiguación exponencial, con el delta en el exponente.
     *
     * Un `lerp(a, b, delta * k)` parece lo mismo pero depende del framerate: a
     * 144 fps la cámara persigue mucho más rápido que a 30, y el mismo valor
     * de rigidez da dos sensaciones distintas según la máquina. Con
     * `1 - exp(-k·dt)` el resultado es el mismo en cualquier equipo.
     */
    const t = 1 - Math.exp(-stiffness * delta);

    camera.position.lerp(shot.position, t);
    lookAt.current.lerp(shot.target, t);
    camera.lookAt(lookAt.current);
  });

  return null;
}
