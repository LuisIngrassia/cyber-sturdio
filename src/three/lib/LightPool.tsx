import { useMemo } from "react";
import * as THREE from "three";

/**
 * Un charco de luz de color en el piso. No es una luz.
 *
 * En la referencia el piso tiene manchones de magenta y cian debajo de cada
 * neón. Hacerlos con `pointLight` de verdad costaría una luz por cartel, y
 * cada luz dinámica encarece todos los materiales de la escena.
 *
 * Esto es un plano horizontal con un degradado radial y blending aditivo. Se
 * ve prácticamente igual, cuesta un draw call, y se puede poner sin
 * presupuesto. El truco es que la escena es oscura: sobre negro, sumar luz es
 * indistinguible de iluminar.
 *
 * Presupuesto real de luces del proyecto: 2 o 3 en total. Todo lo demás son
 * materiales emisivos y estos charcos.
 */

/**
 * Textura de degradado radial, generada en canvas.
 *
 * Se genera una sola vez y se tiñe por instancia con el `color` del material:
 * así un único recurso sirve para todos los charcos, de cualquier color.
 */
function createRadialTexture(size = 256): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

  // La caída no es lineal: el centro se mantiene lleno un tramo y después cae
  // rápido. Un degradado lineal se ve como un disco con borde, no como luz.
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let sharedTexture: THREE.Texture | null = null;

function getRadialTexture() {
  sharedTexture ??= createRadialTexture();
  return sharedTexture;
}

export type LightPoolProps = {
  position?: [number, number, number];
  /** Diámetro del charco en metros. */
  size?: number;
  color: string;
  opacity?: number;
  /** Para charcos ovalados, típicos de una luz que entra en diagonal. */
  scaleX?: number;
};

export function LightPool({
  position = [0, 0, 0],
  size = 4,
  color,
  opacity = 0.55,
  scaleX = 1,
}: LightPoolProps) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getRadialTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        // Aditivo: suma luz en vez de tapar lo que hay debajo, que es lo que
        // hace la luz de verdad.
        blending: THREE.AdditiveBlending,
        // Sin escritura de profundidad, o los charcos se recortan entre sí
        // donde se superponen y aparece una costura visible.
        depthWrite: false,
        toneMapped: false,
      }),
    [color, opacity]
  );

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[scaleX, 1, 1]}
      material={material}
      // Un pelo por encima del piso para que no pelee con él por el z-buffer.
      renderOrder={1}
    >
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
