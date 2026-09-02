import { useUIStore, type Zone } from "../state/store";
import { DOOR_INSIDE } from "./camera/enterShot";
import { teleport } from "./player/playerState";

/**
 * Arranca directamente en un ambiente: `?start=interior`.
 *
 * Amueblar el salón implica recargar decenas de veces, y hacerlo entrando
 * desde la vereda cada vez —preloader, botón, caminata, vuelo de cámara— son
 * quince segundos por iteración que no aportan nada. Esto salta al ambiente
 * pedido con el avatar ya adentro.
 *
 * Solo existe en desarrollo: `import.meta.env.DEV` deja la rama muerta y el
 * bundler la elimina, así que nadie puede saltarse la fachada en producción.
 */

const SPAWNS: Partial<Record<Zone, { x: number; z: number }>> = {
  interior: DOOR_INSIDE,
  office: { x: 0, z: -1.5 },
};

export type DevStart = { zone: Zone } | null;

export function readDevStart(): DevStart {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get("start");
  if (value !== "interior" && value !== "office") return null;

  return { zone: value };
}

/** Aplica el atajo. Devuelve si efectivamente arrancó en otro ambiente. */
export function applyDevStart(): boolean {
  const devStart = readDevStart();
  if (!devStart) return false;

  const spawn = SPAWNS[devStart.zone];
  if (spawn) teleport(spawn.x, spawn.z, Math.PI);

  const store = useUIStore.getState();
  store.setZone(devStart.zone);
  // También se saltea el preloader: si no, el botón "Entrar" queda tapando una
  // escena en la que ya estamos adentro.
  store.start();

  return true;
}
