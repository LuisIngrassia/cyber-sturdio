/**
 * Optimiza los GLB descargados antes de que entren al proyecto.
 *
 * Los modelos de los packs CC0 vienen sin comprimir y con texturas PNG
 * enormes: un prop suelto puede pesar varios megas. Como la escena entera se
 * carga en el navegador, sin este paso el presupuesto de 8 MB se agota con
 * cinco objetos.
 *
 * Flujo de trabajo:
 *
 *   1. Descargás el GLB y lo dejás en `models-raw/` (ignorado por git).
 *   2. `npm run models`
 *   3. Sale optimizado en `public/models/` y desde ahí lo carga useGLTF.
 *
 * Requiere @gltf-transform/cli, que no está en las dependencias del proyecto
 * porque solo hace falta al incorporar un asset nuevo:
 *
 *   npx @gltf-transform/cli optimize <in> <out>
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const RAW_DIR = "models-raw";
const OUT_DIR = join("public", "models");

function human(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(
      `No existe ${RAW_DIR}/. Creala y poné ahí los .glb sin optimizar.`
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const models = readdirSync(RAW_DIR).filter((f) => /\.(glb|gltf)$/i.test(f));

  if (models.length === 0) {
    console.log(`No hay modelos en ${RAW_DIR}/.`);
    return;
  }

  for (const file of models) {
    const input = join(RAW_DIR, file);
    const output = join(OUT_DIR, basename(file).replace(/\.gltf$/i, ".glb"));

    console.log(`\n→ ${file}`);

    execFileSync(
      "npx",
      [
        "--yes",
        "@gltf-transform/cli",
        "optimize",
        input,
        output,
        // Draco para la geometría: es donde está el grueso del peso en props
        // low-poly con muchos vértices duplicados.
        "--compress",
        "draco",
        // WebP en vez de PNG. KTX2 comprime más y descomprime en la GPU, pero
        // requiere que el loader tenga el transcoder cargado; WebP es el
        // default sensato hasta que el peso lo justifique.
        "--texture-compress",
        "webp",
        // 1024 alcanza de sobra: son props vistos a varios metros, en una
        // escena oscura. Texturas de 4K acá son peso puro.
        "--texture-size",
        "1024",
        // Aplana y fusiona lo que pueda: menos draw calls por prop.
        "--join",
        "true",
        // Los props CC0 suelen traer cámaras y luces del archivo original que
        // no queremos que se cuelen en nuestra escena.
        "--prune",
        "true",
      ],
      { stdio: "inherit", shell: process.platform === "win32" }
    );

    const before = statSync(input).size;
    const after = statSync(output).size;
    const saved = (1 - after / before) * 100;
    console.log(
      `   ${human(before)} → ${human(after)}  (-${saved.toFixed(0)}%)`
    );
  }

  console.log(
    `\nListo. Acordate de anotar autor, URL y licencia en ${OUT_DIR}/CREDITS.md`
  );
}

main();
