import { create } from "zustand";

/**
 * El puente entre el mundo 3D y la interfaz DOM.
 *
 * Con react-three-fiber el canvas y el DOM son dos árboles de React separados
 * que no comparten contexto: un provider montado afuera no se ve adentro del
 * <Canvas>. Un store externo es la forma estándar de comunicarlos.
 *
 * Las dos reglas de esta arquitectura:
 *
 *   1. El mundo 3D nunca renderiza formularios; la interfaz nunca toca objetos
 *      de three. Todo pasa por acá.
 *   2. Con una pantalla abierta se apaga la interacción del mundo. Si no, el
 *      visitante clickea "a través" del modal y el avatar sale caminando a un
 *      lugar que no eligió.
 */

/** Las pantallas de interfaz que se pueden montar sobre el mundo. */
export type ScreenId =
  | "project"
  | "services"
  | "lead"
  | "contact"
  | "darts"
  | "leaderboard";

/** En qué ambiente está el visitante. Define qué props hay que tener cargados. */
export type Zone = "facade" | "interior" | "office";

type UIState = {
  /** Pantalla activa, o null si el visitante está explorando el mundo. */
  screen: ScreenId | null;
  /** Datos de la pantalla activa (por ejemplo, qué proyecto mostrar). */
  screenPayload: unknown;
  /**
   * Qué objeto tiene el puntero encima.
   *
   * El `id` va aparte de la etiqueta porque los objetos del mundo lo consultan
   * para saber si son ellos los apuntados —y encenderse— y dos cosas distintas
   * pueden compartir texto ("Ver proyecto" en seis computadoras).
   */
  hoveredId: string | null;
  /** Etiqueta del objeto bajo el cursor, para el prompt flotante. */
  hoveredLabel: string | null;
  zone: Zone;
  /** El preloader terminó y el visitante ya apretó "entrar". */
  started: boolean;

  openScreen: (screen: ScreenId, payload?: unknown) => void;
  closeScreen: () => void;
  setHovered: (id: string | null, label?: string | null) => void;
  setZone: (zone: Zone) => void;
  start: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  screen: null,
  screenPayload: null,
  hoveredId: null,
  hoveredLabel: null,
  zone: "facade",
  started: false,

  openScreen: (screen, payload = null) =>
    // Al abrir una pantalla se limpia el hover: el cursor queda sobre el modal
    // y el mundo nunca recibe el evento de salida, así que el prompt del objeto
    // se quedaría colgado en pantalla para siempre.
    set({ screen, screenPayload: payload, hoveredId: null, hoveredLabel: null }),

  closeScreen: () => set({ screen: null, screenPayload: null }),

  setHovered: (hoveredId, hoveredLabel = null) =>
    set({ hoveredId, hoveredLabel }),
  setZone: (zone) => set({ zone }),
  start: () => set({ started: true }),
}));

/**
 * Si el mundo 3D debe responder a clicks y hover.
 *
 * Selector aparte para que los componentes de la escena se re-rendericen solo
 * cuando cambia este booleano, y no ante cualquier cambio del store.
 */
export const useWorldInteractive = () =>
  useUIStore((state) => state.screen === null && state.started);

/**
 * Igual que el anterior pero sin suscripción, para leer desde el loop de
 * render. Un `useFrame` que dependiera del hook re-renderizaría el componente
 * en cada cambio; acá solo se consulta el valor del momento.
 */
export const worldIsInteractive = () => {
  const { screen, started } = useUIStore.getState();
  return screen === null && started;
};
