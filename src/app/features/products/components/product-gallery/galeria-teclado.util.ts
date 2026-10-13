/**
 * Cuánto se mueve la selección con cada tecla. La tira se pinta en columna en escritorio y en
 * fila en móvil, así que los dos ejes navegan igual.
 *
 * Es un `Map` y no un objeto literal a propósito: con un objeto, una tecla llamada como algo del
 * prototipo (`constructor`) devolvería una función en vez de `undefined`.
 */
const PASOS = new Map<string, number>([
    ['ArrowRight', 1],
    ['ArrowDown', 1],
    ['ArrowLeft', -1],
    ['ArrowUp', -1],
]);

/**
 * Traduce una tecla a la miniatura que debe quedar activa en la galería.
 *
 * Reglas de negocio que codifica:
 * - **Navegación circular:** desde la última se vuelve a la primera y viceversa, tanto con las
 *   flechas horizontales como con las verticales (la tira se pinta en columna en escritorio y en
 *   fila en móvil, así que ambos ejes tienen que servir).
 * - **Inicio y Fin** saltan a los extremos.
 * - `null` significa «esta tecla no es mía»: quien llama NO debe hacer `preventDefault`, o la
 *   galería se comería teclas que el navegador necesita (Tab, Escape, escritura).
 * - Una galería vacía sigue reclamando las teclas de navegación (devuelve 0, un índice que el
 *   llamador descarta) porque el visor está montado igual: el usuario no debe ver la página
 *   desplazarse al pulsar las flechas sobre él.
 */
export function indiceDeTeclaGaleria(tecla: string, actual: number, total: number): number | null {
    const paso = PASOS.get(tecla);

    if (paso !== undefined) return total > 0 ? (actual + paso + total) % total : 0;
    if (tecla === 'Home') return 0;
    if (tecla === 'End') return total > 0 ? total - 1 : 0;
    return null;
}
