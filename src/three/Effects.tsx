import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { useControls } from "leva";
import { ToneMappingMode } from "postprocessing";

import { useQuality } from "./lib/quality";

/**
 * El postprocesado. Acá vive la mayor parte del "look" del proyecto.
 *
 * El orden importa y no es intercambiable:
 *
 *   1. N8AO oscurece los rincones donde dos superficies se encuentran. Es lo
 *      que hace que un objeto se vea apoyado en el piso en vez de flotando, y
 *      es el efecto que más disimula que la escena está armada con props
 *      sueltos que nunca fueron modelados juntos.
 *   2. Bloom desparrama la luz de los materiales emisivos. Sin esto un neón es
 *      apenas un tubo de color plano; con esto es una fuente de luz.
 *   3. Vignette cierra los bordes y empuja la mirada al centro.
 *   4. ToneMapping mapea el rango alto a pantalla. Va último porque opera
 *      sobre el color ya compuesto.
 *   5. SMAA suaviza los bordes al final de todo.
 *
 * Los valores se tunean con el panel de leva mirando la referencia al lado, y
 * después se copian a los defaults de acá. Ese es el método de trabajo, no un
 * paso previo: es la forma de llegar al resultado sin ojo entrenado.
 */
export function Effects() {
  const quality = useQuality();

  const bloom = useControls(
    "bloom",
    {
      /**
       * Umbral de luminancia: por debajo de esto, nada brilla.
       *
       * Alto a propósito. Si se baja, empiezan a brillar las superficies
       * apenas iluminadas y la escena se lava entera; el neón deja de
       * destacarse porque brilla todo.
       */
      luminanceThreshold: { value: 0.85, min: 0, max: 2, step: 0.01 },
      luminanceSmoothing: { value: 0.3, min: 0, max: 1, step: 0.01 },
      intensity: { value: 1.4, min: 0, max: 6, step: 0.05 },
      /** Radio del desparramo. Sin mipmapBlur el halo se ve en bandas. */
      radius: { value: 0.75, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true }
  );

  const ao = useControls(
    "oclusión ambiental",
    {
      aoRadius: { value: 1.2, min: 0.1, max: 5, step: 0.1 },
      intensity: { value: 2.5, min: 0, max: 10, step: 0.1 },
      distanceFalloff: { value: 1, min: 0, max: 5, step: 0.1 },
    },
    { collapsed: true }
  );

  const grade = useControls(
    "color",
    {
      vignette: { value: 0.5, min: 0, max: 1, step: 0.01 },
      vignetteOffset: { value: 0.3, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true }
  );

  return (
    /**
     * `multisampling={0}`: el MSAA del composer es caro y además se pisa con
     * SMAA. Cuando SMAA no corre (tier bajo) el antialiasing lo pone el
     * contexto WebGL en Experience.tsx.
     */
    <EffectComposer multisampling={0} enableNormalPass={quality.ambientOcclusion}>
      {quality.ambientOcclusion ? (
        <N8AO
          aoRadius={ao.aoRadius}
          intensity={ao.intensity}
          distanceFalloff={ao.distanceFalloff}
          quality="medium"
          halfRes
        />
      ) : (
        <></>
      )}

      {quality.bloom ? (
        <Bloom
          mipmapBlur
          luminanceThreshold={bloom.luminanceThreshold}
          luminanceSmoothing={bloom.luminanceSmoothing}
          intensity={bloom.intensity}
          radius={bloom.radius}
        />
      ) : (
        <></>
      )}

      <Vignette
        offset={grade.vignetteOffset}
        darkness={grade.vignette}
        eskil={false}
      />

      {/**
       * ACES filmic: es el tone mapping que sostiene los colores saturados sin
       * que se quemen a blanco. Con neones al máximo, cualquier otro los
       * aplasta.
       */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {quality.smaa ? <SMAA /> : <></>}
    </EffectComposer>
  );
}
