import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useControls } from "leva";
import { useMemo } from "react";
import * as THREE from "three";

import { LightPool } from "../lib/LightPool";
import { concreteMaterial, neonMaterial } from "../lib/materials";
import { PALETTE } from "../lib/palette";
import { Doorway } from "./Doorway";
import { preloadKit, WALL_HEIGHT, type KitPieceName } from "./kit";
import { KitPiece } from "./KitPiece";
import { NeonSign } from "./NeonSign";

/**
 * La fachada del cyber, de noche.
 *
 * El local ocupa cinco módulos de la grilla del kit (2 m cada uno), de x=-5 a
 * x=+5, con el frente sobre z=0 mirando hacia +Z (donde está la cámara).
 *
 * Los muros del kit vienen con el ancho sobre Z y el espesor sobre X, así que
 * los del frente van rotados 90° en Y para que el ancho caiga sobre X. Los
 * laterales, que sí corren en profundidad, van sin rotar.
 *
 *      x=-5    -3         1     3     5
 *       │       │         │     │     │
 *       ├─muro──┼─vitrina─┼puerta┼vent┤   ← frente, z=0
 *       │                             │
 *    lateral                       lateral  ← corren hacia -Z
 */

/** Todo lo que usa esta escena, para pedirlo junto al arrancar. */
const PIECES: KitPieceName[] = [
  "wall",
  "wall-window-wide-square-detailed",
  "wall-doorway-square",
  "wall-window-square-detailed",
  "border-high",
  "column",
  "detail-pipe",
  "gutter-vertical",
  "plating-detailed",
];

preloadKit(PIECES);

/** Rotación para que un muro del kit corra sobre X en vez de sobre Z. */
const FACING_CAMERA: [number, number, number] = [0, Math.PI / 2, 0];

/**
 * El toldo sobre la entrada.
 *
 * El kit no trae ninguno y en la referencia es media identidad del local, así
 * que va hecho a mano: una tapa inclinada más un frente vertical.
 *
 * Cubre solo el tramo de la puerta y la vitrina, no la fachada entera. Un
 * toldo de lado a lado se lee como una repisa y aplana el frente; acotado,
 * marca dónde se entra — que es la única función que tiene acá.
 *
 * La inclinación es positiva sobre X para que el borde delantero baje. Con el
 * signo invertido el toldo sube hacia la calle, queda como una rampa y, peor,
 * se le trepa por delante al cartel.
 */
function Awning({
  position,
  width = 4.4,
  active = true,
}: {
  position: [number, number, number];
  width?: number;
  active?: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE.purple),
        roughness: 0.6,
        metalness: 0,
      }),
    []
  );

  return (
    <group position={position}>
      <mesh
        rotation={[Math.PI / 9, 0, 0]}
        position={[0, 0, 0.5]}
        material={material}
      >
        <boxGeometry args={[width, 0.07, 1.3]} />
      </mesh>
      {/* Faldón delantero, colgando del borde bajo. */}
      <mesh position={[0, -0.36, 1.11]} material={material}>
        <boxGeometry args={[width, 0.3, 0.07]} />
      </mesh>

      {/**
       * La luz de abajo del toldo. Es la que hace que la entrada se lea como
       * un lugar al que se entra y no como un hueco: sin algo cálido acá, la
       * puerta es el punto más oscuro de toda la fachada.
       */}
      {active && (
        <pointLight
          position={[0, -0.5, 0.6]}
          color={PALETTE.amber}
          intensity={9}
          distance={6}
          decay={2}
        />
      )}
    </group>
  );
}

/**
 * El cartel vertical que sobresale del frente.
 *
 * En la referencia es lo que primero se ve, y cumple una función concreta:
 * despega el local del plano de la fachada y le da silueta contra el vacío. Un
 * frente completamente plano se lee como un telón pintado.
 */
function BladeSign({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const body = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0d0a12"),
        roughness: 0.85,
        metalness: 0,
      }),
    []
  );

  return (
    <group position={position}>
      {/**
       * La caja mira al frente, no de canto.
       *
       * Un cartel de banderola de verdad va perpendicular a la pared para que
       * lo vea el que camina por la vereda, pero acá la cámara está de frente
       * y solo orbita un arco corto: puesto así se vería siempre como una
       * línea de 16 cm. Sobresale hacia adelante lo justo para tener sombra
       * propia y despegarse del muro.
       */}
      <mesh material={body}>
        <boxGeometry args={[0.78, 2.7, 0.22]} />
      </mesh>
      <NeonSign
        text={"C\nY\nB\nE\nR"}
        color={color}
        position={[0, 0, 0.14]}
        size={0.34}
        lineHeight={1.05}
        backing={false}
        flicker={0.5}
      />
    </group>
  );
}

/**
 * Lo que se ve por la vitrina, desde afuera.
 *
 * Es utilería pintada: una pared de fondo, tres pantallas encendidas y unas
 * siluetas de escritorio, puestas para que desde la vereda se entrevea que
 * adentro hay algo prendido. Sin eso el local se lee vacío y no hay motivo
 * para entrar.
 *
 * **Solo existe cuando el visitante está afuera.** Es un decorado a dos metros
 * y medio de la vitrina, o sea justo en el medio del salón de verdad: dejarlo
 * montado al entrar pone una pared de ocho metros delante de la cámara y tapa
 * el local entero. Es el precio de haber falseado un interior antes de que
 * existiera, y se paga desmontándolo cuando el real toma su lugar.
 */
function InteriorGlow() {
  const screen = useMemo(() => neonMaterial(PALETTE.cyan, 1.6), []);
  const backdrop = useMemo(
    () => concreteMaterial(PALETTE.concrete),
    []
  );

  return (
    <group>
      {/* Fondo, para que el interior no sea el vacío negro visto por la ventana. */}
      <mesh position={[-1, 1.2, -3.2]} material={backdrop}>
        <boxGeometry args={[8, 2.4, 0.2]} />
      </mesh>

      {/**
       * Los monitores encendidos. Van más grandes y más altos de lo que serían
       * en la realidad: se ven a través de un vidrio oscuro y desde la vereda,
       * y a tamaño real desde acá afuera no se leen como nada.
       */}
      {[-2.6, -1.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 1.45, -2.6]} material={screen}>
          <planeGeometry args={[0.95, 0.62]} />
        </mesh>
      ))}

      {/* Los escritorios, como siluetas contra las pantallas. */}
      {[-2.6, -1.2, 0.2].map((x) => (
        <mesh key={`esc${x}`} position={[x, 0.5, -2.5]} material={backdrop}>
          <boxGeometry args={[1.1, 1, 0.6]} />
        </mesh>
      ))}

      {/**
       * El cálido de adentro, contra el frío de la calle. Una sola luz: la
       * segunda que había cerca del vidrio agregaba muy poco a cambio de otra
       * iteración por píxel en todos los materiales.
       */}
      <pointLight
        position={[-1, 1.8, -1.4]}
        color={PALETTE.amber}
        intensity={26}
        distance={11}
        decay={2}
      />
    </group>
  );
}

export type FacadeProps = {
  /** Se dispara al activar la puerta. La Fase 2 engancha acá el vuelo adentro. */
  onEnter: () => void;
  /**
   * Si la fachada está iluminando la escena.
   *
   * La geometría queda montada siempre —es el mismo muro que se ve desde
   * adentro, y desmontarlo abriría el salón al vacío— pero sus luces y su
   * entorno se apagan al entrar. Sin esto, estando adentro se pagan las luces
   * de los dos ambientes a la vez: cada luz puntual encarece *todos* los
   * píxeles de la escena, no solo los que ilumina, así que sumar las de la
   * calle a las del salón duplica el costo del render para alumbrar una
   * vereda que quedó a espaldas de la cámara.
   */
  active?: boolean;
};

export function Facade({ onEnter, active = true }: FacadeProps) {
  const { ambient, bounce, streetLight } = useControls(
    "fachada",
    {
      ambient: { value: 0.06, min: 0, max: 1, step: 0.01 },
      bounce: { value: 0.9, min: 0, max: 3, step: 0.05 },
      streetLight: { value: 0.5, min: 0, max: 3, step: 0.05 },
    },
    { collapsed: true }
  );

  const asphalt = useMemo(() => concreteMaterial("#1a1620"), []);

  return (
    <group>
      {active && <ambientLight intensity={ambient} />}

      {/**
       * El entorno. Además de dar reflejos, es lo que le pone color y dirección
       * a las caras que ninguna luz alcanza: sin esto los frentes que miran a
       * cámara quedan negros, porque todo lo demás viene de arriba o de atrás.
       */}
      {active && (
      <Environment resolution={64} frames={1}>
        <color attach="background" args={[PALETTE.void]} />
        <Lightformer
          intensity={2.5}
          color={PALETTE.magenta}
          position={[-8, 4, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[10, 5, 1]}
        />
        <Lightformer
          intensity={2.5}
          color={PALETTE.cyan}
          position={[8, 4, 2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[10, 5, 1]}
        />
        <Lightformer
          intensity={1.4}
          color={PALETTE.purple}
          position={[0, 3, 12]}
          rotation={[0, Math.PI, 0]}
          scale={[16, 6, 1]}
        />
      </Environment>
      )}

      {active && (
        <hemisphereLight
          intensity={bounce}
          color={PALETTE.cyan}
          groundColor={PALETTE.magenta}
        />
      )}

      {/* La luz de la calle, fría y de arriba. Define de dónde caen las sombras. */}
      {/**
       * Sin `castShadow`. Proyectar sombras obliga a redibujar toda la escena
       * en un mapa de profundidad cada frame, y acá no se mueve nada salvo el
       * avatar —que tiene su propia sombra falsa bajo los pies. El volumen lo
       * dan la oclusión ambiental y las sombras de contacto.
       */}
      {active && (
        <directionalLight
          position={[6, 12, 8]}
          intensity={streetLight}
          color={PALETTE.cyan}
        />
      )}

      {/* Vereda y calle */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={asphalt}
      >
        <planeGeometry args={[80, 80]} />
      </mesh>

      {/* ---------- El frente ---------- */}

      {/* Muro ciego a la izquierda */}
      <KitPiece name="wall" position={[-4, 0, 0]} rotation={FACING_CAMERA} />

      {/* La vitrina: cuatro metros de vidrio, el corazón de la fachada */}
      <KitPiece
        name="wall-window-wide-square-detailed"
        position={[-1, 0, 0]}
        rotation={FACING_CAMERA}
      />

      {/* La puerta */}
      <KitPiece
        name="wall-doorway-square"
        position={[2, 0, 0]}
        rotation={FACING_CAMERA}
      />
      <Doorway position={[2, 0, 0.12]} onEnter={onEnter} active={active} />

      {/* Ventana chica a la derecha */}
      <KitPiece
        name="wall-window-square-detailed"
        position={[4, 0, 0]}
        rotation={FACING_CAMERA}
      />

      {/* ---------- Laterales, para que el local tenga cuerpo ---------- */}
      {[-1, -3].map((z) => (
        <KitPiece key={`izq${z}`} name="wall" position={[-5, 0, z]} />
      ))}
      {[-1, -3].map((z) => (
        <KitPiece key={`der${z}`} name="wall" position={[5, 0, z]} />
      ))}

      {/* Cornisa: remata el frente y le da sombra propia a la fachada */}
      {[-4, -2, 0, 2, 4].map((x) => (
        <KitPiece
          key={`cornisa${x}`}
          name="border-high"
          position={[x, WALL_HEIGHT, 0]}
          rotation={FACING_CAMERA}
        />
      ))}

      {/* Detalle: columnas a los costados y caños sobre el muro ciego */}
      <KitPiece name="column" position={[-5, 0, 0]} />
      <KitPiece name="column" position={[5, 0, 0]} />
      <KitPiece
        name="gutter-vertical"
        position={[-4.85, 0, 0.1]}
        rotation={FACING_CAMERA}
      />

      {/**
       * Solo sobre la puerta.
       *
       * En la versión anterior cubría también la vitrina, y con eso tapaba lo
       * único que invita a entrar: ver que adentro hay luz prendida. Acotado a
       * la entrada cumple su función —señalar dónde se pasa— sin robarle el
       * protagonismo al vidrio.
       */}
      <Awning position={[2, 2.1, 0.02]} width={2.9} active={active} />

      {active && <InteriorGlow />}

      {/* ---------- Neón ---------- */}

      {/**
       * El cartel principal, por encima de la cornisa.
       *
       * Tiene que quedar arriba de todo: el toldo se le monta por delante en
       * perspectiva apenas la cámara mira desde arriba, aunque en el eje Z
       * esté detrás.
       */}
      <NeonSign
        text="CYBERSTUDIO"
        color={PALETTE.magenta}
        position={[-0.6, 3.35, 0.3]}
        size={0.6}
        light
      />

      <BladeSign position={[-4.6, 2.1, 0.45]} color={PALETTE.cyan} />

      {/**
       * Cartelito sobre la ventana chica.
       *
       * Va en z=0.24 y no pegado al muro: las piezas `-detailed` del kit tienen
       * el marco saliente hasta z=0.1, y cualquier cosa plantada más cerca se
       * clava adentro del marco en vez de apoyarse sobre él.
       */}
      <NeonSign
        text="ABIERTO"
        color={PALETTE.green}
        position={[4, 1.95, 0.24]}
        size={0.13}
        flicker={0.15}
      />

      {/* ---------- Charcos de luz en la vereda ---------- */}
      <LightPool
        position={[-1, 0.02, 2.4]}
        size={11}
        color={PALETTE.magenta}
        opacity={0.5}
      />
      <LightPool
        position={[4, 0.02, 1.8]}
        size={5}
        color={PALETTE.green}
        opacity={0.35}
      />
      {/* El cálido que se escapa por la puerta: la invitación a entrar. */}
      <LightPool
        position={[2, 0.02, 1.6]}
        size={4.5}
        color={PALETTE.amber}
        opacity={0.55}
      />

      {/**
       * `frames={1}`: se calcula una vez y queda.
       *
       * Por defecto ContactShadows re-renderiza la escena entera a una textura
       * y la desenfoca en cada frame. Con dos ambientes montados eran dos
       * renders completos por cuadro para dibujar la sombra de un local que no
       * se mueve. El avatar no aporta a esta sombra —tiene la suya— así que
       * congelarla no se nota.
       */}
      {active && (
        <ContactShadows
          frames={1}
          position={[0, 0.015, 0]}
          opacity={0.7}
          scale={30}
          blur={2.2}
          far={6}
          resolution={512}
          color="#000000"
        />
      )}
    </group>
  );
}
