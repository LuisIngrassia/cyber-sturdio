import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { useUIStore } from "../../state/store";
import { Interactable } from "../interaction/Interactable";
import { PALETTE } from "../lib/palette";
import { Instanced, type Placement } from "./Instanced";
import { useHeroTexture } from "./screenImage";
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
import { planarUVs, useProp, type PropPart } from "./useProp";

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
 * El material que el modelo del monitor usa para el área de imagen del tubo.
 *
 * Esa pieza se separa del resto: las demás van instanciadas —son idénticas en
 * los seis puestos— pero cada pantalla muestra un proyecto distinto y necesita
 * su propio material.
 */
const SCREEN_MATERIAL = "Win 98 Screen";

/**
 * El vidrio del tubo, que va delante del área de imagen.
 *
 * Conserva su negro original: teñido del gris del plástico se vuelve una placa
 * opaca que tapa la pantalla.
 */
const GLASS_MATERIAL = "Screen Surface";

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
    tint: { ...PLASTIC_TINT, except: [GLASS_MATERIAL, SCREEN_MATERIAL] },
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
   * La pantalla se separa del resto del monitor.
   *
   * Antes era un plano flotando por delante del CRT, colocado con números
   * estimados: quedaba corrido respecto del marco. Usando la pieza que el
   * propio modelo trae para el área de imagen, el encaje es exacto por
   * construcción —incluidas las esquinas redondeadas del tubo— y no hay nada
   * que ajustar a ojo.
   *
   * Le faltan las coordenadas de textura porque en el modelo original era una
   * superficie de color liso; se deducen proyectando su plano. Ver `planarUVs`.
   */
  const { screenPart, monitorBody } = useMemo(() => {
    const body: PropPart[] = [];
    let screen: PropPart | null = null;

    for (const part of monitor) {
      if (part.name === SCREEN_MATERIAL && !screen) {
        const geometry = part.geometry.clone();
        // La pantalla mira al salón, sobre +X: a lo ancho corre Z y a lo alto Y.
        // Espejada, porque mirándola desde +X el eje Z crece hacia la izquierda.
        planarUVs(geometry, 2, 1, true);
        screen = { ...part, geometry };
      } else {
        body.push(part);
      }
    }

    return { screenPart: screen, monitorBody: body };
  }, [monitor]);

  return (
    <group>
      <Instanced parts={desk} items={desks} />
      <Instanced parts={monitorBody} items={monitors} />
      <Instanced parts={chair} items={chairs} />
      <Instanced parts={props} items={propDesks} />

      {STATIONS.map((station) => (
        <Interactable
          key={station.id}
          id={stationId(station)}
          label={station.nombre}
          onActivate={() => onUse(station)}
        >
          {screenPart && <Screen station={station} part={screenPart} />}

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
/**
 * La pantalla encendida.
 *
 * Va aparte de las instancias porque cada una muestra un proyecto distinto y
 * por lo tanto tiene su propio material. Seis llamadas de dibujo más, que es el
 * precio de que cada máquina diga qué es.
 *
 * `meshBasicMaterial` y `toneMapped={false}`, igual que los carteles de neón:
 * una pantalla es una fuente de luz, no algo iluminado, y saltearse el tone
 * mapping es lo que le deja pasar el umbral del bloom.
 */
function Screen({ station, part }: { station: Station; part: PropPart }) {
  /**
   * La captura del sitio si existe; si no, el nombre dibujado por código.
   *
   * El respaldo no es un placeholder temporal que haya que sacar: es lo que
   * mantiene el salón entero mientras las capturas van llegando de a una, y lo
   * que va a seguir cubriendo a un proyecto nuevo el día que se agregue una
   * entrada a `projects.ts` antes de tener su imagen.
   */
  const hero = useHeroTexture(station.id);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: hero ?? screenTexture(station.nombre, station.tagline),
        toneMapped: false,
      }),
    [hero, station.nombre, station.tagline]
  );

  const ref = useRef<THREE.Mesh>(null);
  const id = stationId(station);

  /**
   * La máquina apuntada se enciende.
   *
   * El hover se consulta acá y no se recibe como prop: es estado que cambia con
   * cada movimiento del puntero, y pasar por React haría re-renderizar los seis
   * puestos para subirle el brillo a un material.
   *
   * En reposo la pantalla va por debajo de uno. El color del `meshBasic`
   * multiplica a la textura, y a valor pleno los proyectos de fondo claro
   * —Recuvarilla y su ERP— se queman: en un salón a oscuras se leen como hojas
   * de papel en blanco, no como monitores. Atenuadas quedan por debajo del
   * umbral del bloom, y el hover las lleva por encima: apuntar una máquina la
   * hace brillar de verdad, que es exactamente la señal que hace falta.
   */
  useFrame((_, delta) => {
    const mat = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (!mat) return;

    const wanted = useUIStore.getState().hoveredId === id ? 1.15 : 0.6;
    // Se interpola en vez de saltar: encenderse de golpe se lee como un
    // parpadeo, que es justo lo que se sacó de los carteles.
    const next = THREE.MathUtils.damp(mat.color.r, wanted, 8, delta);
    mat.color.setScalar(next);
  });

  return (
    <mesh
      ref={ref}
      geometry={part.geometry}
      material={material}
      /**
       * Un milímetro por delante del vidrio.
       *
       * El modelo trae dos piezas coplanares: el vidrio del tubo y, encima, el
       * área de imagen. Dejadas a la misma profundidad pelean por el z-buffer y
       * la pantalla parpadea o desaparece detrás del vidrio.
       */
      position={[DESK_X + 0.004, DESK_SURFACE_Y, station.z]}
    />
  );
}
