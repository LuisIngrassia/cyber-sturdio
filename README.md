# CyberStudio

Un cybercafé 3D explorable, en vez de un portfolio con scroll. Cada elemento
del local es una sección: las computadoras son proyectos, la barra son los
servicios, detrás de la puerta de STAFF estoy yo trabajando, y hay un tablero
de dardos con ranking.

Referencia de estilo e interacción:
[Jesse's Ramen Shop](https://github.com/enderh3art/Ramen-Shop).

## Estado

**Fase 1 — la fachada.** El local de noche: kitbash del frente con el Building
Kit de Kenney, cartel de neón con parpadeo irregular, cartel vertical, toldo,
charcos de luz en la vereda, y la vitrina dejando ver los monitores encendidos
de adentro. La puerta responde al puntero y, si pasan unos segundos sin que
nadie haga nada, aparece un anillo en el umbral señalando por dónde se entra.

Al activarla todavía no pasa nada: el vuelo de cámara hacia adentro es la
Fase 2.

Antes, la Fase 0 dejó montado el pipeline visual y lo validó con una escena de
cajas, para responder la única pregunta que podía hundir el proyecto — si el
look llegaba sin un artista 3D.

El plan completo por fases está en
`~/.claude/plans/cyberstudio-es-la-idea-quiet-wind.md`.

## Correr

```bash
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server. |
| `npm run build` | `tsc -b` + build de producción. |
| `npm run lint` | ESLint. |
| `npm run shot` | Captura la escena en un PNG (ver abajo). |
| `npm run models` | Optimiza los GLB de `models-raw/` a `public/models/`. |

## Stack

- **Vite 8 + React 19 + TypeScript + Tailwind 4**
- **react-three-fiber + drei + @react-three/postprocessing** — el mundo 3D
- **leva** — panel de tuneo en dev (ver más abajo; no es opcional)
- **gsap** — coreografía de cámara (Fase 2 en adelante)
- **zustand** — el puente entre el canvas y la interfaz DOM

## Cómo se trabaja el aspecto visual

El proyecto lo hace alguien que programa pero no modela ni dibuja. Toda la
arquitectura visual está montada alrededor de esa restricción:

1. **La oscuridad tapa el modelado pobre.** El fondo es un vacío casi negro
   donde solo existe lo iluminado.
2. **Casi nada de luces reales; casi todo emisivo + bloom.** Los charcos de
   color en el piso no son luces: son planos con degradado radial y blending
   aditivo (`src/three/lib/LightPool.tsx`).
3. **Oclusión ambiental y sombras de contacto** hacen que los objetos se vean
   apoyados y no flotando. Es lo que más separa una escena amateur de una que
   no lo parece.
4. **Paleta cerrada** en `src/three/lib/palette.ts`, replicada como tokens de
   Tailwind en `src/index.css`. Nunca se elige un color en el lugar donde se
   usa: si hace falta uno nuevo, se agrega ahí con un nombre que diga para qué
   es.

**El método, concretamente:** tener la imagen de referencia abierta al lado del
navegador y mover los sliders de `leva` hasta que se parezcan. No es diseñar,
es igualar un objetivo — que es una tarea de ingeniería. Cuando un valor queda
bien, se copia al default en el código.

El panel se saca del bundle de producción con `import.meta.env.DEV`
(`src/App.tsx`).

### Verificar que se ve

Un proyecto 3D puede compilar perfecto y renderizar una pantalla negra. Con el
dev server corriendo:

```bash
npm run shot -- http://localhost:5173 shot.png
```

Usa el Chrome ya instalado a través de `playwright-core` (no descarga ningún
navegador), espera a que se dibujen varios frames y además lista los errores de
consola.

## Lo que no es obvio del código

- **`metalness` sin environment map da negro.** Un material metálico no tiene
  componente difusa: solo refleja el entorno. La escena carga un `<Environment>`
  hecho de `<Lightformer>`s por eso, no solo por los reflejos.
- **Los colores base de la paleta parecen demasiado claros.** Es a propósito:
  con tan poca luz, un albedo bajo se multiplica por poco y da negro puro. Lo
  oscuro lo terminan de dar la viñeta, la oclusión y el tone mapping.
- **La niebla es un balance con dos filos.** Sube: los bordes de la geometría
  se funden en el vacío, pero se apagan los halos de neón. Baja: los neones
  brillan pleno, pero aparece la línea recta donde termina el piso. Por eso
  está en el panel (`src/three/lib/Atmosphere.tsx`).
- **La regla de inmutabilidad de `react-hooks` v7** no deja mutar lo que
  devolvió un hook. En r3f, donde mutar materiales por frame es lo normal, el
  material se toma del ref del mesh y no de la variable del `useMemo`.
- **El hover no es estado de React.** `Interactable` lo escribe en el store y
  los objetos lo consultan con `getState()` dentro de su `useFrame`. Si fuera
  estado, pasar el puntero por una fila de seis computadoras dispararía un
  re-render por cada una para hacer algo que el loop ya hace igual.
- **El cursor se maneja en un solo lugar** (`UILayer`), no en cada objeto. Si
  cada uno lo pone y lo saca, alcanza con que uno se desmonte con el puntero
  encima para dejar el cursor en "mano" el resto de la sesión.
- **Las piezas del kit son de Kenney y están en metros.** Grilla de 2, muros de
  2,4 de alto, y dos materiales en las 79 piezas. Los detalles que importan
  para posicionarlas están en [`public/models/CREDITS.md`](public/models/CREDITS.md).
- **`npm run shot` tarda.** Chrome headless sin GPU renderiza por software, y
  leer los píxeles de una escena con postprocesado lleva decenas de segundos.
  No está colgado.

## Assets

Todo modelo, textura o sonido de terceros se anota en
[`public/models/CREDITS.md`](public/models/CREDITS.md) **en el momento de
incorporarlo**, con autor, URL y licencia.
