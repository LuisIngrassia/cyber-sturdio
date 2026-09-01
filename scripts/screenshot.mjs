/**
 * Saca una captura de la escena con el dev server corriendo.
 *
 * En un proyecto 3D no alcanza con que compile: el build puede pasar y la
 * pantalla estar negra. Esto abre el Chrome que ya tenés instalado
 * (playwright-core no descarga navegadores), espera a que se dibujen varios
 * frames y guarda un PNG, además de reportar los errores de consola.
 *
 *   npm run shot                       # http://localhost:5173 -> shot.png
 *   npm run shot -- http://localhost:5174 mi-captura.png
 *
 * Nota: con `--headless` Chrome puede caer a SwiftShader y renderizar por
 * software. Es lento pero fiel; por eso la espera es de varios segundos.
 */
import { chromium } from "playwright-core";

const url = process.argv[2] ?? "http://localhost:5173/";
const out = process.argv[3] ?? "shot.png";
const settleMs = Number(process.env.SHOT_SETTLE_MS ?? 12000);

const browser = await chromium.launch({
  channel: "chrome",
  args: [
    // Sin esto, Chrome headless se niega a dar contexto WebGL cuando no hay
    // GPU disponible, y el canvas sale vacío.
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Los 30 s por defecto no alcanzan. Renderizando por software, la lectura de
// píxeles de una escena con postprocesado tarda decenas de segundos: el propio
// Chrome avisa con "GPU stall due to ReadPixels". No es que algo esté colgado,
// es que va lento.
page.setDefaultTimeout(180000);

const messages = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    messages.push(`[${m.type()}] ${m.text()}`);
  }
});
page.on("pageerror", (e) => messages.push(`[pageerror] ${e.message}`));

// `load` y no `networkidle`: el websocket de HMR del dev server deja la red
// permanentemente activa, así que "sin actividad de red" no llega nunca. La
// espera real es el canvas más un rato fijo para que se dibujen frames.
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(settleMs);

const canvas = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return c ? { w: c.width, h: c.height } : null;
});

await page.screenshot({ path: out });
await browser.close();

console.log(`captura: ${out}  canvas: ${JSON.stringify(canvas)}`);
if (messages.length > 0) {
  console.log("consola:");
  for (const m of messages.slice(0, 30)) console.log("  ", m);
}
