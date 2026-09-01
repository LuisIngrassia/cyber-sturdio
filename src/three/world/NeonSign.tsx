import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Un cartel de neón: texto emisivo dentro de una caja oscura.
 *
 * El texto va con `meshBasicMaterial` y `toneMapped={false}`, no con un
 * material estándar emisivo. Un basic no se apaga con la iluminación de la
 * escena — un cartel de neón es la fuente de luz, no algo iluminado — y
 * saltearse el tone mapping es lo que le deja pasar el umbral del bloom y
 * generar el halo. Con un material estándar el cartel queda apagado y opaco.
 */

export type NeonSignProps = {
  text: string;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
  /** La caja oscura de atrás. Sin ella el texto flota en el aire. */
  backing?: boolean;
  font?: string;
  /** Cuánto titila. 0 = tubo nuevo, 1 = tubo a punto de quemarse. */
  flicker?: number;
  /** Para los carteles verticales, con el texto separado por saltos de línea. */
  lineHeight?: number;
};

export function NeonSign({
  text,
  color,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 0.5,
  backing = true,
  font = "/fonts/Audiowide-Regular.ttf",
  flicker = 0.35,
  lineHeight = 1,
}: NeonSignProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const mat = textRef.current?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    if (!mat) return;

    const t = clock.elapsedTime;
    // Dos senos de frecuencias no múltiplas entre sí: el patrón no se repite
    // nunca, así que no se lee como una animación en loop.
    const shimmer =
      1 - flicker * 0.12 * (Math.sin(t * 11) * 0.5 + Math.sin(t * 27.3) * 0.5);
    // Fallo esporádico. La condición se cumple en una franja muy angosta del
    // seno, así que pasa cada tanto y dura poco: es lo que da la sensación de
    // tubo gastado en vez de parpadeo rítmico.
    const dropout = flicker > 0 && Math.sin(t * 2.7) > 0.988 ? 0.3 : 1;
    const level = shimmer * dropout;

    mat.opacity = level;
    // La luz que el cartel tira sobre la pared acompaña el titileo. Sin esto
    // el cartel parpadea pero su entorno queda fijo, y se nota que es un truco.
    if (lightRef.current) lightRef.current.intensity = 6 * level;
  });

  return (
    <group position={position} rotation={rotation}>
      {backing && (
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[text.length * size * 0.78, size * 1.9, 0.12]} />
          <meshStandardMaterial color="#0d0a12" roughness={0.9} />
        </mesh>
      )}

      <Text
        ref={textRef}
        font={font}
        fontSize={size}
        letterSpacing={0.08}
        lineHeight={lineHeight}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {text}
        <meshBasicMaterial color={color} toneMapped={false} transparent />
      </Text>

      <pointLight
        ref={lightRef}
        color={color}
        intensity={6}
        distance={7}
        decay={2}
        position={[0, 0, 0.5]}
      />
    </group>
  );
}
