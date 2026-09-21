/**
 * Los proyectos, y la única fuente de verdad sobre ellos.
 *
 * De acá salen las computadoras del salón, la ficha que se abre al usarlas y la
 * versión en texto para buscadores y lectores de pantalla. Agregar un proyecto
 * es agregar una entrada: aparece una máquina más en el local.
 *
 * El `id` también nombra su captura: `public/projects/<id>.webp`.
 *
 * El orden es el orden físico en el salón, de la puerta hacia el fondo. Lo que
 * mejor represente el trabajo va primero, que es lo que el visitante ve apenas
 * entra.
 */

export type Project = {
  /** Identificador estable. Nombra el objeto interactivo y la captura. */
  id: string;
  nombre: string;
  /** Una línea, la que se lee en la pantalla desde lejos. */
  tagline: string;
  /** Dos o tres frases: qué es y qué problema resuelve. */
  descripcion: string;
  /**
   * Qué partes del sistema construí.
   *
   * Se muestra explícito en la ficha porque es la pregunta que hace todo el
   * que mira un portfolio y casi nadie responde: una landing linda y un sistema
   * con backend propio no son el mismo trabajo.
   */
  front: string | null;
  back: string | null;
  stack: string[];
  /** Lo que hace a este proyecto distinto de los otros cinco. */
  destacado: string;
};

export const PROJECTS: Project[] = [
  {
    id: "crecivai",
    nombre: "CrecivAI",
    tagline: "Portfolio de inversiones con análisis por IA",
    descripcion:
      "Plataforma que sigue una cartera de inversiones y la contextualiza con IA: detecta riesgos, oportunidades y movimientos del mercado, y los explica en lenguaje concreto en vez de devolver más números.",
    front: "React · React Query · Recharts · Framer Motion",
    back: "Express · PostgreSQL (Neon) · WebSockets · cron",
    stack: [
      "React",
      "Express",
      "PostgreSQL",
      "Neon",
      "React Query",
      "Recharts",
      "JWT",
      "Google OAuth",
      "Docker",
    ],
    destacado:
      "Cotizaciones en vivo por WebSocket y tareas programadas que arman el contexto antes de que el usuario entre.",
  },
  {
    id: "staffmodern",
    nombre: "Staff Modern",
    tagline: "Reservas online para una peluquería",
    descripcion:
      "Sitio de turnos para un local real. La interfaz está pensada para que reserve alguien que no usa aplicaciones, y el panel para que lo maneje quien atiende, no un administrador de sistemas.",
    front: "React 19 · TypeScript · Tailwind 4 · Motion",
    back: "Vercel Functions · zod · Google OAuth",
    stack: [
      "React 19",
      "TypeScript",
      "Tailwind 4",
      "Vercel Functions",
      "zod",
      "Google OAuth",
      "Motion",
    ],
    destacado:
      "El esquema de validación es el mismo en el cliente y en el servidor: una sola definición, imposible que se desincronicen.",
  },
  {
    id: "recuvarilla",
    nombre: "Recuvarilla",
    tagline: "El producto explicado en 3D, al hacer scroll",
    descripcion:
      "Sitio industrial de varillas de plástico recuperado. El producto se entiende viéndolo: una escena 3D avanza con el scroll y muestra cómo se fabrica y cómo se instala en un alambrado.",
    front: "React Three Fiber · three.js · Tailwind",
    back: "Supabase",
    stack: ["React Three Fiber", "three.js", "Supabase", "Vite", "Tailwind"],
    destacado:
      "Las texturas PBR se generan por código en un canvas. Un set fotográfico pesa unos 2 MB por material; acá el costo de red es cero.",
  },
  {
    id: "recuvarilla-erp",
    nombre: "Recuvarilla ERP",
    tagline: "La gestión completa del mismo negocio",
    descripcion:
      "Sistema interno para operar la empresa: leads y su embudo, clientes, pedidos, stock, caja, costos, rentabilidad y fletes. Convive con el sitio público en el mismo despliegue, bajo /erp.",
    front: "React · React Router · Tailwind",
    back: "Supabase · Postgres",
    stack: ["React", "React Router", "Supabase", "PostgreSQL", "Tailwind"],
    destacado:
      "El embudo calcula dónde se cae cada venta sobre el historial real de cada lead, y cuánto tarda en salir de cada etapa.",
  },
  {
    id: "neumaticos",
    nombre: "Neumáticos Lisandro",
    tagline: "Catálogo industrial que convierte en consulta",
    descripcion:
      "Sitio comercial de neumáticos y recapados para flotas. Todo el recorrido está armado para terminar en un contacto directo por WhatsApp, que es como compra el cliente de este rubro.",
    front: "React · GSAP · Framer Motion · EmailJS",
    back: null,
    stack: ["React", "GSAP", "Framer Motion", "EmailJS", "Vite"],
    destacado:
      "Sin backend a propósito: el formulario va por EmailJS y el resto es WhatsApp. Nada que mantener, nada que se caiga.",
  },
  {
    id: "franco-cuatto",
    nombre: "Franco Cuatto",
    tagline: "Portfolio de un productor de música para cine",
    descripcion:
      "Sitio de un compositor audiovisual, con su obra organizada por secciones y un panel propio para cargarla sin tocar código.",
    front: "React · Tailwind · Radix UI",
    back: "Express · Sequelize · MySQL",
    stack: [
      "React",
      "Tailwind",
      "Radix UI",
      "Express",
      "Sequelize",
      "MySQL",
      "bcrypt",
    ],
    destacado:
      "Autenticación con sesiones y contraseñas cifradas, para que el dueño administre su propio contenido.",
  },
];
