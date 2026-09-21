import { useKitGeometry, type KitPieceName, type KitTint } from "./kit";
import { Instanced, type Placement } from "./Instanced";

/**
 * Muchas copias de una pieza del kit, en una sola llamada de dibujo.
 *
 * Sirve para piezas de una sola malla, que es el caso de los muros lisos, los
 * pisos y las columnas. Las que traen vidrio tienen dos materiales y siguen
 * yendo por `KitPiece`; son pocas y no se repiten.
 */

export type KitPlacement = Placement;

export type KitInstancesProps = {
  name: KitPieceName;
  items: KitPlacement[];
  tint?: KitTint;
};

export function KitInstances({ name, items, tint }: KitInstancesProps) {
  const { geometry, material } = useKitGeometry(name, tint);

  if (!geometry || !material) return null;

  return <Instanced parts={[{ geometry, material }]} items={items} />;
}
