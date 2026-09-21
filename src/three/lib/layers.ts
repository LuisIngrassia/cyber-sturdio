/**
 * Las alturas de todo lo que se apoya sobre el piso.
 *
 * Existe porque el salón titilaba. Las sombras de contacto y los charcos de luz
 * habían quedado los dos en `y = 0.02`: exactamente el mismo plano. Los charcos
 * no escriben profundidad pero sí la testean, y contra una superficie a la
 * misma distancia cada píxel pasa o falla el test según el error de redondeo
 * del frame. El resultado es un patrón que cambia al moverse la cámara.
 *
 * El problema de fondo no era el número sino que cada componente elegía su `y`
 * por su cuenta, sin forma de saber qué había puesto otro. Con una sola tabla
 * los choques son imposibles, y agregar una capa nueva obliga a mirar dónde
 * entra.
 *
 * `renderOrder` acompaña al orden vertical: como todas estas capas son
 * transparentes y no escriben profundidad, el orden de dibujo es lo que
 * decide cuál queda encima.
 */
export const FLOOR_LAYERS = {
  /** El piso propiamente dicho. */
  floor: { y: 0, order: 0 },
  /** El plano invisible que recibe los clicks para caminar. */
  clickPlane: { y: 0.004, order: 0 },
  /** La sombra difusa del local, calculada una vez. */
  contactShadow: { y: 0.008, order: 1 },
  /** Los charcos de color bajo cada neón. */
  lightPool: { y: 0.016, order: 2 },
  /** El disco oscuro bajo los pies del avatar. */
  avatarShadow: { y: 0.024, order: 3 },
  /** El anillo que confirma a dónde se mandó a caminar. */
  clickMarker: { y: 0.032, order: 4 },
  /** La ayuda que marca el umbral de la puerta. */
  hint: { y: 0.04, order: 5 },
} as const;

export type FloorLayer = keyof typeof FLOOR_LAYERS;
