import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Carga un mueble y lo deja listo para instanciar.
 *
 * Hace tres cosas que todos los props importados necesitan y que ninguno trae
 * resuelto:
 *
 * **Normaliza la escala.** Cada modelo viene en las unidades de quien lo hizo.
 * `Table.glb` mide 2,2 × 4 × 5,6 y tiene su base en `y = -2`; puesto tal cual
 * en un salón de 1 unidad = 1 metro, es un escritorio de cuatro metros de alto
 * enterrado hasta la mitad. Se mide al cargar y se escala a una medida real, en
 * vez de cablear un número: es lo mismo que hace `Avatar.tsx` con el personaje,
 * y es lo que permitió cambiar de Quaternius a Michelle sin tocar una cifra.
 *
 * **Lo apoya en el piso y lo centra.** Después de normalizar, el origen del
 * objeto queda en el centro de su base, que es de donde uno quiere agarrarlo
 * para colocarlo.
 *
 * **Hornea las transformaciones de los nodos en la geometría.** Esto es lo que
 * lo vuelve instanciable: un `InstancedMesh` aplica una matriz por copia y
 * pierde la jerarquía interna del modelo, así que las dos mallas del escritorio
 * —tapa y patas, cada una con su transformación— se apilarían en el origen. Con
 * la matriz ya aplicada a los vértices, cada malla queda en su sitio y la
 * matriz de instancia solo tiene que decir dónde va el conjunto.
 *
 * A diferencia del avatar, acá `Box3.setFromObject` sí sirve: el problema de la
 * pose de bind era exclusivo de las mallas riggeadas.
 */

export type PropPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Nombre del material de origen, para poder encontrar una pieza concreta. */
  name: string;
};

export type PropOptions = {
  /** Altura real del objeto, en metros. Define la escala. */
  height: number;
  /** Tinte y acabado, para que no se vea recortado sobre la escena de neón. */
  tint?: {
    color?: string;
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
    /**
     * Materiales que conservan su color original.
     *
     * Hace falta para las piezas cuyo color es funcional y no decorativo: el
     * vidrio del monitor es negro a propósito, y teñirlo del gris del plástico
     * lo convierte en una placa opaca que tapa la pantalla que tiene detrás.
     */
    except?: string[];
  };
  /** Solo estos nodos raíz. Para usar parte de un modelo. */
  only?: string[];
  /**
   * Usar la normalización de otro modelo en vez de la propia.
   *
   * Hace falta cuando dos archivos son partes de una misma escena original: la
   * utilería del escritorio se exportó aparte para no repetirla seis veces,
   * pero sus posiciones están expresadas en las coordenadas del escritorio.
   * Normalizada por su cuenta, la pila de libros se escalaría según su propia
   * altura y aterrizaría en el piso en el centro del mueble.
   */
  alignTo?: string;
};

const DEFAULT_TINT = {
  roughness: 0.8,
  metalness: 0,
  /**
   * Peso del entorno, bajo a propósito.
   *
   * Los modelos vienen con materiales calibrados para luz de estudio. En una
   * escena que se ilumina casi solo con emisivos y un cubemap de colores, un
   * material así refleja de más y el objeto se ve pegado encima de la escena en
   * vez de adentro.
   */
  envMapIntensity: 0.5,
};

/**
 * Le inventa coordenadas de textura a un cuadrilátero plano.
 *
 * La pantalla del monitor no trae UVs: en el modelo original es una superficie
 * de color liso y nunca las necesitó. Como es plana, se pueden deducir
 * proyectando dos de sus coordenadas sobre su propia caja.
 *
 * Qué eje va a lo ancho y cuál a lo alto se pasa explícito. Deducirlo de la
 * normal parece más cómodo pero deja la elección al azar, y con los ejes al
 * revés el texto sale escrito en vertical.
 *
 * Es lo que permite pintar la captura de cada proyecto sobre la geometría real
 * del CRT en vez de flotarle un plano por delante: encaja exacta con el marco,
 * incluidas las esquinas redondeadas del tubo, sin ningún número a ojo.
 */
export function planarUVs(
  geometry: THREE.BufferGeometry,
  /** Qué eje del mundo corre a lo ancho de la imagen. */
  u: 0 | 1 | 2,
  /** Cuál a lo alto. */
  v: 0 | 1 | 2,
  /** Espeja el eje horizontal, para cuando la cara mira al otro lado. */
  flipU = false
) {
  const position = geometry.getAttribute("position");
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;

  const min = box.min.toArray();
  const max = box.max.toArray();
  const span = (a: number) => Math.max(1e-6, max[a] - min[a]);

  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const p = [position.getX(i), position.getY(i), position.getZ(i)];
    const s = (p[u] - min[u]) / span(u);
    uvs[i * 2] = flipU ? 1 - s : s;
    uvs[i * 2 + 1] = (p[v] - min[v]) / span(v);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

export function useProp(url: string, options: PropOptions): PropPart[] {
  const { scene } = useGLTF(url);
  const { height, only, alignTo } = options;
  // El hook se llama siempre, con el propio modelo cuando no hay referencia:
  // las reglas de hooks no permiten llamarlo condicionalmente.
  const reference = useGLTF(alignTo ?? url).scene;
  const tint = { ...DEFAULT_TINT, ...options.tint };

  return useMemo(() => {
    const model = scene.clone(true);
    model.updateMatrixWorld(true);

    if (only) {
      for (const child of [...model.children]) {
        if (!only.includes(child.name)) model.remove(child);
      }
      model.updateMatrixWorld(true);
    }

    // La caja que define la escala es la del modelo de referencia, que salvo
    // que se pida otra cosa es el propio.
    reference.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(reference);
    const size = box.getSize(new THREE.Vector3());
    const scale = size.y > 0 ? height / size.y : 1;

    // Después de escalar: centrado en X y Z, y apoyado en y = 0.
    const center = box.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    const normalize = new THREE.Matrix4()
      .makeTranslation(offset.x, offset.y, offset.z)
      .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));

    const parts: PropPart[] = [];

    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geometry = node.geometry.clone();
      // Primero la posición de la malla dentro del modelo, después la
      // normalización del conjunto. En ese orden: la matriz del nodo está
      // expresada en el espacio original.
      geometry.applyMatrix4(node.matrixWorld);
      geometry.applyMatrix4(normalize);
      geometry.computeBoundingSphere();

      const source = node.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      const keepColor = tint.except?.includes(source.name ?? "");
      if (tint.color && !keepColor) material.color = new THREE.Color(tint.color);
      material.roughness = tint.roughness;
      material.metalness = tint.metalness;
      material.envMapIntensity = tint.envMapIntensity;

      parts.push({ geometry, material, name: source.name ?? "" });
    });

    return parts;
  }, [
    scene,
    reference,
    height,
    only,
    tint.color,
    tint.except,
    tint.roughness,
    tint.metalness,
    tint.envMapIntensity,
  ]);
}
