# Créditos de assets

Cada modelo, textura, tipografía o sonido de terceros que entra al proyecto se
anota acá **en el momento en que se incorpora**, no al final. Un portfolio con
arte mal licenciado es un problema real, y reconstruir la procedencia de treinta
archivos meses después es imposible.

## Fuentes habituales

| Fuente | Licencia típica | Atribución |
|---|---|---|
| [Quaternius](https://quaternius.com) | CC0 | No |
| [Kenney](https://kenney.nl) | CC0 | No |
| [Poly Pizza](https://poly.pizza) | Varía por modelo — **verificar cada uno** | Según modelo |
| [Mixamo](https://mixamo.com) | Uso comercial permitido con cuenta Adobe | No |

---

## Modelos 3D

### `kit/*.glb` — Building Kit

- **Autor:** Kenney
- **Fuente:** https://kenney.nl/assets/building-kit
- **Licencia:** CC0 1.0 (dominio público). Uso comercial permitido.
- **Atribución requerida:** No, pero se acredita igual.
- **Versión:** 1.0 (29-03-2025)

**Características del kit** (medidas al incorporarlo, valen para posicionar):

- Grilla modular de **2 unidades**; muros de **2,4 de alto**. Está autorizado en
  metros, que es la escala del proyecto, así que **no se reescala nada**.
- Origen de los muros: centrado en el ancho, con la base en `y = 0`. El ancho
  corre sobre **Z** y el espesor sobre X, así que un muro que deba mirar a la
  cámara va rotado 90° en Y (ver `FACING_CAMERA` en `Facade.tsx`).
- Las piezas `-detailed` tienen el marco saliente hasta `z = 0,1`: cualquier
  cosa que se apoye encima tiene que ir más adelante o se clava adentro.
- **Dos materiales en todo el kit**: `colormap` (atlas de 512×512 con bandas de
  color) y `glass` en las ventanas. Por eso alcanza con tocar dos materiales
  para unificar el kit entero — ver `src/three/world/kit.ts`.
- Los GLB referencian la textura por ruta relativa (`Textures/colormap.png`),
  así que ese archivo tiene que acompañarlos en `public/models/kit/Textures/`.

**Modificaciones:** materiales repintados en código (el atlas se tiñe, no se
reemplaza) y el vidrio cambiado por uno físico transparente. Los archivos `.glb`
están sin tocar.

**Del pack se usan 23 de las 79 piezas.** El resto queda en `models-raw/`
(ignorado por git); si hace falta una nueva, se copia desde ahí.

---

## Tipografías

### `public/fonts/Audiowide-Regular.ttf`

- **Autor:** Astigmatic (AOETI)
- **Fuente:** https://fonts.google.com/specimen/Audiowide
- **Licencia:** SIL Open Font License 1.1
- **Uso:** el cartel de neón "CYBERSTUDIO" y la cartelería del mundo 3D.

### `public/fonts/Monoton-Regular.ttf`

- **Autor:** Vernon Adams
- **Fuente:** https://fonts.google.com/specimen/Monoton
- **Licencia:** SIL Open Font License 1.1
- **Uso:** todavía ninguno. Descargada como alternativa para carteles de neón
  (es un diseño de trazo múltiple, pensado justamente para marquesinas).

Van self-hosted a propósito: `troika-three-text`, que es lo que usa el `<Text>`
de drei, si no le pasás una fuente se la baja del CDN de Google en runtime.

---

## Personajes

### `michelle.glb` + `anim/*.glb` — Michelle

- **Autor:** Adobe (Mixamo)
- **Fuente:** https://www.mixamo.com
- **Licencia:** uso comercial permitido con cuenta de Adobe. Se puede usar el
  personaje y las animaciones dentro de un proyecto, pero **no redistribuir los
  archivos como assets**: acá van embebidos en la aplicación, que es uso
  permitido.
- **Clips:** `Walking` (con *In Place*), `Typing`, `Stand To Sit`. El personaje
  se descargó *With Skin* y cada animación *Without Skin*.

**Lo que hubo que aprender para que funcione:**

- El modelo y las animaciones vienen en archivos distintos y se unen en
  runtime. Funciona porque comparten los 65 huesos `mixamorig:` con los mismos
  nombres: el mezclador de three resuelve cada pista buscando el nodo por
  nombre. Ver `src/three/player/clips.ts`.
- **`Walking` tiene que bajarse con *In Place***. Sin esa opción el clip trae
  el desplazamiento incorporado y el personaje se va caminando solo, porque la
  posición ya la maneja `playerState`. Verificado: las caderas se mueven 6 cm
  en todo el ciclo.
- **El primer fotograma de las animaciones es la pose de bind**, en T. Congelar
  el frame cero para usarlo de reposo deja al personaje crucificado y con la
  malla estirada en púas hacia los costados. La pose de reposo se toma a los
  0,35 s del clip `Stand To Sit`.
- 13 de los 65 huesos no tienen pista de rotación: son terminales
  (`HeadTop_End`, puntas de dedos, `Toe_End`) y no deforman la malla. Es normal.
- **Falta el clip de reposo.** Mientras no se baje "Breathing Idle", el reposo
  es una pose estática sintetizada desde `Stand To Sit` — correcta, pero sin
  respiración.

**Modificaciones:** texturas reescaladas a 1024 y convertidas a WebP, que
llevaron el archivo de 19,9 MB a 1,2 MB. **Sin `gltf-transform optimize`**: su
paso de `prune` borra 13 huesos que considera sin uso, y para `Typing` los
dedos importan. Tampoco Draco, que obligaría a cargar un decoder desde un CDN.
Rugosidad y `envMapIntensity` ajustados en código para la escena de neón.


---

## Mobiliario del salón

Los tres modelos los aportó el usuario. Se procesan con `npm run furniture`
desde `models-raw/furniture/`; el script documenta las reglas del pipeline.

### `pc/desk.glb` y `pc/desk-props.glb` — escritorio con utilería

- **Origen:** `Table.glb`, entregado por el usuario (Blender, glTF 2.0).
- **Verificar la licencia antes de publicar.**

**Lo que hubo que medir para colocarlo:**

- Llega a escala arbitraria y con la base en `y = -2`. Mide 2,2 × 4 × 5,6.
- **La tapa está a 3,01 de las 4 unidades de alto**; lo que sigue por encima es
  un respaldo. Por eso se normaliza la caja a 1,00 y no a 0,75: así la
  superficie —lo único que importa para apoyar el monitor— cae en 0,755.
- Su lado largo corre sobre **Z**, que es la orientación de la pared izquierda:
  apoya sin rotar sobre su eje vertical. Sí va girado media vuelta, para que el
  respaldo quede contra la pared y no tapándole el teclado a quien se sienta.
- Venía con la utilería pegada: 19 mallas, 25 materiales, 15 texturas de 1K.
  Se parte en dos archivos para no repetir los libros en los seis puestos.
- **De las 17 piezas de utilería se conservan 4.** No por peso sino por llamadas
  de dibujo: tienen 23 materiales entre todas, así que no hay nada que fundir y
  cada una cuesta una llamada. Cuatro alcanzan para que un par de puestos se
  vean usados.

### `pc/monitor.glb` — monitor CRT con teclado

- **Origen:** `CRT+Monitor.fbx`, entregado por el usuario.
- Incluye el teclado en la misma malla. 28.300 triángulos de origen, decimado
  al 25%.

### `pc/chair.glb` — silla de plástico

- **Origen:** `Plastic+Chair.fbx`, entregado por el usuario.
- 4,7 MB **sin una sola textura**: era malla pura, unos 170.000 triángulos.
  Decimada al 6%. Va girada media vuelta: sin eso el respaldo queda contra el
  escritorio y el visitante se sentaría de espaldas al monitor.

**Peso total tras procesar: 932 KB, contra 17,5 MB en crudo.**
