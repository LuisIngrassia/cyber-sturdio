import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * La captura del hero de cada proyecto, para la pantalla de su computadora.
 *
 * Por convención, el archivo de un proyecto con `id: "codexa"` es
 * `public/projects/codexa.webp`. No hay que declararlo en ningún lado: se
 * deduce del id, igual que el puesto en el salón.
 *
 * **Proporción: 1,158 : 1** — el área de imagen del tubo mide 30,7 × 26,5 cm.
 * No es 16:9: un hero exportado apaisado se recorta por los costados y suele
 * perder justo el título. A 1024 de ancho son 1024 × 884.
 *
 * Mientras el archivo no exista, la pantalla muestra el nombre del proyecto
 * dibujado por código. Eso es a propósito: el salón tiene que verse entero
 * desde el primer día y no romperse por una captura que falta. La consola va a
 * mostrar un 404 por cada imagen pendiente, y desaparecen al agregarlas.
 */

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture | null>();

export const heroUrl = (id: string) => `/projects/${id}.webp`;

/**
 * Devuelve la textura del hero, o `null` mientras no haya.
 *
 * Carga sin suspender: un `useTexture` que suspende dejaría todo el salón en
 * blanco hasta que estén las seis capturas, y si falta una lanza. Acá cada
 * pantalla resuelve la suya por separado y el mundo nunca deja de dibujarse.
 */
export function useHeroTexture(id: string): THREE.Texture | null {
  const [loaded, setLoaded] = useState<THREE.Texture | null>(null);

  // La caché se lee en el render y no desde el efecto. Si otra pantalla ya
  // trajo esta imagen, aparece en el primer dibujo; y evita el `setState`
  // síncrono dentro del efecto, que dispara un render en cascada.
  const cached = cache.get(id);

  useEffect(() => {
    if (cache.has(id)) return;

    let alive = true;
    loader.load(
      heroUrl(id),
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        // La pantalla se ve de costado al caminar por el pasillo; sin filtrado
        // anisotrópico la imagen se deshace en cuanto hay ángulo.
        loaded.anisotropy = 4;
        cache.set(id, loaded);
        if (alive) setLoaded(loaded);
      },
      undefined,
      () => {
        // Todavía no existe. Se recuerda para no volver a pedirla en cada
        // montaje, y la pantalla se queda con el texto.
        cache.set(id, null);
      }
    );

    return () => {
      alive = false;
    };
  }, [id]);

  return cached ?? loaded;
}
