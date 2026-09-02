import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useUIStore, worldIsInteractive } from "../../state/store";
import { PALETTE } from "../lib/palette";
import { player, walkTo } from "./playerState";

/**
 * El piso que recibe los clicks.
 *
 * Es un plano invisible por encima del piso visible. Va aparte y no montado
 * sobre la geometría real por dos motivos: el piso del salón está hecho de
 * baldosas del kit y habría que poner el manejador en cada una, y así el área
 * que responde al click no depende de qué se haya dibujado abajo.
 *
 * El anillo de destino también vive acá. Es la confirmación de que el click se
 * registró: sin él, un click sobre un punto lejano parece no hacer nada
 * durante el segundo largo que el avatar tarda en arrancar a moverse.
 */

export type WalkableFloorProps = {
  /** Tamaño del plano de clicks, en metros. */
  size?: [number, number];
  position?: [number, number, number];
};

export function WalkableFloor({
  size = [40, 40],
  position = [0, 0.005, 0],
}: WalkableFloorProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const markerLife = useRef(0);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!worldIsInteractive()) return;
    event.stopPropagation();

    const zone = useUIStore.getState().zone;
    const { x, z } = event.point;

    if (!walkTo(zone, x, z)) return;

    // El anillo se planta donde el avatar realmente va a terminar, no donde
    // cayó el click: si el punto estaba dentro de un mueble, el destino se
    // corrigió al borde y marcar el click original mentiría.
    const goal = player.path[player.path.length - 1];
    if (goal && markerRef.current) {
      markerRef.current.position.set(goal.x, 0.02, goal.z);
      markerLife.current = 1;
    }
  };

  useFrame((_, delta) => {
    if (markerLife.current <= 0) return;

    markerLife.current = Math.max(0, markerLife.current - delta * 1.4);

    const marker = markerRef.current;
    if (!marker) return;

    const t = markerLife.current;
    marker.visible = t > 0;
    // Se desvanece mientras se agranda: el gesto se lee como una onda que sale
    // del punto, no como algo que simplemente se apaga.
    marker.scale.setScalar(1 + (1 - t) * 0.6);
    (marker.material as THREE.MeshBasicMaterial).opacity = t * 0.7;
  });

  return (
    <>
      <mesh
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        // Invisible para el ojo, presente para el rayo. `visible={false}` lo
        // sacaría también del raycaster.
        renderOrder={-1}
      >
        <planeGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh
        ref={markerRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        renderOrder={2}
      >
        <ringGeometry args={[0.22, 0.32, 28]} />
        <meshBasicMaterial
          color={PALETTE.cyan}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
