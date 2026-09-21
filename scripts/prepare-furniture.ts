/**
 * Prepara los muebles del salón: convierte, parte y comprime.
 *
 * Los tres modelos llegan como los entrega su fuente y ninguno sirve tal cual:
 * dos vienen en FBX, el escritorio trae utilería pegada que no queremos repetir
 * seis veces, y entre los tres suman 17,5 MB — más del doble del presupuesto de
 * carga de todo el sitio.
 *
 *   npm run furniture
 *
 * Dos reglas que costó aprender y que este script respeta:
 *
 *   1. **Nunca `gltf-transform optimize`.** Su paso de `prune` borra los huesos
 *      que cree sin uso, y en Michelle se llevó trece. Acá `prune` sí se usa,
 *      pero solo sobre modelos estáticos y a propósito, para que se lleve las
 *      texturas que quedan huérfanas al partir el escritorio.
 *   2. **Nunca Draco.** Comprime más, pero obliga al navegador a bajar un
 *      decoder desde un CDN en tiempo de ejecución.
 */
import { NodeIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const RAW = join("models-raw", "furniture");
const OUT = join("public", "models", "pc");
const FBX2GLTF = join(
  "node_modules",
  "fbx2gltf",
  "bin",
  process.platform === "win32" ? "Windows_NT" : "Linux",
  process.platform === "win32" ? "FBX2glTF.exe" : "FBX2glTF"
);

/** Los nodos que forman el escritorio en sí. */
const DESK_NODES = ["Table legs", "Table top"];

/**
 * La utilería que se conserva, elegida a dedo.
 *
 * El modelo trae diecisiete objetos sueltos con veintitrés materiales entre
 * todos. Cada malla distinta es una llamada de dibujo más, y como comparten muy
 * pocos materiales no hay nada que fundir: dejarlos todos cuesta más de treinta
 * llamadas para decorar dos escritorios.
 *
 * Con cuatro piezas se consigue lo mismo. Lo que aporta la utilería es que un
 * par de puestos se vean usados; para eso alcanza con un cuaderno, un libro y
 * algo de escritorio, y nadie va a contar los post-its que faltan.
 */
const PROP_NODES = ["Notebook", "Closed book", "Holder", "Pencil"];

/**
 * Las extensiones hay que registrarlas para poder leer.
 *
 * `Table.glb` viene de Blender y usa `KHR_texture_transform`; sin registrarla,
 * la lectura falla en vez de ignorarla, que es lo correcto — una extensión
 * desconocida puede cambiar cómo se ve el modelo, y escribirlo sin ella daría
 * un archivo distinto del que entró.
 */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const kb = (path: string) => (statSync(path).size / 1024).toFixed(0) + " KB";

function fbxToGlb(input: string, output: string) {
  execFileSync(
    FBX2GLTF,
    ["--binary", "--input", input, "--output", output.replace(/\.glb$/, "")],
    { stdio: "pipe" }
  );
}

/**
 * Deja en el documento solo los nodos pedidos (o todos menos esos) y limpia.
 *
 * `prune` es lo que hace que partir sirva de algo: al sacar los nodos de la
 * utilería, las trece texturas de libros y post-its quedan sin referencias y se
 * van con ellos. Sin ese paso las dos mitades pesarían lo mismo que el entero.
 */
function keepNodes(doc: Document, names: string[]) {
  const scene = doc.getRoot().getDefaultScene()!;
  for (const node of scene.listChildren()) {
    if (!names.includes(node.getName())) node.dispose();
  }
}

async function compress(doc: Document, size: number) {
  await doc.transform(
    resample(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size] }),
    prune()
  );
}

/**
 * Baja el conteo de triángulos.
 *
 * Hace falta cuando el peso es malla y no textura: la silla ocupa 4,7 MB sin
 * una sola imagen. Va repetida seis veces en el salón, y aunque instanciada se
 * dibuje de una sola llamada, cada instancia igual paga sus vértices en el
 * sombreador.
 *
 * `weld` va primero y no es opcional: el simplificador necesita que los
 * vértices que comparten posición estén unificados, y una malla exportada de
 * FBX suele traerlos duplicados por cada cara. Sin soldar antes, el
 * simplificador no puede colapsar nada y no baja el conteo.
 */
async function decimate(doc: Document, ratio: number) {
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 })
  );
}

async function main() {
  if (!existsSync(RAW)) {
    console.error(`Falta ${RAW}/. Poné ahí los modelos crudos.`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  // --- Monitor y silla: vienen en FBX ---
  for (const [source, target, textureSize, decimateTo] of [
    // 28.300 triángulos para un monitor con teclado es desproporcionado. Un
    // cuarto sigue dando de sobra para la silueta de un CRT, que es casi toda
    // caras planas, y se ve de cerca solo al sentarse.
    ["CRT+Monitor.fbx", "monitor.glb", 512, 0.25],
    // La silla trae unos 170.000 triángulos: es malla pura, sin una sola
    // textura, y va repetida seis veces. Un plástico moldeado tolera bien la
    // decimación porque son superficies grandes y suaves.
    ["Plastic+Chair.fbx", "chair.glb", 512, 0.06],
  ] as const) {
    const input = join(RAW, source);
    if (!existsSync(input)) {
      console.warn(`  (falta ${source}, se saltea)`);
      continue;
    }
    const temp = join(RAW, `_${target}`);
    fbxToGlb(input, temp);

    const doc = await io.read(temp);
    if (decimateTo < 1) await decimate(doc, decimateTo);
    await compress(doc, textureSize);
    await io.write(join(OUT, target), doc);
    console.log(`${source} → ${target}  ${kb(input)} → ${kb(join(OUT, target))}`);
  }

  // --- Escritorio: se parte en mueble y utilería ---
  const table = join(RAW, "Table.glb");
  if (existsSync(table)) {
    for (const [target, keep] of [
      ["desk.glb", DESK_NODES],
      ["desk-props.glb", PROP_NODES],
    ] as const) {
      const doc = await io.read(table);
      keepNodes(doc, keep);
      // 512 y no 1024: el escritorio son dieciocho triángulos con texturas de
      // hormigón y madera de 1K. A esa resolución las imágenes pesan sesenta
      // veces más que la geometría que visten, para un mueble que se ve a
      // varios metros y en penumbra.
      await compress(doc, 512);
      await io.write(join(OUT, target), doc);
      console.log(
        `Table.glb → ${target}  ${kb(table)} → ${kb(join(OUT, target))}` +
          `  (${doc.getRoot().listTextures().length} texturas, ` +
          `${doc.getRoot().listMeshes().length} mallas)`
      );
    }
  }
}

main();
