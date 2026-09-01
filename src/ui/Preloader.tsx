import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

import { useUIStore } from "../state/store";

/**
 * La pantalla de carga y la puerta de entrada a la experiencia.
 *
 * Cumple dos funciones, y la segunda es la importante:
 *
 *   1. Tapa la escena mientras cargan los modelos, para que el visitante no
 *      vea el local apareciendo de a pedazos.
 *   2. Da el gesto explícito de "entrar". Hace falta porque los navegadores
 *      no dejan arrancar audio sin una interacción del usuario: sin un botón,
 *      la Fase 8 no tiene dónde encender el sonido. Y de paso da un momento
 *      para presentar el lugar antes de soltar a la persona adentro.
 *
 * `useProgress` de drei lee el LoadingManager global de three, así que funciona
 * desde el DOM sin estar dentro del <Canvas>.
 */
export function Preloader() {
  const { progress, active } = useProgress();
  const started = useUIStore((s) => s.started);
  const start = useUIStore((s) => s.start);

  // La carga puede terminar en un parpadeo con caché caliente, y un preloader
  // que aparece y desaparece de golpe se lee como un defecto. Este estado lo
  // mantiene hasta que efectivamente terminó de cargar.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const timer = setTimeout(() => setReady(true), 250);
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  if (started) return null;

  return (
    <div className="bg-void pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-magenta text-4xl tracking-[0.3em] uppercase drop-shadow-[0_0_18px_var(--color-magenta)]">
          CyberStudio
        </h1>
        <p className="mt-3 text-sm tracking-widest text-white/40 uppercase">
          Abierto toda la noche
        </p>
      </div>

      {ready ? (
        <button
          type="button"
          onClick={start}
          className="neon-frame text-cyan hover:text-void hover:bg-cyan cursor-pointer px-10 py-3 text-sm tracking-[0.25em] uppercase transition-colors"
        >
          Entrar
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* La barra usa scaleX y no width: se anima en la GPU y no dispara
              reflow del layout en cada frame de la carga. */}
          <div className="h-px w-56 overflow-hidden bg-white/10">
            <div
              className="bg-cyan h-full origin-left transition-transform duration-300"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <span className="text-[10px] tracking-[0.2em] text-white/30 tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}
