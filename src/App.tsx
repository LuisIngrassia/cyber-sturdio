import { Leva } from "leva";

import { Experience } from "./three/Experience";
import { UILayer } from "./ui/UILayer";

/**
 * Dos capas: el mundo (canvas) y la interfaz (DOM), hermanas y no anidadas.
 * Se hablan a través del store en src/state/store.ts.
 */
export default function App() {
  return (
    <>
      <Experience />
      <UILayer />

      {/**
       * El panel de tuneo. Es la herramienta central del proyecto: permite
       * ajustar bloom, neones y luces mirando el resultado en vivo contra la
       * imagen de referencia, en vez de adivinar valores en el código.
       *
       * `import.meta.env.DEV` lo saca del bundle de producción por completo:
       * Vite evalúa la constante y el bundler elimina la rama muerta.
       */}
      <Leva hidden={!import.meta.env.DEV} collapsed titleBar={{ title: "CyberStudio" }} />
    </>
  );
}
