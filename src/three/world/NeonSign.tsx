import { Text } from "@react-three/drei";

/**
 * Un cartel de neón: texto emisivo dentro de una caja oscura.
 *
 * El texto va con `meshBasicMaterial` y `toneMapped={false}`, no con un
 * material estándar emisivo. Un basic no se apaga con la iluminación de la
 * escena — un cartel de neón es la fuente de luz, no algo iluminado — y
 * saltearse el tone mapping es lo que le deja pasar el umbral del bloom y
 * generar el halo. Con un material estándar el cartel queda apagado y opaco.
 *
 * Los carteles no parpadean. La primera versión imitaba un tubo gastado, con
 * titileo y cortes esporádicos; en pantalla se leía como que algo estaba
 * fallando, no como ambiente. El brillo constante deja que el bloom haga el
 * trabajo sin llamar la atención sobre sí mismo.
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
  /**
   * Si el cartel además ilumina de verdad lo que tiene alrededor.
   *
   * Apagado por defecto, y es la decisión de rendimiento más importante del
   * componente. Cada luz puntual se suma al bucle que recorre el shader por
   * cada píxel de cada material de la escena: seis carteles con luz propia no
   * cuestan seis veces un cartel, cuestan seis veces *toda la escena*. El
   * resplandor que se ve alrededor del texto lo produce el bloom, que es un
   * efecto de pantalla y no depende de que haya una luz ahí.
   *
   * Se enciende solo en el cartel principal, donde el charco de luz sobre la
   * pared es parte de la identidad del local.
   */
  light?: boolean;
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
  lineHeight = 1,
  light = false,
}: NeonSignProps) {
  return (
    <group position={position} rotation={rotation}>
      {backing && (
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[text.length * size * 0.78, size * 1.9, 0.12]} />
          <meshStandardMaterial color="#0d0a12" roughness={0.9} />
        </mesh>
      )}

      <Text
        font={font}
        fontSize={size}
        letterSpacing={0.08}
        lineHeight={lineHeight}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {text}
        <meshBasicMaterial color={color} toneMapped={false} />
      </Text>

      {light && (
        <pointLight
          color={color}
          intensity={6}
          distance={7}
          decay={2}
          position={[0, 0, 0.5]}
        />
      )}
    </group>
  );
}
