import { useUIStore } from "../state/store";

/**
 * La interfaz que se monta sobre el mundo.
 *
 * Es DOM real, no geometría: los formularios necesitan inputs nativos para
 * funcionar bien en móvil, ser accesibles y no reinventar el teclado dentro
 * del canvas. Se comunica con la escena únicamente por el store.
 *
 * En la Fase 3 esto crece a un router de pantallas (proyecto, servicios, lead,
 * contacto, dardos). Por ahora sostiene el prompt de hover, que es lo único
 * que la Fase 0 necesita.
 */
export function UILayer() {
  const hoveredLabel = useUIStore((state) => state.hoveredLabel);

  return (
    // pointer-events-none es crítico: esta capa cubre todo el canvas, y sin
    // eso se come todos los clicks del mundo 3D. Cada elemento que sí deba
    // ser clickeable lo reactiva con pointer-events-auto.
    <div className="pointer-events-none fixed inset-0 z-10">
      {hoveredLabel && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <span className="neon-frame px-4 py-2 text-sm tracking-wide uppercase">
            {hoveredLabel}
          </span>
        </div>
      )}
    </div>
  );
}
