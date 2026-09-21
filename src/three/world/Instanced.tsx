import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Muchas copias del mismo objeto, en una llamada de dibujo por sub-malla.
 *
 * El salón tiene treinta y ocho muros idénticos y va a tener seis puestos de
 * computadora iguales. Puestos como objetos sueltos son una llamada de dibujo,
 * una matriz recalculada por frame y un cambio de estado en la GPU por cada
 * uno — para dibujar la misma forma movida de lugar. Con mallas instanciadas la
 * geometría y el material viajan una vez y lo único que cambia por copia es una
 * matriz.
 *
 * Un objeto compuesto —el escritorio son dos mallas, el monitor cuatro— da una
 * malla instanciada por sub-malla. Seis puestos completos son diez llamadas en
 * vez de sesenta.
 *
 * Las geometrías tienen que llegar con las transformaciones internas del modelo
 * ya aplicadas a sus vértices, porque acá cada copia recibe una sola matriz y
 * no hay jerarquía que preservar. De eso se encarga `useProp`.
 */

export type Placement = {
  position: [number, number, number];
  /** Rotación en Y, en radianes. Es la única que usan los muebles del salón. */
  rotationY?: number;
};

export type InstancedPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};

export type InstancedProps = {
  parts: InstancedPart[];
  items: Placement[];
};

function InstancedPartMesh({
  part,
  items,
}: {
  part: InstancedPart;
  items: Placement[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  // Un único auxiliar para componer las matrices, en vez de uno por instancia:
  // solo se usa para escribir y su valor no se conserva.
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
    // Sin esto three conserva la esfera de la geometría original y descarta
    // todas las instancias en cuanto la de referencia sale de cuadro: los
    // muebles del fondo desaparecerían al girar la cámara.
    mesh.computeBoundingSphere();
  }, [items, dummy]);

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, items.length]}
      frustumCulled={false}
    />
  );
}

export function Instanced({ parts, items }: InstancedProps) {
  if (items.length === 0) return null;

  return (
    <>
      {parts.map((part, i) => (
        <InstancedPartMesh key={i} part={part} items={items} />
      ))}
    </>
  );
}
