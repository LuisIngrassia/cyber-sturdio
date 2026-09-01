import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { LightPool } from "../lib/LightPool";
import {
  concreteMaterial,
  neonMaterial,
  shellMaterial,
  woodMaterial,
} from "../lib/materials";
import { PALETTE } from "../lib/palette";

/**
 * La prueba de humo del proyecto.
 *
 * Cajas, un piso y unos tubos de neón: ni un solo modelo importado. La única
 * pregunta que responde es si el pipeline de iluminación y postprocesado
 * alcanza para que esto se vea bien sin un artista.
 *
 * Si las cajas se ven bien, el resto del proyecto es contenido sobre una base
 * probada. Si no se ven bien, hay que arreglarlo acá — donde cuesta una tarde
 * — y no dentro de tres semanas con cuarenta props ya colocados.
 *
 * Se reemplaza en la Fase 1 por la fachada real.
 */

/**
 * Tubo de neón: un cilindro emisivo, su charco de luz en el piso y una luz
 * real de corto alcance.
 *
 * La luz puntual es la pieza que faltaba en la primera versión de esta escena.
 * Un material emisivo brilla pero no ilumina nada: sin ella los objetos
 * alrededor del neón quedan como siluetas negras. Va con `distance` acotada
 * para que el costo se mantenga local y no toque toda la escena.
 */
function NeonTube({
  position,
  rotation = [0, 0, 0],
  length = 4,
  color,
  intensity,
  poolSize = 5,
  lightIntensity = 8,
  lightDistance = 9,
  poolOffsetX = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
  color: string;
  intensity: number;
  poolSize?: number;
  lightIntensity?: number;
  lightDistance?: number;
  /** Corre el charco en X, para cuando el tubo tiene un mueble justo debajo. */
  poolOffsetX?: number;
}) {
  const material = useMemo(
    () => neonMaterial(color, intensity),
    [color, intensity]
  );

  return (
    <group>
      <mesh position={position} rotation={rotation} material={material}>
        <capsuleGeometry args={[0.06, length, 4, 12]} />
      </mesh>

      <pointLight
        position={position}
        color={color}
        intensity={lightIntensity}
        distance={lightDistance}
        // Caída física: el brillo baja con el cuadrado de la distancia, que es
        // lo que hace que el tubo se lea como una fuente puntual y no como una
        // tinta uniforme sobre todo lo que tiene cerca.
        decay={2}
      />

      {/* El charco cae justo debajo del tubo, sobre el piso (y = 0,01). */}
      <LightPool
        position={[position[0] + poolOffsetX, 0.01, position[2]]}
        size={poolSize}
        color={color}
        opacity={0.5}
      />
    </group>
  );
}

/**
 * Cartel de neón parpadeante.
 *
 * El parpadeo no es un seno: un neón real titila irregular y con fallos
 * ocasionales. Se compone ruido rápido con caídas esporádicas, que es lo que
 * lo hace leer como tubo gastado y no como animación de CSS.
 */
function FlickeringSign({
  position,
  color,
  baseIntensity,
}: {
  position: [number, number, number];
  color: string;
  baseIntensity: number;
}) {
  const material = useMemo(
    () => neonMaterial(color, baseIntensity),
    [color, baseIntensity]
  );
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    // El material se toma del mesh y no de la variable del useMemo: mutar por
    // frame es lo normal en r3f, pero escribir sobre el valor que devolvió un
    // hook rompe las reglas del compilador de React. Por el ref es lo mismo en
    // runtime y queda dentro de las reglas.
    const mat = ref.current?.material as THREE.MeshStandardMaterial | undefined;
    if (!mat) return;

    const t = clock.elapsedTime;
    // Dos senos de frecuencias no múltiplas: nunca se repite igual.
    const shimmer = 0.9 + Math.sin(t * 11) * 0.04 + Math.sin(t * 27.3) * 0.03;
    // Fallo esporádico: la mayor parte del tiempo vale 1 y de a ratos se cae.
    const dropout = Math.sin(t * 2.7) > 0.985 ? 0.25 : 1;

    mat.emissiveIntensity = baseIntensity * shimmer * dropout;
  });

  return (
    <group position={position}>
      <mesh ref={ref} material={material}>
        <boxGeometry args={[3.2, 0.6, 0.08]} />
      </mesh>
      {/* Marco oscuro: le da cuerpo al cartel y separa el neón de la pared. */}
      <mesh position={[0, 0, -0.08]} material={shellMaterial()}>
        <boxGeometry args={[3.5, 0.85, 0.12]} />
      </mesh>
    </group>
  );
}

export function GreyboxScene() {
  const { neonIntensity, ambient, bounce, frontFill, neonLight } = useControls(
    "escena",
    {
      neonIntensity: { value: 2.4, min: 0, max: 6, step: 0.1 },
      /**
       * Ambiente muy bajo, casi cero.
       *
       * Es tentador subirlo para "ver mejor", y es justo lo que arruina el
       * efecto: en cuanto hay ambiente parejo, el vacío deja de ser negro y
       * todo se aplana. El relleno tiene que venir teñido, no blanco.
       */
      ambient: { value: 0.06, min: 0, max: 1, step: 0.01 },
      /**
       * El rebote: una hemisférica con cian arriba y magenta abajo.
       *
       * Es lo que hace que los volúmenes se lean sin romper la penumbra. La
       * luz llega de dos colores opuestos según la orientación de cada cara,
       * así que un objeto queda cian de un lado y magenta del otro — que es
       * exactamente lo que pasa en un lugar iluminado solo por neones.
       * Cuesta una sola luz y hace el trabajo de cuatro.
       */
      bounce: { value: 1.1, min: 0, max: 3, step: 0.05 },
      /**
       * Relleno frontal, desde donde está el espectador.
       *
       * Sin esto las caras que miran a cámara quedan negras: todas las demás
       * luces vienen de arriba o de atrás, y la hemisférica tiñe según cuánto
       * apunta hacia arriba cada cara, así que a un frente vertical no le
       * llega nada. Es la luz que hace que los objetos tengan cara y no solo
       * silueta. Va tenue: si se pasa, mata el contraste y la escena se
       * convierte en un estudio iluminado.
       */
      frontFill: { value: 0.55, min: 0, max: 3, step: 0.05 },
      /** Alcance de las luces reales que cuelgan de cada tubo. */
      neonLight: { value: 9, min: 0, max: 30, step: 0.5 },
    },
    { collapsed: true }
  );

  const floor = useMemo(() => concreteMaterial(), []);
  const shell = useMemo(() => shellMaterial(), []);
  const wood = useMemo(() => woodMaterial(), []);
  // Una sola instancia compartida por las cuatro pantallas: son idénticas y
  // three no gana nada con materiales duplicados.
  const screen = useMemo(() => neonMaterial(PALETTE.cyan, 0.9), []);

  return (
    <group>
      <ambientLight intensity={ambient} />

      {/**
       * El entorno: cuatro paneles de color alrededor de la escena, renderizados
       * una sola vez a un cubemap.
       *
       * Esto resuelve dos cosas de golpe. La primera es un clásico de three: un
       * material con `metalness` no tiene difuso, solo refleja el entorno, así
       * que sin environment map queda negro por más luces que se agreguen. La
       * segunda es que da luz con dirección y color — cada cara recibe el tono
       * del panel que tiene enfrente — que es lo que una ambiente plana no
       * puede dar.
       *
       * `frames={1}`: nada de esto se mueve, así que se rinde una vez al
       * arrancar y después es gratis.
       */}
      <Environment resolution={64} frames={1}>
        <color attach="background" args={[PALETTE.void]} />
        {/* Los dos neones grandes del techo, uno de cada lado. */}
        <Lightformer
          intensity={3}
          color={PALETTE.magenta}
          position={[-6, 3, -2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[8, 4, 1]}
        />
        <Lightformer
          intensity={3}
          color={PALETTE.cyan}
          position={[6, 3, -2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[8, 4, 1]}
        />
        {/* La barra, cálida, desde la derecha. */}
        <Lightformer
          intensity={2}
          color={PALETTE.amber}
          position={[7, 2, 2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[5, 3, 1]}
        />
        {/**
         * El panel del frente. Es el que le da cara a los objetos: todo lo
         * demás viene de arriba o de los costados, y sin esto los frentes que
         * miran al espectador quedan sin nada.
         */}
        <Lightformer
          intensity={1.2}
          color={PALETTE.purple}
          position={[0, 3, 9]}
          rotation={[0, Math.PI, 0]}
          scale={[12, 5, 1]}
        />
      </Environment>

      {/**
       * El relleno teñido. Ver el comentario de `bounce` arriba: es la luz que
       * hace legibles los volúmenes sin blanquear la escena.
       */}
      <hemisphereLight
        intensity={bounce}
        color={PALETTE.cyan}
        groundColor={PALETTE.magenta}
      />

      {/**
       * Única direccional, muy tenue y desde arriba. No ilumina: define de qué
       * lado caen las sombras para que los objetos tengan un anclaje común.
       */}
      <directionalLight
        position={[4, 8, 4]}
        intensity={0.35}
        color={PALETTE.cyan}
        castShadow
      />

      {/**
       * El relleno frontal. Violeta y no blanco: un blanco desde el frente
       * delata que hay una luz puesta ahí, mientras que un violeta bajo se
       * lee como el resplandor difuso de los carteles que el espectador tiene
       * enfrente.
       */}
      <directionalLight
        position={[-2, 3, 10]}
        intensity={frontFill}
        color={PALETTE.purple}
      />

      {/**
       * Piso y pared, los dos más grandes de lo que se ve en cámara.
       *
       * El borde de una superficie contra el vacío es una línea recta dura que
       * delata el truco al instante. La niebla los disuelve, pero solo si hay
       * suficiente distancia como para que llegue a acumularse: por eso sobra
       * geometría en los bordes en vez de recortarla al encuadre.
       */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={floor}
      >
        <planeGeometry args={[60, 60]} />
      </mesh>

      {/* Pared del fondo: el neón necesita algo donde rebotar. */}
      <mesh position={[0, 5, -5]} receiveShadow material={floor}>
        <boxGeometry args={[40, 10, 0.2]} />
      </mesh>

      {/* Las "computadoras": cajas sobre un mostrador. Placeholders de Fase 4. */}
      {[-3, -1, 1, 3].map((x) => (
        <group key={x} position={[x, 0, -2]}>
          {/* Escritorio */}
          <mesh position={[0, 0.75, 0]} castShadow material={wood}>
            <boxGeometry args={[1.6, 0.08, 0.8]} />
          </mesh>
          <mesh position={[0, 0.37, 0]} castShadow material={shell}>
            <boxGeometry args={[1.4, 0.75, 0.7]} />
          </mesh>
          {/* Monitor */}
          <mesh position={[0, 1.15, -0.2]} castShadow material={shell}>
            <boxGeometry args={[0.9, 0.6, 0.1]} />
          </mesh>
          {/* La pantalla encendida: emisiva, así aporta al bloom. */}
          <mesh position={[0, 1.15, -0.14]} material={screen}>
            <planeGeometry args={[0.8, 0.5]} />
          </mesh>
        </group>
      ))}

      {/* La barra, a la derecha. Cálida, en contraste con el resto. */}
      <group position={[5.5, 0, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow material={wood}>
          <boxGeometry args={[1.2, 1.1, 5]} />
        </mesh>
        <mesh position={[0, 1.13, 0]} castShadow material={wood}>
          <boxGeometry args={[1.5, 0.08, 5.2]} />
        </mesh>
      </group>

      {/* Tubos de neón del techo */}
      <NeonTube
        position={[-2.5, 3.4, -1]}
        rotation={[0, 0, Math.PI / 2]}
        length={4}
        color={PALETTE.magenta}
        intensity={neonIntensity}
        poolSize={7}
        lightDistance={neonLight}
      />
      <NeonTube
        position={[2.5, 3.4, -1]}
        rotation={[0, 0, Math.PI / 2]}
        length={4}
        color={PALETTE.cyan}
        intensity={neonIntensity}
        poolSize={7}
        lightDistance={neonLight}
      />
      {/* El de la barra es ámbar: es el rincón cálido del local. */}
      <NeonTube
        position={[5.5, 2.8, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        length={4}
        color={PALETTE.amber}
        intensity={neonIntensity * 0.8}
        poolSize={6}
        lightDistance={neonLight}
        lightIntensity={12}
        // Corrido hacia el salón: justo debajo del tubo está la barra, y ahí
        // el charco quedaría tapado por el mueble.
        poolOffsetX={-1.8}
      />

      <FlickeringSign
        position={[0, 4.2, -4.8]}
        color={PALETTE.purple}
        baseIntensity={neonIntensity * 1.3}
      />

      {/**
       * Sombras de contacto: la otra mitad de "los objetos están apoyados".
       * La oclusión ambiental oscurece los rincones, esto pone la sombra
       * difusa debajo de cada volumen. Juntas son lo que más separa una escena
       * amateur de una que parece hecha por alguien que sabe.
       */}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.65}
        scale={26}
        blur={2.4}
        far={5}
        resolution={512}
        color="#000000"
      />
    </group>
  );
}
