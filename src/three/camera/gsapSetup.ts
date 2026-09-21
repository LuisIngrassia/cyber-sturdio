import gsap from "gsap";

/**
 * Desactiva el suavizado de retrasos de GSAP.
 *
 * Por defecto, GSAP considera que un frame de más de medio segundo fue una
 * pausa del navegador —una pestaña en segundo plano, un bloqueo del hilo— y no
 * avanza el tiempo de las animaciones, para que nada dé un salto al volver.
 *
 * Para las tomas de cámara eso es exactamente lo contrario de lo que se quiere.
 * En una máquina lenta, o durante un tirón de carga, los frames pasan ese medio
 * segundo y el vuelo hacia adentro o el acercamiento a una pantalla se congelan
 * a mitad de camino: la cámara se queda en una posición intermedia y el
 * visitante ve un encuadre que nadie diseñó, sin forma de salir.
 *
 * Una toma de cámara tiene que durar lo que dura en el reloj, salte lo que
 * salte. Se importa desde `enterShot` y `focusShot`, que son quienes las usan.
 */
gsap.ticker.lagSmoothing(0);
