import * as THREE from "three";

import { PALETTE } from "../lib/palette";

/**
 * La pantalla encendida de cada computadora, dibujada en un canvas.
 *
 * No hay captura de pantalla ni archivo: el contenido se dibuja por código,
 * como las texturas procedurales de Recuvarillas. Tres razones para hacerlo
 * así en vez de usar imágenes:
 *
 *   - Sale del mismo lugar que todo lo demás, `src/data/projects.ts`. Agregar
 *     un proyecto no requiere además producir y optimizar una captura.
 *   - Pesa cero en la red.
 *   - A la distancia desde la que se ve —tres o cuatro metros, en penumbra— una
 *     captura de un sitio web es una mancha ilegible. Un nombre en grande sí se
 *     lee, que es lo único que la pantalla tiene que comunicar antes de que el
 *     visitante se acerque.
 *
 * Las capturas reales llegan con el modal, donde se ven a tamaño completo.
 */

/**
 * 512 × 320 para una pantalla de 4:3 recortada.
 *
 * Alcanza de sobra: el monitor ocupa pocos centenares de píxeles en pantalla
 * incluso sentado enfrente, y la textura se dibuja una sola vez.
 */
const WIDTH = 512;
const HEIGHT = 320;

const cache = new Map<string, THREE.CanvasTexture>();

export function screenTexture(
  nombre: string,
  tagline: string,
  color: string = PALETTE.cyan
): THREE.CanvasTexture {
  const key = `${nombre}|${tagline}|${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#060410";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Rejilla tenue de fondo: da textura al vidrio y evita el plano de color
  // liso, que se lee como un rectángulo pintado y no como una pantalla.
  ctx.strokeStyle = `${color}14`;
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // Barra de título, como la de una ventana de terminal.
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, WIDTH, 6);

  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "bold 46px 'Courier New', monospace";
  ctx.fillText(nombre.toUpperCase(), WIDTH / 2, HEIGHT / 2 - 6);

  ctx.fillStyle = `${color}99`;
  ctx.font = "20px 'Courier New', monospace";
  ctx.fillText(tagline, WIDTH / 2, HEIGHT / 2 + 34);

  ctx.fillStyle = `${color}66`;
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillText("> abrir", WIDTH / 2, HEIGHT - 40);

  // Líneas de barrido: es lo que convierte un cartel en una pantalla encendida.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < HEIGHT; y += 3) ctx.fillRect(0, y, WIDTH, 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // El texto es fino y la pantalla se ve de costado: sin filtrado anisotrópico
  // las letras se deshacen en cuanto hay ángulo.
  texture.anisotropy = 4;
  cache.set(key, texture);

  return texture;
}
