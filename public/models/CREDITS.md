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

### `avatar.glb` — Man (Animated Men Pack)

- **Autor:** Quaternius
- **Fuente:** https://poly.pizza/bundle/Animated-Men-Pack-DAC9SDgMQT
- **Licencia:** CC0 1.0 (dominio público). Uso comercial permitido.
- **Atribución requerida:** No, pero se acredita igual.

**Características medidas al incorporarlo:**

- Once clips de animación con el prefijo del armature
  (`HumanArmature|Man_Idle`, `…|Man_Walk`, `…|Man_Sitting`, `…|Man_Typing`…).
  Se buscan **por sufijo**, no por igualdad: si se cambia de modelo el prefijo
  cambia y el sufijo no.
- Sin texturas: materiales planos por nombre (`Shirt`, `Skin`, `Pants`, `Hair`),
  lo que hace trivial repintarlo a la paleta del local.
- **La altura hay que medirla sobre los huesos, no sobre la malla.** El
  armature lleva la escala (×100) y la geometría está en pose de bind: medido
  con `Box3.setFromObject` da nueve milímetros y el avatar sale doscientas
  veces más grande que el edificio. El esqueleto mide 4,2324 y la escala que
  lo lleva a 1,75 m es 0,3639 — pero se calcula en runtime para que cambiar de
  personaje no obligue a volver a medir a mano.
- El frente del modelo apunta a +Z, que es la convención que usa
  `player.facing`. No hace falta corregir la rotación.

**Modificaciones:** rugosidad, metalness y `envMapIntensity` ajustados en
código para que el personaje no se vea recortado sobre una escena de neón. El
`.glb` está sin tocar.
