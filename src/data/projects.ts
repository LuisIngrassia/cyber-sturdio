/**
 * Los proyectos, y la única fuente de verdad sobre ellos.
 *
 * De acá salen las computadoras del salón, el modal que las abre y la versión
 * en texto para buscadores y lectores de pantalla. Agregar un proyecto es
 * agregar una entrada: aparece una máquina más en el local.
 *
 * El orden es el orden físico en el salón, de la puerta hacia el fondo. Lo que
 * mejor represente el trabajo va primero, que es lo que el visitante ve apenas
 * entra.
 */

export type Project = {
  /** Identificador estable. Se usa en el `id` del objeto interactivo. */
  id: string;
  nombre: string;
  /** Una línea, la que se lee en la pantalla desde lejos. */
  tagline: string;
  descripcion: string;
  stack: string[];
  rol: string;
  repo?: string;
  demo?: string;
};

export const PROJECTS: Project[] = [
  {
    id: "codexa",
    nombre: "Codexa",
    tagline: "Landing con 3D interactivo",
    descripcion:
      "Sitio de presentación con una escena 3D embebida. El desafío fue que la pieza interactiva cargara rápido sin sacrificar el impacto visual.",
    stack: ["React 19", "Vite", "Tailwind 4", "Spline"],
    rol: "Diseño técnico y desarrollo completo",
  },
  {
    id: "staffmodern",
    nombre: "StaffModern",
    tagline: "Gestión de turnos con backend propio",
    descripcion:
      "Aplicación de gestión con API serverless, validación compartida entre cliente y servidor, y autenticación con Google.",
    stack: ["React", "TypeScript", "Vercel Functions", "zod", "Google OAuth"],
    rol: "Full stack",
  },
  {
    id: "recuvarillas",
    nombre: "Recuvarillas",
    tagline: "Storytelling 3D con scroll",
    descripcion:
      "Sitio industrial donde el producto se explica con una escena 3D que avanza al hacer scroll. Las texturas se generan por código en un canvas, sin descargar un solo mapa PBR.",
    stack: ["React Three Fiber", "three.js", "Vite"],
    rol: "Concepto, 3D y desarrollo",
  },
  {
    id: "finance-app",
    nombre: "Finance App",
    tagline: "Finanzas personales, con caché pensada",
    descripcion:
      "Aplicación de finanzas con backend propio, estrategia de caché documentada y foco en la seguridad de los datos.",
    stack: ["React", "Node", "Docker", "PostgreSQL"],
    rol: "Full stack",
  },
  {
    id: "peluqueria",
    nombre: "Peluquería",
    tagline: "Reservas online para un local real",
    descripcion:
      "Sitio de turnos para una peluquería, con animaciones cuidadas y una interfaz pensada para que reserve alguien que no usa apps.",
    stack: ["React 19", "TypeScript", "Tailwind 4", "Motion"],
    rol: "Diseño y desarrollo",
  },
  {
    id: "neumaticos",
    nombre: "Neumáticos",
    tagline: "Catálogo con captación de consultas",
    descripcion:
      "Catálogo comercial con formulario de contacto directo y animaciones de scroll, orientado a convertir la visita en una consulta.",
    stack: ["React", "GSAP", "Framer Motion", "EmailJS"],
    rol: "Diseño y desarrollo",
  },
];
