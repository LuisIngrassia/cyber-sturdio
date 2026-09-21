import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { useUIStore } from "../../state/store";
import { Interactable } from "../interaction/Interactable";
import { PALETTE } from "../lib/palette";
import { Instanced, type Placement } from "./Instanced";
import { screenTexture } from "./screenTexture";
import {
  CHAIR_HEIGHT,
  CHAIR_ROTATION,
  CHAIR_X,
  DESK_BOX_HEIGHT,
  DESK_ROTATION,
  DESK_SURFACE_Y,
  DESK_X,
  MONITOR_HEIGHT,
  STATIONS,
  WITH_PROPS,
  type Station,
} from "./stations";
import { useProp } from "./useProp";

/**
 * Los muebles se tiñen hacia la paleta del local.
 *
 * Vienen con madera clara y plástico blanco, pensados para una escena
 * iluminada. Puestos tal cual en un salón que es casi todo penumbra y neón, los
 * seis escritorios son lo más brillante que hay y se comen la atención que
 * deberían tener las pantallas. El tinte multiplica la textura, así que
 * conserva su veta y su variación: solo baja el valor.
 */
const FURNITURE_TINT = { color: "#6b6152", roughness: 0.9 };
const PLASTIC_TINT = { color: PALETTE.shell, roughness: 0.65 };

/**
 * Los puestos de computadora: una máquina por proyecto.
 *
 * Van contra la pared izquierda del salón, que corre sobre Z. El escritorio ya
 * viene con su lado largo sobre Z, así que se apoya contra la pared sin rotar.
 *
 *        x = -5 (pared)
 *         │
 *         ├── escritorio   x = -4.68
 *         ├── monitor      sobre la superficie
 *         ├── silla        x = -3.95
 *         └── el visitante llega hasta x = -3.6
 *
 * Todo lo repetido va instanciado. Seis puestos sin instanciar serían sesenta
 * llamadas de dibujo sobre las sesenta y cuatro que ya tiene el salón; así son
 * diez, más una por pantalla.
 */

const DESK_URL = "/models/pc/desk.glb";
const PROPS_URL = "/models/pc/desk-props.glb";
const MONITOR_URL = "/models/pc/monitor.glb";
const CHAIR_URL = "/models/pc/chair.glb";

for (const url of [DESK_URL, PROPS_URL, MONITOR_URL, CHAIR_URL]) {
  useGLTF.preload(url);
}

/** El `id` con el que cada máquina se identifica ante el sistema de hover. */
export const stationId = (station: Station) => `pc-${station.id}`;

export type WorkstationsProps = {
  /** Se dispara al activar una máquina. */
  onUse: (station: Station) => void;
};

export function Workstations({ onUse }: WorkstationsProps) {
  const desk = useProp(DESK_URL, {
    height: DESK_BOX_HEIGHT,
    tint: FURNITURE_TINT,
  });
  // La utilería conserva sus colores: los libros y los post-its son las únicas
  // manchas de color cálido del rincón y ahí está toda su gracia.
  const props = useProp(PROPS_URL, {
    height: DESK_BOX_HEIGHT,
    alignTo: DESK_URL,
    tint: { roughness: 0.85 },
  });
  const monitor = useProp(MONITOR_URL, {
    height: MONITOR_HEIGHT,
    tint: PLASTIC_TINT,
  });
  const chair = useProp(CHAIR_URL, {
    height: CHAIR_HEIGHT,
    tint: PLASTIC_TINT,
  });

  const desks: Placement[] = useMemo(
    () =>
      STATIONS.map((s) => ({
        position: [DESK_X, 0, s.z] as [number, number, number],
        rotationY: DESK_ROTATION,
      })),
    []
  );
  const monitors: Placement[] = useMemo(
    () => STATIONS.map((s) => ({ position: [DESK_X, DESK_SURFACE_Y, s.z] })),
    []
  );
  const chairs: Placement[] = useMemo(
    () =>
      STATIONS.map((s) => ({
        position: [CHAIR_X, 0, s.z] as [number, number, number],
        rotationY: CHAIR_ROTATION,
      })),
    []
  );
  const propDesks: Placement[] = useMemo(
    () =>
      STATIONS.filter((_, i) => WITH_PROPS.has(i)).map((s) => ({
        position: [DESK_X, 0, s.z] as [number, number, number],
        rotationY: DESK_ROTATION,
      })),
    []
  );

  /**
   * Dónde apoyar la pantalla, medido sobre la geometría del monitor.
   *
   * El monitor y el teclado vienen como una sola malla, así que no hay un nodo
   * "pantalla" que consultar ni forma de deducir de los números cuál es el
   * frente. Se toma la caja del conjunto ya normalizado: el borde en +X es el
   * lado que mira al salón, y la pantalla va sobre la mitad superior.
   */
  const screenSpot = useMemo(() => {
    const box = new THREE.Box3();
    for (const part of monitor) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox!);
    }
    return { front: box.max.x, top: box.max.y, center: box.getCenter(new THREE.Vector3()) };
  }, [monitor]);

  return (
    <group>
      <Instanced parts={desk} items={desks} />
      <Instanced parts={monitor} items={monitors} />
      <Instanced parts={chair} items={chairs} />
      <Instanced parts={props} items={propDesks} />

      {STATIONS.map((station) => (
        <Interactable
          key={station.id}
          id={stationId(station)}
          label={station.nombre}
          onActivate={() => onUse(station)}
        >
          <Screen station={station} spot={screenSpot} />

          {/**
           * El blanco del click, invisible.
           *
           * La pantalla sola es un rectángulo de treinta centímetros: apuntarle
           * exige precisión y el visitante termina clickeando el escritorio sin
           * que pase nada, que se lee como que la máquina no funciona. Esta caja
           * cubre el puesto entero —escritorio, monitor y silla— así que
           * cualquier click razonable lo activa.
           */}
          <mesh position={[-4.2, 0.6, station.z]}>
            <boxGeometry args={[1.6, 1.2, 1.5]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </Interactable>
      ))}
    </group>
  );
}

/**
 * La pantalla encendida.
 *
 * Va aparte de las instancias porque cada una muestra un proyecto distinto y
 * por lo tanto tiene su propia textura. Seis llamadas de dibujo más, que es el
 * precio de que cada máquina diga qué es.
 *
 * `meshBasicMaterial` y `toneMapped={false}`, igual que los carteles de neón:
 * una pantalla es una fuente de luz, no algo iluminado, y saltearse el tone
 * mapping es lo que le deja pasar el umbral del bloom.
 */
type ScreenSpot = { front: number; top: number; center: THREE.Vector3 };

function Screen({ station, spot }: { station: Station; spot: ScreenSpot }) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: screenTexture(station.nombre, station.tagline),
        toneMapped: false,
      }),
    [station.nombre, station.tagline]
  );

  const ref = useRef<THREE.Mesh>(null);
  const id = stationId(station);

  /**
   * La máquina apuntada se enciende.
   *
   * El hover se consulta acá y no se recibe como prop: es estado que cambia con
   * cada movimiento del puntero, y pasar por React haría re-renderizar los seis
   * puestos para subirle el brillo a un material. El color del `meshBasic`
   * multiplica a la textura, así que llevarlo por encima de uno la sobreexpone
   * y el bloom la agarra — la pantalla apuntada destaca sobre las otras cinco.
   */
  useFrame((_, delta) => {
    const mat = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (!mat) return;

    const wanted = useUIStore.getState().hoveredId === id ? 1.9 : 1;
    // Se interpola en vez de saltar: encenderse de golpe se lee como un
    // parpadeo, que es justo lo que se sacó de los carteles.
    const next = THREE.MathUtils.damp(mat.color.r, wanted, 8, delta);
    mat.color.setScalar(next);
  });

  return (
    <mesh
      ref={ref}
      position={[
        DESK_X + spot.front + 0.004,
        DESK_SURFACE_Y + spot.top * 0.62,
        station.z + spot.center.z,
      ]}
      rotation={[0, Math.PI / 2, 0]}
      material={material}
    >
      <planeGeometry args={[0.3, 0.22]} />
    </mesh>
  );
}
