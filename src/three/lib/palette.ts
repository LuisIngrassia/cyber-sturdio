import * as THREE from "three";

/**
 * La paleta del local, decidida una sola vez.
 *
 * Todo el proyecto toma sus colores de acá. La regla es que nunca se elige un
 * color a ojo en el lugar donde se usa: si hace falta un tono nuevo, se agrega
 * a esta tabla con un nombre que diga para qué es. Es lo que mantiene la
 * escena coherente sin depender de tener criterio estético en cada archivo.
 *
 * Los valores salieron de la imagen de referencia (el puesto de ramen de noche):
 * un vacío casi negro con neones saturados, y adentro luz cálida.
 */
export const PALETTE = {
  /** El vacío. No es negro puro: un negro con algo de violeta lee más rico. */
  void: "#05030a",
  /**
   * Piso y paredes en sombra. Recibe el color de los neones por reflejo.
   *
   * Parece demasiado claro leído como número, y es a propósito. En una escena
   * casi sin luz, un albedo bajo se multiplica por poca luz y da negro puro:
   * la superficie desaparece. El aspecto oscuro lo terminan de dar la
   * viñeta, la oclusión ambiental y el tone mapping, no el color base.
   */
  concrete: "#2a2233",
  /** Cuerpos oscuros: gabinetes, marcos, estructura. */
  shell: "#352d42",

  // --- Neones. Son los únicos colores saturados de la escena. ---
  magenta: "#ff2d95",
  cyan: "#22e0e8",
  purple: "#8b3fd9",
  green: "#39ff88",

  /**
   * El cálido del interior. El contraste frío-afuera / cálido-adentro es lo
   * que hace que entrar al local se sienta acogedor, y es gratis.
   */
  amber: "#ffa940",
  /** Madera de la barra y los escritorios. */
  wood: "#6b4224",
} as const;

export type PaletteColor = keyof typeof PALETTE;

/**
 * Los neones, aparte, para poder recorrerlos.
 *
 * Sirve para repartir colores entre elementos repetidos (los tubos del techo,
 * las pantallas) sin cablear cuál va en cada uno.
 */
export const NEONS = [
  PALETTE.magenta,
  PALETTE.cyan,
  PALETTE.purple,
  PALETTE.green,
] as const;

/**
 * Cachea los `THREE.Color`, que son objetos y no deberían recrearse por frame.
 *
 * Three parsea el string a espacio lineal al construir el color, así que los
 * valores de arriba se escriben como se ven en un selector de color y la
 * conversión pasa acá adentro una sola vez.
 */
const cache = new Map<string, THREE.Color>();

export function color(hex: string): THREE.Color {
  let existing = cache.get(hex);
  if (!existing) {
    existing = new THREE.Color(hex);
    cache.set(hex, existing);
  }
  return existing;
}
