import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { PALETTE } from "../lib/palette";
import { useAvatarClips } from "./clips";
import { advance, player } from "./playerState";

/**
 * El visitante: Michelle, de Mixamo.
 *
 * El modelo y las animaciones viven en archivos distintos —Mixamo exporta una
 * animación por descarga— y se unen acá. Ver clips.ts.
 *
 * La caminata y el reposo se mezclan con un fundido cruzado en vez de
 * cambiarse de golpe: el corte seco entre clips es lo que hace que un personaje
 * se vea como un muñeco cambiando de pose.
 */

const MODEL_URL = "/models/michelle.glb";
useGLTF.preload(MODEL_URL);

/** Altura real de la persona, en metros. Define la escala de todo el modelo. */
const TARGET_HEIGHT = 1.70;

/**
 * Qué fracción de la altura total cubre el esqueleto.
 *
 * El hueso más alto está en la base del cráneo, así que quedan afuera la
 * cabeza y el pelo. En un humanoide estándar eso ronda el 88%.
 */
const SKELETON_RATIO = 0.88;

/** Cuánto tarda el cruce entre reposo y caminata. */
const FADE = 0.22;

export function Avatar() {
  const { scene } = useGLTF(MODEL_URL);
  const clips = useAvatarClips();
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, group);

  /**
   * Escala y ajuste de materiales.
   *
   * La altura se mide sobre los huesos y no sobre la malla. En un personaje
   * riggeado, `Box3.setFromObject` devuelve la caja de la geometría en pose de
   * bind multiplicada por la matriz del nodo, y la escala suele vivir en el
   * armature: medido así el número no tiene relación con lo que se ve. Los
   * huesos sí están en el espacio correcto.
   *
   * Calcularlo en vez de fijar una constante es lo que permitió cambiar de
   * personaje —de uno de Quaternius a este— sin tocar una sola cifra.
   */
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);

    const bones = new THREE.Box3();
    const point = new THREE.Vector3();
    let boneCount = 0;

    scene.traverse((node) => {
      if (!(node instanceof THREE.Bone)) return;
      bones.expandByPoint(node.getWorldPosition(point));
      boneCount++;
    });

    const skeletonHeight = boneCount > 0 ? bones.max.y - bones.min.y : 0;
    const scale =
      skeletonHeight > 0 ? (TARGET_HEIGHT * SKELETON_RATIO) / skeletonHeight : 1;

    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      // Sin sombra proyectada: la escena no tiene mapa de sombras y el avatar
      // ya lleva su disco oscuro bajo los pies, que es lo único que hace falta
      // para que no parezca flotando.
      node.castShadow = false;
      // Sin esto, el avatar aparece y desaparece al acercarse a los bordes de
      // la pantalla: three calcula la caja de recorte en pose de bind, que en
      // un personaje animado no cubre dónde terminan realmente sus miembros.
      node.frustumCulled = false;

      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];

      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        // Michelle viene con materiales pensados para luz de estudio. En una
        // escena de neón, un personaje así se ve recortado encima en vez de
        // estar adentro: se apaga el brillo y se baja el peso del entorno.
        material.roughness = 0.85;
        material.metalness = 0;
        material.envMapIntensity = 0.6;
      }
    });

    return { scene, scale };
  }, [scene]);

  /**
   * Qué clip está sonando. Empieza en nulo para que el primer frame lo ponga.
   *
   * La transición se maneja desde el loop y no desde un efecto. Con un efecto,
   * el doble montaje de StrictMode dejaba la acción de reposo detenida —el
   * `fadeOut` de la limpieza pisaba al `play` del montaje siguiente— y el
   * personaje se quedaba en pose de bind, con los brazos en cruz y la malla
   * estirada en púas. Desde el loop el estado se corrige solo en el frame
   * siguiente, sin importar en qué orden React monte y desmonte.
   */
  const current = useRef<"idle" | "walk" | null>(null);

  useFrame((_, delta) => {
    advance(delta);
    if (!group.current) return;

    group.current.position.copy(player.position);

    // El giro se amortigua hacia el rumbo, y por el camino corto: sin
    // normalizar la diferencia al rango [-π, π], cruzar de +170° a -170° hace
    // que el avatar gire 340 grados para el lado largo.
    const diff =
      THREE.MathUtils.euclideanModulo(
        player.facing - group.current.rotation.y + Math.PI,
        Math.PI * 2
      ) - Math.PI;
    group.current.rotation.y += diff * Math.min(1, delta * 10);

    // Caminando es, simplemente, que le quede camino por recorrer.
    const wanted = player.path.length > 0 ? "walk" : "idle";
    if (wanted === current.current) return;

    actions[current.current ?? ""]?.fadeOut(FADE);
    actions[wanted]?.reset().fadeIn(FADE).play();
    current.current = wanted;
  });

  return (
    <group ref={group}>
      <primitive object={model.scene} scale={model.scale} />

      {/**
       * La sombra del avatar, falsa.
       *
       * Una sombra proyectada de verdad obligaría a que el personaje —que es
       * una malla animada— se re-renderice en el mapa de sombras todos los
       * frames. Este disco oscuro debajo de los pies cuesta un draw call y
       * hace lo único que importa: anclar la figura al piso. Sin algo acá
       * abajo, el avatar parece flotar un centímetro sobre el suelo.
       */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 20]} />
        <meshBasicMaterial
          color={PALETTE.void}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
