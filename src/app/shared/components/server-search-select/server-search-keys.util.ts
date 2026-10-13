/** Lo que el select sabe de sí mismo en el momento de la pulsación. */
export interface EstadoDelSelect {
    /** El desplegable está visible. */
    abierto: boolean;
    /** Opción resaltada; `-1` = ninguna. */
    indiceActivo: number;
    /** Cuántas opciones hay cargadas en este momento. */
    totalOpciones: number;
}

/**
 * Lo que pide una tecla. `prevenir` dice si hay que cancelar el comportamiento nativo del
 * navegador — va en la decisión y no en el llamador porque NO es constante por tecla: `Enter`
 * sólo se intercepta cuando hay una opción que elegir (si no, el formulario debe poder enviarse),
 * y `Escape` nunca se intercepta.
 */
export type AccionDeTecla =
    | { accion: 'abrir'; prevenir: true }
    | { accion: 'mover'; indice: number; prevenir: true }
    | { accion: 'seleccionar'; indice: number; prevenir: true }
    | { accion: 'cerrar'; prevenir: false };

/**
 * Navegación por teclado del select con búsqueda server-side. `null` = la tecla no es nuestra y
 * el evento sigue su curso.
 *
 * Reglas que codifica:
 * - `ArrowDown` con el desplegable cerrado lo ABRE y no mueve el resaltado (así la primera flecha
 *   no se «come» un elemento de una lista que el usuario todavía no ve).
 * - El resaltado se topa en los extremos, no da la vuelta: `ArrowUp` en el primero se queda en el
 *   primero, `ArrowDown` en el último se queda en el último. Sin opciones cargadas, `ArrowDown`
 *   deja el índice en -1 (ninguna resaltada), no en 0, que apuntaría a una opción inexistente.
 * - `Enter` sólo selecciona si el desplegable está abierto Y hay una opción resaltada existente.
 */
export function accionDeTecla(key: string, estado: EstadoDelSelect): AccionDeTecla | null {
    switch (key) {
        case 'ArrowDown':
            return estado.abierto
                ? { accion: 'mover', indice: Math.min(estado.indiceActivo + 1, estado.totalOpciones - 1), prevenir: true }
                : { accion: 'abrir', prevenir: true };
        case 'ArrowUp':
            return { accion: 'mover', indice: Math.max(estado.indiceActivo - 1, 0), prevenir: true };
        case 'Enter':
            return estado.abierto && estado.indiceActivo >= 0 && estado.indiceActivo < estado.totalOpciones
                ? { accion: 'seleccionar', indice: estado.indiceActivo, prevenir: true }
                : null;
        case 'Escape':
            return { accion: 'cerrar', prevenir: false };
        default:
            return null;
    }
}
