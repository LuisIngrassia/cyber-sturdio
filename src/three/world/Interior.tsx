import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useControls } from "leva";
import { useMemo } from "react";

import { LightPool } from "../lib/LightPool";
import { concreteMaterial, neonMaterial } from "../lib/materials";
import { PALETTE } from "../lib/palette";
import { preloadKit, WALL_HEIGHT, type KitPieceName } from "./kit";
import { KitInstances, type KitPlacement } from "./KitInstances";

/**
 * El salón del cyber.
 *
 * Diez metros de ancho por doce de fondo, con el frente sobre z = 0 (el mismo
 * muro que se ve desde la calle) y el fondo en z = -12.
 *
 *      x=-5                                    x=5
 *       ┌────────────────────────────────────────┐  z=-12  (fondo: dardos,
 *       │                                        │          puerta STAFF)
 *       │                                        │
 *   PCs │                                        │ barra
 *       │                                        │
 *       └──────────────┬────┬────────────────────┘  z=0  (frente, vitrina)
 *                    puerta
 *
 * Por ahora es solo el casco: piso, muros y la iluminación. El mobiliario
 * entra en las fases 4, 5 y 6 — la idea es que caminar por el lugar vacío ya
 * se sienta bien antes de amueblarlo.
 *
 * No lleva techo. La cámara sigue al avatar desde arriba y atrás, y con un
 * cielorraso a 2,40 no hay lugar para ponerla sin que atraviese el techo en
 * cada paso. Los muros van a dos hiladas (4,80) y arriba queda la oscuridad,
 * que se lee como un techo alto sin iluminar — que es exactamente lo que es un
 * local comercial reciclado de noche.
 */

const PIECES: KitPieceName[] = ["wall", "wall-corner", "floor", "column"];
preloadKit(PIECES);

/** Medidas del salón. Las usa también el área caminable en playerState.ts. */
export const ROOM = {
  minX: -5,
  maxX: 5,
  minZ: -12,
  maxZ: 0,
  /** Dos hiladas de muro del kit. */
  height: WALL_HEIGHT * 2,
} as const;

/** Corre a lo largo de X: los muros del kit nacen orientados sobre Z. */
const ALONG_X_ROT = Math.PI / 2;

/**
 * Todos los muros del salón, en una sola lista.
 *
 * Se calcula una vez a nivel de módulo y no por render: son posiciones fijas.
 * Cada tramo lleva dos hiladas porque las piezas del kit miden 2,4 de alto y
 * el salón va a 4,8.
 */
const WALL_PLACEMENTS: KitPlacement[] = (() => {
  const items: KitPlacement[] = [];
  const courses = [0, WALL_HEIGHT];
  const sideZ = [-1, -3, -5, -7, -9, -11];
  const backX = [-4, -2, 0, 2, 4];

  for (const y of courses) {
    for (const z of sideZ) {
      items.push({ position: [ROOM.minX, y, z] });
      items.push({ position: [ROOM.maxX, y, z] });
    }
    for (const x of backX) {
      items.push({ position: [x, y, ROOM.minZ], rotationY: ALONG_X_ROT });
    }
    // Muro del frente, solo el tramo de la derecha: a la izquierda está la
    // vitrina y en el medio la puerta, que ya los pone la fachada. Es la misma
    // pared vista desde adentro — el local es un único volumen, y por eso el
    // vuelo de cámara puede atravesarlo sin corte.
    items.push({ position: [4, y, 0], rotationY: ALONG_X_ROT });
  }

  return items;
})();

export function Interior() {
  const { ambient, bounce, neon } = useControls(
    "interior",
    {
      /**
       * Estos valores subieron al apagar las luces de la fachada.
       *
       * Mientras los dos ambientes estaban encendidos a la vez, buena parte de
       * lo que iluminaba el salón venía de la calle. Al apagarlas —que es lo
       * correcto: nadie mira la vereda desde adentro— el salón se quedó sin luz
       * propia y quedó casi negro. La lección es que un ambiente tiene que
       * iluminarse solo, sin depender de que el de al lado esté prendido.
       */
      ambient: { value: 0.14, min: 0, max: 1, step: 0.01 },
      bounce: { value: 1.5, min: 0, max: 3, step: 0.05 },
      neon: { value: 2.2, min: 0, max: 6, step: 0.1 },
    },
    { collapsed: true }
  );

  // Más claro que el hormigón de la calle: adentro hay luz y el piso tiene que
  // devolver algo, o el salón se lee como un pozo.
  const floorMaterial = useMemo(() => concreteMaterial("#332b40"), []);

  // Los tubos del techo, alternando frío y cálido a lo largo del salón.
  const tubes = useMemo(
    () =>
      [-2, -5, -8, -11].map((z, i) => ({
        z,
        color: i % 2 === 0 ? PALETTE.cyan : PALETTE.magenta,
        // Uno de cada dos ilumina de verdad; los otros son solo emisivos.
        lit: i % 2 === 0,
      })),
    []
  );

  const tubeMaterials = useMemo(
    () => ({
      [PALETTE.cyan]: neonMaterial(PALETTE.cyan, neon),
      [PALETTE.magenta]: neonMaterial(PALETTE.magenta, neon),
    }),
    [neon]
  );

  return (
    <group>
      <ambientLight intensity={ambient} />

      <Environment resolution={64} frames={1}>
        <color attach="background" args={[PALETTE.void]} />
        <Lightformer
          intensity={2}
          color={PALETTE.cyan}
          position={[-6, 3, -6]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[12, 5, 1]}
        />
        <Lightformer
          intensity={2}
          color={PALETTE.magenta}
          position={[6, 3, -6]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[12, 5, 1]}
        />
        {/* El cálido de la barra, que en la Fase 5 va contra este muro. */}
        <Lightformer
          intensity={1.6}
          color={PALETTE.amber}
          position={[4, 2, -3]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[6, 3, 1]}
        />
      </Environment>

      <hemisphereLight
        intensity={bounce}
        color={PALETTE.cyan}
        groundColor={PALETTE.magenta}
      />

      {/* Piso */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, (ROOM.minZ + ROOM.maxZ) / 2]}
        receiveShadow
        material={floorMaterial}
      >
        <planeGeometry args={[ROOM.maxX - ROOM.minX, ROOM.maxZ - ROOM.minZ]} />
      </mesh>

      {/**
       * Los treinta y ocho muros, en una sola llamada de dibujo.
       *
       * Son todos la misma pieza movida de lugar, así que van instanciados.
       * Ver KitInstances.
       */}
      <KitInstances name="wall" items={WALL_PLACEMENTS} />

      {/**
       * Tubos de neón del techo, a 3 m.
       *
       * Los cuatro tubos se dibujan, pero solo dos llevan luz real. Una luz
       * puntual no cuesta lo que ilumina: cuesta una iteración más en el
       * shader de cada píxel de cada material de la escena, así que cuatro
       * cuestan el doble que dos aunque la mitad quede fuera de cuadro. El
       * resto lo aportan el material emisivo —que el bloom convierte en
       * resplandor— y el charco de luz sobre el piso, que son gratis.
       */}
      {tubes.map(({ z, color, lit }) => (
        <group key={z}>
          <mesh
            position={[0, 3, z]}
            rotation={[0, 0, Math.PI / 2]}
            material={tubeMaterials[color]}
          >
            <capsuleGeometry args={[0.05, 7, 4, 10]} />
          </mesh>
          {lit && (
            <pointLight
              position={[0, 2.9, z]}
              color={color}
              intensity={34}
              distance={16}
              decay={2}
            />
          )}
          <LightPool position={[0, 0.02, z]} size={8} color={color} opacity={0.32} />
        </group>
      ))}

      {/* Una sola vez: el salón es estático. Ver el comentario en Facade. */}
      <ContactShadows
        frames={1}
        position={[0, 0.02, (ROOM.minZ + ROOM.maxZ) / 2]}
        opacity={0.55}
        scale={26}
        blur={2.4}
        far={5}
        resolution={512}
        color="#000000"
      />
    </group>
  );
}
