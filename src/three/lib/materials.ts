import { useMemo } from "react";
import * as THREE from "three";

import { PALETTE } from "./palette";

/**
 * Los materiales del local.
 *
 * Están centralizados por dos razones. La obvia es no recrear materiales en
 * cada render. La importante es que los props vienen de packs CC0 distintos,
 * cada uno con sus propios colores y acabados: si a todos se les repinta el
 * material con estos, la escena se ve como un lugar y no como una pila de
 * modelos ajenos. El material unifica lo que la topología no.
 */

/**
 * Neón.
 *
 * `emissiveIntensity` arranca en 2 porque el umbral de bloom está en 0,85: un
 * emisivo de intensidad 1 apenas lo pasa y el halo casi no se ve. Por encima
 * de ~4 el color se quema a blanco y se pierde el tono, así que ese es el
 * techo útil.
 */
export function neonMaterial(hex: string, intensity = 2) {
  return new THREE.MeshStandardMaterial({
    color: "#000000",
    emissive: new THREE.Color(hex),
    emissiveIntensity: intensity,
    toneMapped: false,
    roughness: 1,
    metalness: 0,
  });
}

/**
 * Plástico y metal oscuro: gabinetes, marcos, estructura.
 *
 * `metalness` bajo y no cero. Un material metálico no tiene componente difusa
 * — solo refleja el entorno — así que subirlo sin un environment map cargado
 * pinta el objeto de negro sin importar cuántas luces haya. Con el
 * <Environment> de la escena puesto, este valor da el brillo justo de plástico
 * duro; si alguna vez se saca el entorno, hay que bajarlo a 0.
 */
export function shellMaterial(hex: string = PALETTE.shell) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.55,
    metalness: 0.12,
  });
}

/**
 * Hormigón del piso y las paredes.
 *
 * Rugosidad alta y algo de metalness. El toque de metalness es deliberado:
 * hace que la superficie recoja algo del color de los neones en vez de quedar
 * como un plano gris muerto, que es como se ve un piso mate en una escena sin
 * luz ambiente.
 */
export function concreteMaterial(hex: string = PALETTE.concrete) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.9,
    metalness: 0.1,
  });
}

/** Madera cálida de la barra y los escritorios. */
export function woodMaterial(hex: string = PALETTE.wood) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.75,
    metalness: 0,
  });
}

/** Versiones memoizadas, para usar dentro de componentes. */
export function useNeonMaterial(hex: string, intensity = 2) {
  return useMemo(() => neonMaterial(hex, intensity), [hex, intensity]);
}

export function useShellMaterial(hex?: string) {
  return useMemo(() => shellMaterial(hex), [hex]);
}

export function useConcreteMaterial(hex?: string) {
  return useMemo(() => concreteMaterial(hex), [hex]);
}
