import * as THREE from "three";

/**
 * Dónde se puede caminar y cómo se llega de un punto a otro.
 *
 * El piso del local es plano, así que todo esto es geometría en dos
 * dimensiones sobre el plano XZ. Esa es la simplificación más grande del
 * proyecto: sin desniveles no hace falta un navmesh ni un A* — alcanza con
 * rectángulos y unas pocas cuentas.
 *
 * El módulo es a propósito código puro, sin React ni three más allá de los
 * vectores: se puede razonar y probar solo.
 */

/** Rectángulo alineado a los ejes sobre el plano del piso. */
export type Rect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type WalkArea = {
  /** Dónde se puede pisar. Si son varios, se pueden solapar. */
  floors: Rect[];
  /** Muebles y muros: se descuentan de lo anterior. */
  blockers: Rect[];
};

export const rect = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): Rect => ({ minX, maxX, minZ, maxZ });

const inside = (r: Rect, x: number, z: number) =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

/** Agranda un rectángulo. Se usa para que el avatar no roce los obstáculos. */
const grow = (r: Rect, by: number): Rect => ({
  minX: r.minX - by,
  maxX: r.maxX + by,
  minZ: r.minZ - by,
  maxZ: r.maxZ + by,
});

/**
 * El radio del cuerpo del avatar.
 *
 * Los bloqueos se inflan por este valor antes de cualquier cuenta. Si se
 * comparara el centro del avatar contra el borde exacto del mueble, la mitad
 * del cuerpo quedaría metida adentro: lo que no puede atravesar la pared es la
 * persona, no su punto de origen.
 */
export const BODY_RADIUS = 0.35;

export function isWalkable(area: WalkArea, x: number, z: number): boolean {
  if (!area.floors.some((f) => inside(f, x, z))) return false;
  return !area.blockers.some((b) => inside(grow(b, BODY_RADIUS), x, z));
}

/**
 * Lleva un punto cualquiera al lugar pisable más cercano.
 *
 * Hace falta porque el destino sale de un click en el mundo, y la gente
 * clickea muebles, paredes y el vacío. Sin esto, un click apenas afuera del
 * área simplemente no haría nada, que es la peor respuesta posible: se lee
 * como que el sitio está roto. Mejor caminar hasta lo más cerca que se pueda.
 */
export function clampToWalkable(
  area: WalkArea,
  x: number,
  z: number
): { x: number; z: number } | null {
  if (isWalkable(area, x, z)) return { x, z };

  let best: { x: number; z: number } | null = null;
  let bestDistance = Infinity;

  // Se buscan candidatos sobre el borde de cada piso y de cada bloqueo, y se
  // elige el más cercano que efectivamente sea pisable.
  const candidates: Array<{ x: number; z: number }> = [];

  for (const f of area.floors) {
    candidates.push({
      x: THREE.MathUtils.clamp(x, f.minX, f.maxX),
      z: THREE.MathUtils.clamp(z, f.minZ, f.maxZ),
    });
  }

  for (const b of area.blockers) {
    const g = grow(b, BODY_RADIUS + 0.01);
    // Las cuatro proyecciones sobre los lados del bloqueo inflado.
    candidates.push({ x: THREE.MathUtils.clamp(x, g.minX, g.maxX), z: g.minZ });
    candidates.push({ x: THREE.MathUtils.clamp(x, g.minX, g.maxX), z: g.maxZ });
    candidates.push({ x: g.minX, z: THREE.MathUtils.clamp(z, g.minZ, g.maxZ) });
    candidates.push({ x: g.maxX, z: THREE.MathUtils.clamp(z, g.minZ, g.maxZ) });
  }

  for (const c of candidates) {
    if (!isWalkable(area, c.x, c.z)) continue;
    const d = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }

  return best;
}

/** ¿El segmento entre dos puntos atraviesa algún lugar no pisable? */
function segmentIsClear(
  area: WalkArea,
  ax: number,
  az: number,
  bx: number,
  bz: number
): boolean {
  // Muestreo a paso fijo. Con rectángulos se podría resolver analíticamente,
  // pero el muestreo también atrapa los huecos entre dos pisos distintos —el
  // vano de una puerta, por ejemplo— que una intersección contra los bloqueos
  // dejaría pasar.
  const distance = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(2, Math.ceil(distance / 0.25));

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isWalkable(area, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

/**
 * Los puntos por los que hay que pasar para ir de un lado al otro.
 *
 * Si se puede ir derecho, se va derecho. Si no, se prueban dos recorridos en
 * ele —primero en X y después en Z, o al revés— y se usa el que dé. Es lo
 * mínimo que hace falta para rodear un mueble en una sala rectangular, y
 * mientras siga alcanzando no hay razón para meter una librería de
 * pathfinding: un recast completo para esquivar una barra es desproporcionado.
 *
 * Si ninguno de los dos sirve, se devuelve el tramo recto igual. Es mejor que
 * el avatar haga algo raro y llegue, a que se quede clavado sin explicación.
 */
export function planPath(
  area: WalkArea,
  from: THREE.Vector3,
  toX: number,
  toZ: number
): Array<{ x: number; z: number }> {
  const destination = { x: toX, z: toZ };

  if (segmentIsClear(area, from.x, from.z, toX, toZ)) return [destination];

  const corners = [
    { x: toX, z: from.z },
    { x: from.x, z: toZ },
  ];

  for (const corner of corners) {
    if (!isWalkable(area, corner.x, corner.z)) continue;
    if (!segmentIsClear(area, from.x, from.z, corner.x, corner.z)) continue;
    if (!segmentIsClear(area, corner.x, corner.z, toX, toZ)) continue;
    return [corner, destination];
  }

  return [destination];
}
