import { useEffect, useState } from "react";

import type { Project } from "../../data/projects";

/**
 * La ficha del proyecto, al usar una computadora.
 *
 * Tres columnas: el hero del sitio en el medio y, a los lados, dos paneles
 * negros con los datos en tipografía de consola. La separación es el punto —
 * amontonar el stack encima de la imagen lo vuelve ilegible, y lo que el
 * visitante vino a saber es justamente qué hay debajo de esa pantalla bonita.
 *
 * Es DOM y no geometría. Un panel de texto dentro del canvas obliga a
 * reinventar el salto de línea, el foco y el scroll, y no lo lee un lector de
 * pantalla. Acá es HTML: se selecciona, se amplía y se navega con el teclado.
 */

export type ProjectScreenProps = {
  project: Project;
  /** Posición en la lista, para el contador del encabezado. */
  index: number;
  total: number;
  onClose: () => void;
};

/** Una sección del panel lateral. */
function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h3 className="text-magenta mb-2 font-mono text-[10px] tracking-[0.3em]">
        {label}
      </h3>
      {children}
    </section>
  );
}

/**
 * Una línea que se escribe sola.
 *
 * El efecto de tipeo no es decoración: retrasa cada bloque lo justo para que
 * la vista los lea en orden en vez de encontrarse seis columnas de texto de
 * golpe. Respeta `prefers-reduced-motion` mostrando todo de una.
 */
function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text : ""
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let i = 0;
    let timer: number;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 2;
        if (i >= text.length) {
          window.clearInterval(timer);
          setShown(text);
        } else {
          setShown(text.slice(0, i));
        }
      }, 12);
    }, delay);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [text, delay]);

  return <>{shown}</>;
}

export function ProjectScreen({
  project,
  index,
  total,
  onClose,
}: ProjectScreenProps) {
  const numero = String(index + 1).padStart(2, "0");

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex flex-col bg-black/92 font-mono backdrop-blur-sm">
      {/* Encabezado */}
      <header className="border-cyan/25 flex shrink-0 items-center justify-between border-b px-6 py-3 text-[11px] tracking-[0.25em]">
        <span className="text-cyan">
          // PROYECTO {numero} / {String(total).padStart(2, "0")}
        </span>
        <span className="hidden text-white/35 sm:inline">
          {project.tagline}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="border-cyan/40 text-cyan hover:bg-cyan hover:text-void cursor-pointer border px-3 py-1 transition-colors"
        >
          ESC ✕
        </button>
      </header>

      {/**
       * Tres columnas en pantallas anchas, una sola apilada en angostas.
       * `minmax(0,·)` en la del medio: sin eso la imagen fuerza el ancho de la
       * grilla y los paneles laterales se comprimen hasta romperse.
       */}
      <div className="grid min-h-0 flex-1 gap-px overflow-y-auto lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,19rem)] lg:overflow-hidden">
        {/* Izquierda: identidad y stack */}
        <aside className="border-cyan/15 overflow-y-auto border-r bg-black px-6 py-7">
          <h2 className="text-cyan mb-1 text-2xl leading-tight font-bold tracking-tight">
            {project.nombre}
          </h2>
          <p className="mb-8 text-xs leading-relaxed text-white/40">
            {project.tagline}
          </p>

          <Block label="STACK">
            <ul className="space-y-1.5">
              {project.stack.map((tech) => (
                <li key={tech} className="text-[13px] text-white/75">
                  <span className="text-cyan/50 mr-2">▸</span>
                  {tech}
                </li>
              ))}
            </ul>
          </Block>
        </aside>

        {/* Centro: el hero del sitio */}
        <figure className="flex min-h-0 items-center justify-center bg-black p-6">
          <img
            src={`/projects/${project.id}.webp`}
            alt={`Pantalla principal de ${project.nombre}`}
            className="border-cyan/25 max-h-full w-full border object-contain shadow-[0_0_60px_-12px_var(--color-cyan)]"
          />
        </figure>

        {/* Derecha: arquitectura y descripción */}
        <aside className="border-cyan/15 overflow-y-auto border-l bg-black px-6 py-7">
          <Block label="ARQUITECTURA">
            <Layer label="FRONTEND" value={project.front} />
            <Layer label="BACKEND" value={project.back} />
          </Block>

          <Block label="QUÉ ES">
            <p className="text-[13px] leading-relaxed text-white/70">
              <Typed text={project.descripcion} delay={250} />
            </p>
          </Block>

          <Block label="LO QUE LO DISTINGUE">
            <p className="border-magenta/40 text-[13px] leading-relaxed border-l-2 pl-3 text-white/60">
              <Typed text={project.destacado} delay={700} />
            </p>
          </Block>
        </aside>
      </div>
    </div>
  );
}

/**
 * Una capa del sistema, presente o ausente.
 *
 * La ausencia se muestra igual que la presencia, en gris y con el punto
 * apagado. "Sin backend" es información —dice qué tipo de pieza es— y ocultarlo
 * dejaría al visitante sin saber si falta el dato o falta la capa.
 */
function Layer({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={
            value
              ? "bg-neon-green shadow-[0_0_8px_var(--color-neon-green)] size-1.5 rounded-full"
              : "size-1.5 rounded-full bg-white/20"
          }
        />
        <span
          className={`text-[10px] tracking-[0.2em] ${value ? "text-neon-green" : "text-white/25"}`}
        >
          {label}
        </span>
      </div>
      <p className="pl-[0.875rem] text-[13px] leading-relaxed text-white/70">
        {value ?? <span className="text-white/25">— no tiene</span>}
      </p>
    </div>
  );
}
