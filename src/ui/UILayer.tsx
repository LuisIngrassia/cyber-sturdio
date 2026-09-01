import { useEffect } from "react";

import { useUIStore } from "../state/store";
import { Preloader } from "./Preloader";

/**
 * La interfaz que se monta sobre el mundo.
 *
 * Es DOM real, no geometría: los formularios necesitan inputs nativos para
 * funcionar bien en móvil, ser accesibles y no reinventar el teclado dentro
 * del canvas. Se comunica con la escena únicamente por el store.
 *
 * En la Fase 3 esto crece a un router de pantallas (proyecto, servicios, lead,
 * contacto, dardos).
 */
export function UILayer() {
  const hoveredId = useUIStore((s) => s.hoveredId);
  const hoveredLabel = useUIStore((s) => s.hoveredLabel);

  /**
   * El cursor del documento sigue al hover del mundo.
   *
   * Va centralizado acá y no en cada objeto interactivo a propósito: si cada
   * uno pone y saca el cursor por su cuenta, alcanza con que uno se desmonte
   * con el puntero encima —al cambiar de ambiente, por ejemplo— para que el
   * cursor quede en "mano" el resto de la sesión. Con una sola fuente de
   * verdad, ese estado no puede existir.
   */
  useEffect(() => {
    document.body.style.cursor = hoveredId ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredId]);

  return (
    // pointer-events-none es crítico: esta capa cubre todo el canvas, y sin
    // eso se come todos los clicks del mundo 3D. Cada elemento que sí deba
    // ser clickeable lo reactiva con pointer-events-auto.
    <div className="pointer-events-none fixed inset-0 z-10">
      <Preloader />

      {hoveredLabel && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <span className="neon-frame text-cyan px-5 py-2 text-xs tracking-[0.2em] uppercase">
            {hoveredLabel}
          </span>
        </div>
      )}
    </div>
  );
}
