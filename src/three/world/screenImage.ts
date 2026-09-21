import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * La captura del hero de cada proyecto, para la pantalla de su computadora.
 *
 * Por convención, el archivo de un proyecto con `id: "codexa"` es
 * `public/projects/codexa.webp`. No hay que declararlo en ningún lado: se
 * deduce del id, igual que el puesto en el salón.
 *
 * El área de imagen del tubo es de 1,158 : 1 —30,7 × 26,5 cm— y las capturas
 * llegan apaisadas, así que se recortan al centro para llenar la pantalla en
 * vez de quedar en una franja con bandas negras. A esta distancia el detalle
 * no se lee de todos modos: lo que dice "esa máquina tiene un sitio abierto"
 * es que la imagen ocupe el tubo entero.
 *
 * Mientras el archivo no exista, la pantalla muestra el nombre del proyecto
 * dibujado por código. Eso es a propósito: el salón tiene que verse entero
 * desde el primer día y no romperse por una captura que falta. La consola va a
 * mostrar un 404 por cada imagen pendiente, y desaparecen al agregarlas.
 */

/** Proporción del área de imagen del CRT, medida sobre el modelo. */
const SCREEN_ASPECT = 1.158;
const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = Math.round(SCREEN_WIDTH / SCREEN_ASPECT);

const cache = new Map<string, THREE.Texture | null>();

export const heroUrl = (id: string) => `/projects/${id}.webp`;

/**
 * Recorta la captura al centro para que llene la pantalla del tubo.
 *
 * Se hace en un canvas y no con la transformación de textura de three porque
 * acá se ve de un vistazo qué está pasando, y porque el recorte depende de la
 * proporción de cada captura, que no se conoce hasta cargarla.
 */
function fitToScreen(image: HTMLImageElement): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const scale = Math.max(
    SCREEN_WIDTH / image.width,
    SCREEN_HEIGHT / image.height
  );
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // La pantalla se ve de costado al caminar por el pasillo; sin filtrado
  // anisotrópico la imagen se deshace en cuanto hay ángulo.
  texture.anisotropy = 4;
  return texture;
}

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
    const image = new Image();

    image.onload = () => {
      const texture = fitToScreen(image);
      cache.set(id, texture);
      if (alive) setLoaded(texture);
    };
    image.onerror = () => {
      // Todavía no existe. Se recuerda para no volver a pedirla en cada
      // montaje, y la pantalla se queda con el texto.
      cache.set(id, null);
    };
    image.src = heroUrl(id);

    return () => {
      alive = false;
    };
  }, [id]);

  return cached ?? loaded;
}
