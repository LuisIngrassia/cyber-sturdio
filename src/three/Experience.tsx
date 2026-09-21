import {
  Bvh,
  OrbitControls,
  PerformanceMonitor,
  Preload,
  Stats,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { useUIStore } from "../state/store";
import { CameraRig, type CameraMode } from "./camera/CameraRig";
import { walkInAndEnter } from "./camera/enterShot";
import { focusOn, releaseFocus } from "./camera/focusShot";
import { applyDevStart } from "./devStart";
import { Effects } from "./Effects";
import { Atmosphere } from "./lib/Atmosphere";
import { PerfProbe } from "./lib/PerfProbe";
import { useQuality } from "./lib/quality";
import { Avatar } from "./player/Avatar";
import { player, walkTo } from "./player/playerState";
import { WalkableFloor } from "./player/WalkableFloor";
import { Facade } from "./world/Facade";
import { Interior, ROOM } from "./world/Interior";
import {
  DESK_SURFACE_Y,
  DESK_X,
  stationAnchor,
  type Station,
} from "./world/stations";
import { Workstations } from "./world/Workstations";

/**
 * El atajo de desarrollo se resuelve una sola vez, en el módulo.
 *
 * Va acá arriba y no en un efecto para que ya esté aplicado en el primer
 * render: si el modo de cámara arrancara en "orbit" y recién después se
 * corrigiera, el primer frame se vería desde la calle y con los OrbitControls
 * montados, y quedaría un parpadeo en cada recarga.
 */
const startedInside = applyDevStart();

/** El contenido del mundo: los ambientes, el avatar y la cámara. */
function World() {
  const zone = useUIStore((s) => s.zone);
  const setZone = useUIStore((s) => s.setZone);
  const [cameraMode, setCameraMode] = useState<CameraMode>(
    startedInside ? "follow" : "orbit"
  );
  const inside = zone !== "facade";

  const enter = useCallback(() => {
    // La cámara pasa a modo guionado antes de arrancar la toma: si siguiera en
    // órbita, los OrbitControls le pisarían la posición en el mismo frame.
    setCameraMode("cinematic");
    walkInAndEnter((x, z) => walkTo("facade", x, z), {
      bounds: ROOM,
      onEnterInterior: () => setZone("interior"),
      onComplete: () => setCameraMode("follow"),
    });
  }, [setZone]);

  const setFocused = useUIStore((s) => s.setFocused);
  const focused = useUIStore((s) => s.focused);
  const openScreen = useUIStore((s) => s.openScreen);

  /**
   * Usar una máquina: caminar hasta ella y acercar la cámara a la pantalla.
   *
   * El enfoque se encadena a la llegada y no se dispara junto con el click. Si
   * la cámara se acercara de una, dejaría al avatar caminando fuera de cuadro y
   * el visitante vería la pantalla antes de haber llegado, que rompe la idea de
   * que hay un cuerpo recorriendo el lugar.
   */
  const useStation = useCallback(
    (station: Station) => {
      const anchor = stationAnchor(station);
      const arrive = () => {
        setCameraMode("cinematic");
        setFocused(station.id);
        // Mirando la pantalla, de frente y un poco por encima. La ficha se
        // abre cuando la cámara llegó, no al arrancar: si apareciera de una,
        // taparía el movimiento que la trajo hasta acá y la transición no se
        // vería nunca.
        focusOn({
          look: new THREE.Vector3(DESK_X + 0.1, DESK_SURFACE_Y + 0.3, station.z),
          from: new THREE.Vector3(DESK_X + 1.25, DESK_SURFACE_Y + 0.45, station.z),
        }).eventCallback("onComplete", () => {
          // Si el visitante apretó Esc mientras la cámara viajaba, la toma
          // termina igual: sin esta guarda, abriría la ficha de una máquina
          // que ya dejó de mirar.
          if (useUIStore.getState().focused === station.id) {
            openScreen("project", station.id);
          }
        });
        // El avatar queda mirando al escritorio.
        player.facing = -Math.PI / 2;
      };

      if (walkTo("interior", anchor.x, anchor.z)) {
        player.onArrive = arrive;
      } else {
        arrive();
      }
    },
    [setFocused]
  );

  /**
   * Soltar el enfoque y devolver la cámara al seguimiento.
   *
   * Cierra también la ficha si estaba abierta. Son dos capas y el visitante las
   * percibe como una sola cosa: dejar de mirar esa computadora.
   */
  const release = useCallback(() => {
    const state = useUIStore.getState();
    if (!state.focused && !state.screen) return;

    state.closeScreen();
    setFocused(null);
    releaseFocus(ROOM, () => setCameraMode("follow"));
  }, [setFocused]);

  /**
   * `Esc` sale del enfoque.
   *
   * El atajo vive acá y no en la capa de interfaz porque lo que cambia es el
   * modo de la cámara, que es estado de esta escena. La interfaz solo muestra
   * el aviso.
   */
  useEffect(() => {
    if (!focused) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") release();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, release]);

  /**
   * El botón de cerrar de la ficha también suelta la cámara.
   *
   * La ficha vive en la capa DOM y no sabe nada del mundo 3D —esa es la regla
   * de la arquitectura— así que cierra lo suyo y acá nos enteramos por el
   * store.
   *
   * Se escucha la *transición* de abierta a cerrada, no el estado. Mirando solo
   * si hay ficha abierta, el segundo que pasa entre que la cámara empieza a
   * acercarse y la ficha aparece cuenta como "cerrada" y el enfoque se cancela
   * solo, antes de llegar.
   *
   * Y va por la suscripción del store en vez de un efecto sobre el render: así
   * la reacción ocurre fuera del ciclo de React, sin disparar un render en
   * cascada.
   */
  useEffect(
    () =>
      useUIStore.subscribe((state, previous) => {
        if (previous.screen === "project" && state.screen === null) release();
      }),
    [release]
  );

  return (
    <>
      {/**
       * La fachada queda montada también estando adentro.
       *
       * Es el mismo volumen visto de los dos lados: el muro del frente, la
       * vitrina y la puerta son las mismas piezas. Desmontarla al entrar
       * dejaría el salón abierto al vacío justo por donde el visitante acaba de
       * pasar, y además cortaría el vuelo continuo a la mitad.
       */}
      <Facade onEnter={enter} active={!inside} />
      {inside && (
        <>
          <Interior />
          <Workstations onUse={useStation} />
        </>
      )}

      <Avatar />
      <WalkableFloor onWalk={release} />

      {/* Adentro, la cámara no puede salirse del salón. Ver CameraRig. */}
      <CameraRig mode={cameraMode} bounds={inside ? ROOM : undefined} />

      {/**
       * Órbita acotada, solo en la fachada.
       *
       * Los límites no son un detalle: el diorama es una isla en el vacío y
       * está modelado solo del lado que se ve. Sin tope azimutal el visitante
       * gira hasta atrás y encuentra que el local no tiene fondo; sin tope
       * polar, mira desde arriba y ve que no hay techo.
       *
       * Adentro se desmonta por completo, porque ahí manda el rig que sigue al
       * avatar y dos cosas escribiendo sobre la misma cámara pelean.
       */}
      {cameraMode === "orbit" && (
        <OrbitControls
          makeDefault
          target={[0, 1.9, 0]}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={Math.PI / 6}
          minAzimuthAngle={-Math.PI / 3.5}
          maxAzimuthAngle={Math.PI / 3.5}
          minDistance={6}
          maxDistance={22}
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
        />
      )}
    </>
  );
}

/**
 * El canvas y todo lo que vive adentro.
 *
 * Nada de interfaz de usuario entra acá: los modales y formularios son DOM
 * real, montados aparte en UILayer y comunicados por el store. Ver
 * src/state/store.ts.
 */
export function Experience() {
  const quality = useQuality();
  // El monitor de performance baja el DPR si el framerate cae. Empieza en el
  // techo del perfil y se ajusta solo.
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const declined = useRef(false);
  const started = useUIStore((s) => s.started);

  return (
    <Canvas
      dpr={dpr}
      /**
       * Sin mapa de sombras.
       *
       * Nada en la escena proyecta sombra dinámica: el local es estático y el
       * avatar lleva la suya pintada abajo. Dejarlo encendido reservaría los
       * render targets y haría un pase extra de la escena por cada luz que lo
       * pidiera, para dibujar algo que no cambia nunca. El volumen lo dan la
       * oclusión ambiental y las sombras de contacto, calculadas una sola vez.
       */
      shadows={false}
      gl={{
        // El antialiasing del contexto solo cuando SMAA no corre; tenerlos a
        // los dos es pagar dos veces por lo mismo.
        antialias: !quality.smaa,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ position: [0, 2.8, 10], fov: 45, near: 0.1, far: 100 }}
    >
      {/* El vacío negro y la niebla que funde los bordes. */}
      <Atmosphere />

      {/**
       * Un solo sistema decide la resolución.
       *
       * Antes convivían `PerformanceMonitor` y `<AdaptiveDpr pixelated />`: el
       * primero movía `performance.current` y el segundo lo multiplicaba por el
       * DPR base, así que la resolución subía y bajaba sola y el escalado
       * pixelado hacía que cada bajada se viera en bloques. Eso era la mitad de
       * la falta de nitidez.
       *
       * La otra mitad: el monitor arrancaba montado desde el primer frame, y el
       * bajón de la carga —que es inevitable y no dice nada del rendimiento
       * real— bastaba para fijar el DPR al piso por el resto de la sesión. Por
       * eso ahora solo se monta una vez que el visitante entró.
       */}
      {started && (
        <PerformanceMonitor
          onDecline={() => {
            // Una sola vez: si se deja que suba y baje solo, el cambio de
            // nitidez de ida y vuelta se nota más que ir siempre un punto bajo.
            if (declined.current) return;
            declined.current = true;
            setDpr(quality.dpr[0]);
          }}
        />
      )}

      {/**
       * Bvh acelera el raycasting. Importa acá: el click-to-walk lanza un rayo
       * contra toda la escena en cada movimiento del puntero.
       */}
      <Bvh firstHitOnly>
        <Suspense fallback={null}>
          <World />
          <Preload all />
        </Suspense>
      </Bvh>

      <Effects />

      {/**
       * Contador de FPS, solo en desarrollo.
       *
       * En 3D el rendimiento no se "nota" hasta que ya está roto, y sin un
       * número a la vista es imposible saber si un cambio ayudó o empeoró.
       * Sale del bundle de producción con la rama muerta de import.meta.env.
       */}
      {import.meta.env.DEV && <Stats />}
      {import.meta.env.DEV && <PerfProbe />}
    </Canvas>
  );
}
