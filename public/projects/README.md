# Capturas de los proyectos

Cada computadora del salón muestra el hero de su proyecto en la pantalla.

**El archivo se deduce del `id` en `src/data/projects.ts`:** un proyecto con
`id: "codexa"` busca `codexa.webp` en esta carpeta. No hay que declararlo en
ningún lado.

Los seis que faltan:

| Archivo | Proyecto |
|---|---|
| `codexa.webp` | Codexa |
| `staffmodern.webp` | StaffModern |
| `recuvarillas.webp` | Recuvarillas |
| `finance-app.webp` | Finance App |
| `peluqueria.webp` | Peluquería |
| `neumaticos.webp` | Neumáticos |

## Proporción

**1,158 : 1** — más cuadrada que un monitor moderno. El área de imagen del tubo
mide 30,7 × 26,5 cm en el salón.

A 1024 de ancho son **1024 × 884**. A 1280, **1280 × 1105**.

No es 16:9: un hero exportado apaisado se recorta por los costados, y ahí suele
estar justo el título. Conviene recortar a mano eligiendo qué parte del hero
entra, en vez de dejar que se corte solo.

## Mientras tanto

La pantalla de un proyecto sin captura muestra su nombre dibujado por código.
El salón funciona igual; en la consola aparece un 404 por cada imagen pendiente
y desaparecen al agregarlas.
