import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useKitGeometry, type KitPieceName, type KitTint } from "./kit";

/**
 * Muchas copias de la misma pieza, en una sola llamada de dibujo.
 *
 * El salón tiene treinta y seis muros idénticos. Puestos como objetos sueltos
 * son treinta y seis llamadas de dibujo, treinta y seis matrices que la CPU
 * recalcula por frame y treinta y seis cambios de estado en la GPU — para
 * dibujar el mismo cubo movido de lugar. Con una malla instanciada la
 * geometría y el material viajan una vez y lo único que cambia por copia es
 * una matriz.
 *
 * Sirve para piezas de una sola malla, que es el caso de los muros lisos, los
 * pisos y las columnas. Las que traen vidrio tienen dos materiales y siguen
 * yendo por `KitPiece`; son pocas y no se repiten.
 */

export type KitPlacement = {
  position: [number, number, number];
  /** Rotación en Y, en radianes. Es la única que usan las piezas del kit. */
  rotationY?: number;
};

export type KitInstancesProps = {
  name: KitPieceName;
  items: KitPlacement[];
  tint?: KitTint;
};

export function KitInstances({ name, items, tint }: KitInstancesProps) {
  const { geometry, material } = useKitGeometry(name, tint);
  const ref = useRef<THREE.InstancedMesh>(null);

  // Un único objeto auxiliar para componer las matrices, en vez de uno por
  // instancia: solo se usa para escribir y su valor no se conserva.
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    items.forEach((item, i) => {
      dummy.position.set(...item.position);
      dummy.rotation.set(0, item.rotationY ?? 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    // Sin esto three conserva la caja de la geometría original y descarta
    // todas las instancias en cuanto la de referencia sale de cuadro: los
    // muros del fondo desaparecerían al girar la cámara.
    mesh.computeBoundingSphere();
  }, [items, dummy]);

  if (!geometry || !material) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      frustumCulled={false}
    />
  );
}
