import { useControls } from "leva";

import { PALETTE } from "./palette";

/**
 * El vacío y la niebla.
 *
 * Están acá y no cableados en el <Canvas> porque la densidad de niebla es uno
 * de los valores más delicados de la escena, y hay que poder moverlo mirando
 * el resultado. Tiene dos efectos que tiran para lados opuestos:
 *
 *   - Sube: los bordes de la geometría se funden en el vacío (bien) pero los
 *     halos de los neones se apagan con la distancia (mal).
 *   - Baja: los neones brillan pleno (bien) pero aparece la línea recta donde
 *     termina el piso (mal).
 *
 * El punto justo depende del encuadre de cada escena, así que vive en el panel.
 *
 * Va con `attach` en vez de asignarle `scene.background` y `scene.fog` a mano:
 * r3f se encarga de poner y sacar la propiedad al montar y desmontar, y de
 * paso queda dentro de las reglas del compilador de React, que no permite
 * escribir sobre lo que devolvió un hook como useThree.
 */
export function Atmosphere() {
  const { fogDensity } = useControls(
    "atmósfera",
    {
      fogDensity: { value: 0.055, min: 0, max: 0.2, step: 0.001 },
    },
    { collapsed: true }
  );

  return (
    <>
      <color attach="background" args={[PALETTE.void]} />
      <fogExp2 attach="fog" args={[PALETTE.void, fogDensity]} />
    </>
  );
}
