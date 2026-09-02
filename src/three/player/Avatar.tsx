import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { PALETTE } from "../lib/palette";
import { advance, player } from "./playerState";

/**
 * El visitante.
 *
 * Personaje CC0 de Quaternius, con once clips ya incluidos — de los que acá se
 * usan dos. La caminata y el reposo se mezclan con un fundido cruzado en vez
 * de cambiarse de golpe: el corte seco entre clips es lo que hace que un
 * personaje se vea como un muñeco cambiando de pose.
 *
 * Los nombres de los clips vienen del FBX original con el prefijo del armature
 * (`HumanArmature|Man_Walk`), así que se buscan por sufijo y no por igualdad:
 * si algún día se cambia de modelo, el prefijo cambia y el sufijo no.
 */

const MODEL_URL = "/models/avatar.glb";
useGLTF.preload(MODEL_URL);

/** Altura real de la persona, en metros. Define la escala de todo el modelo. */
const TARGET_HEIGHT = 1.75;

/**
 * Qué fracción de la altura total cubre el esqueleto.
 *
 * El hueso más alto está en la base del cráneo, así que quedan afuera la
 * cabeza y el pelo. En un humanoide estándar eso ronda el 88%.
 */
const SKELETON_RATIO = 0.88;

/** Cuánto tarda el cruce entre reposo y caminata. */
const FADE = 0.22;

/**
 * El frente del modelo coincide con la convención de `player.facing`.
 *
 * `facing` sale de `atan2(dx, dz)`, que da el ángulo correcto para un modelo
 * cuyo frente local apunta a +Z, y este lo cumple. No hace falta corregir
 * nada; si algún día se cambia de personaje y camina de espaldas, sumar π acá
 * es el arreglo.
 */

function findClip(names: string[], suffix: string) {
  return names.find((n) => n.endsWith(suffix));
}

export function Avatar() {
  const { scene, animations } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, group);
  const walking = useRef(false);

  /**
   * Escala y repintado.
   *
   * El modelo viene con el armature en escala 100 y con materiales por nombre
   * (Shirt, Skin, Pants...), sin ninguna textura. Se mide la caja real después
   * de cargarlo —en una malla riggeada el bbox del accessor está en pose de
   * bind y no sirve— y se normaliza a la altura objetivo. Así el avatar mide
   * lo mismo aunque mañana se cambie el personaje por otro.
   */
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);

    /**
     * La altura se mide sobre los huesos, no sobre la malla.
     *
     * En un personaje riggeado, `Box3.setFromObject` devuelve la caja de la
     * geometría en pose de bind multiplicada por la matriz del nodo — y en
     * este modelo la escala vive en el armature (×100), no en la malla. Medido
     * así da nueve milímetros y el avatar termina doscientas veces más grande
     * que el edificio. Los huesos sí están en el espacio correcto.
     *
     * Del hueso más bajo al más alto va del pie a la base del cráneo, que es
     * algo menos que la altura de la persona: de ahí el factor de corrección.
     */
    const bones = new THREE.Box3();
    const point = new THREE.Vector3();
    let boneCount = 0;

    scene.traverse((node) => {
      if (!(node instanceof THREE.Bone)) return;
      bones.expandByPoint(node.getWorldPosition(point));
      boneCount++;
    });

    // Para este modelo da 4,2324 y una escala de 0,3639. Se calcula en vez de
    // fijarse para que cambiar de personaje no requiera volver a medir a mano.
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
        // Se baja el brillo y se suben un poco los oscuros. En una escena de
        // neón, un personaje con materiales de estudio se ve recortado encima
        // en vez de estar adentro.
        material.roughness = 0.85;
        material.metalness = 0;
        material.envMapIntensity = 0.6;
      }
    });

    return { scene, scale };
  }, [scene]);

  // Arranca en reposo.
  useEffect(() => {
    const idle = findClip(names, "Idle");
    if (idle) actions[idle]?.reset().fadeIn(FADE).play();

    return () => {
      for (const name of names) actions[name]?.fadeOut(FADE);
    };
  }, [actions, names]);

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
    const isWalking = player.path.length > 0;

    if (isWalking !== walking.current) {
      walking.current = isWalking;
      const from = findClip(names, isWalking ? "Idle" : "Walk");
      const to = findClip(names, isWalking ? "Walk" : "Idle");
      if (from) actions[from]?.fadeOut(FADE);
      if (to) actions[to]?.reset().fadeIn(FADE).play();
    }
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
        <circleGeometry args={[0.34, 20]} />
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
