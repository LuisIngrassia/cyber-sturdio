# CyberStudio

Un cybercafé 3D explorable, en vez de un portfolio con scroll. Cada elemento
del local es una sección: las computadoras son proyectos, la barra son los
servicios, detrás de la puerta de STAFF estoy yo trabajando, y hay un tablero
de dardos con ranking.

Referencia de estilo e interacción:
[Jesse's Ramen Shop](https://github.com/enderh3art/Ramen-Shop).

## Estado

**Fase 0 — fundaciones.** La escena es un grey-box: cajas, un piso y unos tubos
de neón, sin ningún modelo importado. Existe para responder una sola pregunta
antes de invertir semanas en contenido: *¿el pipeline de iluminación y
postprocesado alcanza para que esto se vea bien sin un artista 3D?*

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

## Assets

Todo modelo, textura o sonido de terceros se anota en
[`public/models/CREDITS.md`](public/models/CREDITS.md) **en el momento de
incorporarlo**, con autor, URL y licencia.
