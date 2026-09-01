import type { ThreeEvent } from "@react-three/fiber";

import { useUIStore, useWorldInteractive } from "../../state/store";

/**
 * Envuelve un objeto del mundo y lo vuelve interactivo.
 *
 * Es el vocabulario de interacción de todo el proyecto: cada computadora, la
 * barra, la puerta de staff y el tablero de dardos se declaran con esto. La
 * Fase 3 le agrega el contorno emisivo y el vuelo de cámara; la forma del
 * componente ya está pensada para eso.
 *
 * No guarda estado de hover propio: lo escribe en el store y listo. Los
 * objetos que quieran encenderse al ser apuntados consultan
 * `useUIStore.getState().hoveredId` dentro de su `useFrame`. Es a propósito —
 * si el hover fuera estado de React, pasar el puntero por una fila de seis
 * computadoras dispararía un re-render por cada una, cuando lo único que hace
 * falta es que un material cambie de intensidad en el próximo frame.
 *
 * Dos cosas más que resuelve y son fáciles de pasar por alto:
 *
 *   1. Respeta `useWorldInteractive`. Con un modal abierto el mundo no
 *      escucha: si no, el visitante clickea "a través" del panel y dispara
 *      cosas que no ve.
 *   2. Corta la propagación. Los objetos se superponen en profundidad y three
 *      reporta todos los que el rayo atraviesa, así que sin esto un click
 *      activa también lo que está detrás.
 */

export type InteractableProps = {
  /** Identifica al objeto. Los materiales lo comparan para saber si se encienden. */
  id: string;
  /** Lo que se muestra en el prompt al pasar por encima. */
  label: string;
  onActivate?: () => void;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"group">, "ref" | "children" | "id">;

export function Interactable({
  id,
  label,
  onActivate,
  children,
  ...props
}: InteractableProps) {
  const interactive = useWorldInteractive();
  const setHovered = useUIStore((s) => s.setHovered);

  const enter = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    setHovered(id, label);
  };

  const leave = () => {
    // Sin comparar el id, salir de un objeto borraría el hover de otro que ya
    // lo tomó: al pasar de una computadora a la de al lado, los eventos llegan
    // en el orden "entra la nueva, sale la vieja".
    if (useUIStore.getState().hoveredId === id) setHovered(null);
  };

  const click = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    onActivate?.();
  };

  return (
    <group {...props} onPointerOver={enter} onPointerOut={leave} onClick={click}>
      {children}
    </group>
  );
}
