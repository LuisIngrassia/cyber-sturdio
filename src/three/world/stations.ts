import { PROJECTS } from "../../data/projects";

/**
 * Dónde está cada puesto de computadora.
 *
 * Vive aparte del componente que los dibuja porque el sistema de caminado
 * también necesita estos números —para que el avatar rodee los escritorios en
 * vez de atravesarlos— y `playerState` no puede importar un componente 3D sin
 * armar un ciclo entre módulos.
 *
 * Los puestos van contra la pared izquierda del salón, que corre sobre Z. El
 * escritorio ya viene con su lado largo sobre Z, así que apoya contra la pared
 * sin rotar sobre su eje vertical.
 *
 *        x = -5 (pared)
 *         │
 *         ├── escritorio   x = -4.68
 *         ├── monitor      sobre la superficie
 *         ├── silla        x = -3.90
 *         └── el visitante se para en x = -3.10
 */

/** Distancia entre puestos. El escritorio mide 1,39 de largo. */
export const SPACING = 1.8;

export const DESK_X = -4.68;
export const CHAIR_X = -3.9;

/**
 * Alto de la caja del escritorio, no de su superficie.
 *
 * El mueble mide cuatro unidades de alto pero su tapa está a 3,01 del piso: por
 * encima sigue un respaldo. Normalizar la caja a 1,00 deja la superficie —que
 * es lo único que importa para apoyar el monitor y sentar a alguien— en 0,755,
 * que es la altura de un escritorio de verdad.
 */
export const DESK_BOX_HEIGHT = 1.0;
export const DESK_SURFACE_Y = DESK_BOX_HEIGHT * (3.01 / 4);

export const MONITOR_HEIGHT = 0.42;
export const CHAIR_HEIGHT = 0.9;

/**
 * El escritorio va sin rotar.
 *
 * Su lado largo ya corre sobre Z y el cuerpo es casi simétrico, así que girarlo
 * no acomoda nada: solo invierte el poco volumen asimétrico que tiene y deja el
 * mueble al revés. Lo que parecía un respaldo que había que mandar contra la
 * pared resultaron ser seis vértices sueltos a dos unidades de altura, que
 * inflan la caja del modelo pero no se ven.
 */
export const DESK_ROTATION = 0;

/**
 * La silla gira un cuarto de vuelta, no media.
 *
 * Su respaldo está sobre -Z. Para que mire al escritorio —que está sobre -X—
 * hay que llevar el respaldo a +X, y eso es -90°. Con media vuelta el respaldo
 * termina en +Z y la silla queda de costado.
 */
export const CHAIR_ROTATION = -Math.PI / 2;

/** En qué puestos hay utilería. Dos, para que no se note la repetición. */
export const WITH_PROPS = new Set([1, 4]);

export type Station = {
  id: string;
  nombre: string;
  tagline: string;
  z: number;
};

/**
 * Los puestos, derivados de los proyectos.
 *
 * El primer proyecto queda más cerca de la puerta: es lo primero que ve el
 * visitante al entrar.
 */
export const STATIONS: Station[] = PROJECTS.map((project, i) => ({
  id: project.id,
  nombre: project.nombre,
  tagline: project.tagline,
  z: -1.8 - i * SPACING,
}));

/**
 * Desde dónde se usa cada máquina.
 *
 * Queda por fuera del rectángulo bloqueado: el área de caminado infla cada
 * bloqueo por el radio del cuerpo, así que un destino pegado al borde es
 * inalcanzable y el sistema lo corregiría a otro lado.
 */
export const stationAnchor = (station: Station) => ({
  x: -3.1,
  z: station.z,
});

/**
 * Lo que ocupa cada puesto en el piso, para que el avatar lo rodee.
 *
 * Un solo rectángulo por puesto cubre el escritorio y la silla. Podrían ser
 * dos, pero entre ambos queda un hueco de treinta centímetros por el que el
 * sistema de caminado intentaría pasar y el avatar terminaría encajado.
 */
export const stationBlocker = (station: Station) => ({
  minX: -5,
  maxX: -3.55,
  minZ: station.z - 0.78,
  maxZ: station.z + 0.78,
});
