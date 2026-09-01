import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

import { PALETTE } from "../lib/palette";

/**
 * Carga y repintado de las piezas del Building Kit de Kenney (CC0).
 *
 * El kit es modular sobre una grilla de 2 unidades, con muros de 2,4 de alto,
 * y viene autorizado en metros — que es justo la escala que usa el proyecto,
 * así que no se reescala nada.
 *
 * Todas las piezas comparten exactamente dos materiales: `colormap`, que
 * muestrea un atlas de bandas de color, y `glass` en las ventanas. Eso hace
 * que unificarlas sea barato: se toca el material y cambia el kit entero.
 *
 * El repintado no reemplaza el atlas, lo tiñe. `MeshStandardMaterial.color`
 * multiplica al `map`, así que un tinte oscuro baja todo el kit a la paleta
 * del local conservando la variación de valor que ya trae la textura entre una
 * parte y otra. Reemplazar el atlas por colores planos perdería esa variación
 * y dejaría los edificios como siluetas de un solo tono.
 */

const KIT_BASE = "/models/kit";

/** La grilla del kit. Todo se posiciona en múltiplos de esto. */
export const GRID = 2;
/** Alto de un muro del kit, en metros. También es el alto de piso a techo. */
export const WALL_HEIGHT = 2.4;

export type KitPieceName =
  | "wall"
  | "wall-corner"
  | "wall-low"
  | "wall-half"
  | "wall-doorway-square"
  | "wall-window-square"
  | "wall-window-square-detailed"
  | "wall-window-wide-square"
  | "wall-window-wide-square-detailed"
  | "border"
  | "border-high"
  | "border-corner"
  | "column"
  | "column-thin"
  | "floor"
  | "detail-pipe"
  | "gutter-vertical"
  | "gutter-vertical-bottom"
  | "plating"
  | "plating-detailed"
  | "roof-flat-center"
  | "roof-flat-side"
  | "roof-flat-corner";

const url = (name: KitPieceName) => `${KIT_BASE}/${name}.glb`;

/**
 * El tinte del kit.
 *
 * Es un parámetro y no una constante para poder diferenciar el exterior del
 * interior: el frente del local va frío y apagado, y adentro los mismos muros
 * van a ir un punto más cálidos.
 */
export type KitTint = {
  color?: string;
  roughness?: number;
  metalness?: number;
};

const DEFAULT_TINT: Required<KitTint> = {
  color: PALETTE.shell,
  roughness: 0.85,
  // Cero metalness: el kit trae `metallicFactor: 0` y no hay razón para
  // subirlo. Un metálico sin entorno cargado se pinta de negro.
  metalness: 0,
};

/**
 * Devuelve una copia de la pieza, con los materiales ya repintados.
 *
 * Se clona porque `useGLTF` cachea y devuelve la misma instancia a todos los
 * que la pidan: sin clonar, colocar el mismo muro dos veces movería el mismo
 * objeto en vez de crear dos.
 */
export function useKitPiece(name: KitPieceName, tint?: KitTint): THREE.Object3D {
  const { scene } = useGLTF(url(name));

  const settings = { ...DEFAULT_TINT, ...tint };

  return useMemo(() => {
    // El clone de three alcanza: las piezas del kit son estáticas. Comparte la
    // geometría con el original (que es lo que queremos) y duplica los nodos,
    // así que reasignar el material acá abajo no toca al resto de las copias.
    // El día que entre el avatar riggeado va a hacer falta SkeletonUtils.
    const copy = scene.clone(true);

    copy.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      node.castShadow = true;
      node.receiveShadow = true;

      const source = node.material as THREE.MeshStandardMaterial;

      if (source.name === "glass") {
        // El vidrio de la vitrina. Oscuro y bastante transparente: tiene que
        // dejar entrever el interior encendido, que es el anzuelo para entrar.
        node.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(PALETTE.concrete),
          transmission: 0.6,
          transparent: true,
          opacity: 0.35,
          roughness: 0.15,
          metalness: 0,
          ior: 1.4,
          // Sin esto el vidrio se dibuja tapando lo que tiene detrás según el
          // orden de render, y el interior aparece y desaparece al orbitar.
          depthWrite: false,
        });
        return;
      }

      node.material = new THREE.MeshStandardMaterial({
        map: source.map,
        color: new THREE.Color(settings.color),
        roughness: settings.roughness,
        metalness: settings.metalness,
      });
    });

    return copy;
  }, [scene, settings.color, settings.roughness, settings.metalness]);
}

/**
 * Precarga.
 *
 * Sin esto cada pieza dispara su propia petición la primera vez que se monta y
 * la fachada aparece de a pedazos. Son 23 archivos de pocos KB, así que pedirlos
 * todos juntos al arrancar sale más barato que escalonarlos.
 */
export function preloadKit(names: KitPieceName[]) {
  for (const name of names) useGLTF.preload(url(name));
}
