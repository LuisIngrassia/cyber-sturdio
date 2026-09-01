import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useUIStore } from "../../state/store";
import { Interactable } from "../interaction/Interactable";
import { PALETTE } from "../lib/palette";

/**
 * La entrada: lo único que el visitante tiene que descubrir por su cuenta.
 *
 * Toda la fachada está construida alrededor de este objeto, porque si no se
 * entiende que acá se entra, el resto del sitio no existe. La regla que sigue
 * es no explicarlo con texto: la puerta se comporta como si estuviera viva
 * —respira, se enciende al pasarle por encima— y a los pocos segundos sin
 * interacción aparece una flecha. Un cartel de "hacé click acá" resuelve lo
 * mismo y rompe la ilusión de que es un lugar.
 *
 * El objeto clickeable es un plano invisible en el hueco de la puerta, no la
 * pieza del kit: el marco tiene el agujero calado, así que el rayo pasaría de
 * largo justo por donde el visitante apunta.
 */

export type DoorwayProps = {
  position: [number, number, number];
  onEnter: () => void;
  /** Segundos sin interacción antes de mostrar la ayuda. */
  hintAfter?: number;
};

const DOOR_ID = "door";

export function Doorway({ position, onEnter, hintAfter = 5 }: DoorwayProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  // Se guarda en un ref y no en estado: cambia todos los frames y no tiene que
  // provocar re-render.
  const idleTime = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    // El hover se consulta acá, sin suscripción: cambiar de estado de React
    // para prender una luz sería re-renderizar el componente sesenta veces por
    // segundo para hacer algo que el loop ya está haciendo igual.
    const hovered = useUIStore.getState().hoveredId === DOOR_ID;

    // El hueco respira despacio, y al pasarle el puntero se enciende fuerte.
    const breath = 0.35 + Math.sin(t * 1.6) * 0.08;
    const level = hovered ? 1 : breath;

    const glow = glowRef.current?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    // El plano del hueco se mantiene tenue incluso en hover. Subirlo hasta el
    // tope lo convierte en una chapa amarilla opaca en vez de en luz saliendo:
    // el salto de "esto responde" lo da la luz puntual, que sí se dispara.
    if (glow) glow.opacity = level * 0.3;
    if (lightRef.current) lightRef.current.intensity = 6 + level * 18;

    // La ayuda aparece recién después de un rato sin que pase nada, y se va
    // apenas el visitante se acerca.
    idleTime.current = hovered ? 0 : idleTime.current + delta;
    if (arrowRef.current) {
      const show = idleTime.current > hintAfter;
      arrowRef.current.visible = show;
      if (show) arrowRef.current.position.y = 0.95 + Math.sin(t * 3) * 0.1;

      // El anillo del piso late en contrafase con el rebote de la flecha, así
      // el conjunto no se lee como un solo objeto subiendo y bajando. La
      // opacidad se escribe siempre, también cuando la ayuda está oculta: si
      // solo se actualizara al mostrarse, el anillo quedaría congelado con el
      // último valor apenas el visitante mueve el mouse.
      const ring = ringRef.current?.material as
        | THREE.MeshBasicMaterial
        | undefined;
      if (ring) {
        ring.opacity = show ? 0.35 + Math.sin(t * 3 + Math.PI) * 0.18 : 0;
      }
    }
  });

  return (
    <group position={position}>
      <Interactable id={DOOR_ID} label="Entrar al cyber" onActivate={onEnter}>
        {/**
         * El blanco del click. Invisible pero presente para el raycaster: un
         * `visible={false}` lo sacaría también de las colisiones del rayo, así
         * que se usa un material transparente con opacidad cero.
         */}
        <mesh position={[0, 1.05, 0.08]}>
          <planeGeometry args={[1.15, 2.1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* El resplandor cálido del hueco. */}
        <mesh ref={glowRef} position={[0, 1.05, -0.02]}>
          <planeGeometry args={[1.05, 2]} />
          <meshBasicMaterial
            color={PALETTE.amber}
            transparent
            opacity={0.35}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </Interactable>

      <pointLight
        ref={lightRef}
        position={[0, 1.2, 0.4]}
        color={PALETTE.amber}
        intensity={8}
        distance={6}
        decay={2}
      />

      {/**
       * La ayuda: un anillo en la vereda con una flecha encima.
       *
       * Va en el piso, delante de la puerta, y no colgada arriba. La primera
       * versión flotaba a la altura del cartel y el toldo se le metía en el
       * medio: leída desde la cámara, parecía estar señalando el cartel. Acá
       * abajo hay aire libre, no puede taparse con nada, y además dice algo
       * más preciso que "mirá esto" — dice "pasá por acá".
       */}
      <group ref={arrowRef} position={[0, 0.95, 1.5]} visible={false}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.17, 0.38, 4]} />
          <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
        </mesh>
      </group>

      <mesh
        ref={ringRef}
        position={[0, 0.03, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.42, 0.58, 32]} />
        <meshBasicMaterial
          color={PALETTE.green}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
