# Capturas de los proyectos

Cada computadora del salón muestra el hero de su proyecto, y la ficha que se
abre al usarla lo muestra completo.

**El archivo se deduce del `id` en `src/data/projects.ts`:** un proyecto con
`id: "crecivai"` usa `crecivai.webp`. No hay que declararlo en ningún lado.

| Archivo | Proyecto |
|---|---|
| `crecivai.webp` | CrecivAI |
| `staffmodern.webp` | Staff Modern |
| `recuvarilla.webp` | Recuvarilla |
| `recuvarilla-erp.webp` | Recuvarilla ERP |
| `neumaticos.webp` | Neumáticos Lisandro |
| `franco-cuatto.webp` | Franco Cuatto |

## Formato

Capturas del hero a ancho de escritorio, convertidas a WebP a 1600 px de ancho.
Las actuales pesan entre 32 y 46 KB cada una.

La proporción de origen no importa: la ficha las muestra enteras y la pantalla
del monitor las recorta al centro para llenar el tubo, que es de 1,158 : 1
—30,7 × 26,5 cm en el salón—. A esa distancia el detalle no se lee: lo que
comunica la pantalla es que esa máquina tiene un sitio abierto.

Para agregar una:

```bash
npx sharp-cli -i captura.png -o public/projects/<id>.webp resize 1600 --withoutEnlargement
```

## Si falta una

La pantalla muestra el nombre del proyecto dibujado por código y el salón
funciona igual. En la consola aparece un 404 hasta que se agregue el archivo.
