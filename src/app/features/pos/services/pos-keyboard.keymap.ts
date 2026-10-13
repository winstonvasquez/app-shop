import type { PosScreen } from '../components/pos-topbar/pos-topbar.component';

/** Lo que una tecla del POS pide hacer: cambiar de pantalla, o ejecutar una acción del cajero. */
export type PosKeyAction =
    | { type: 'navigate'; screen: PosScreen }
    | { type: 'action'; name: 'nuevaVenta' | 'cobrar' | 'holdOrder' | 'recallOrder' | 'customerSearch' | 'toggleFullscreen' | 'toggleShortcuts' };

/**
 * Distribución de teclas del punto de venta. Es la ÚNICA fuente de la asignación: la lista que
 * pinta el panel de ayuda (`POS_SHORTCUTS`) describe lo mismo para el usuario, y si las dos
 * divergen manda ésta, porque es la que ejecuta.
 *
 * Una tecla no asignada devuelve `null`, y eso importa: el llamador sólo hace `preventDefault()`
 * cuando hay acción, para no secuestrar las teclas del navegador (F6, F11, F12…).
 */
export function mapearTeclaPos(key: string): PosKeyAction | null {
    switch (key) {
        case 'F1': return { type: 'action', name: 'nuevaVenta' };
        case 'F2': return { type: 'action', name: 'holdOrder' };
        case 'F3': return { type: 'action', name: 'recallOrder' };
        case 'F4': return { type: 'action', name: 'customerSearch' };
        case 'F5': return { type: 'action', name: 'cobrar' };
        case 'F7': return { type: 'navigate', screen: 'historial' };
        case 'F8': return { type: 'navigate', screen: 'devoluciones' };
        case 'F9': return { type: 'navigate', screen: 'turno' };
        case 'F10': return { type: 'action', name: 'toggleFullscreen' };
        case 'Escape': return { type: 'navigate', screen: 'main' };
        case '?': return { type: 'action', name: 'toggleShortcuts' };
        default: return null;
    }
}

/**
 * Con el foco dentro de un campo editable, el cajero está escribiendo: sólo las teclas de función
 * y Escape siguen siendo atajos. Sin esta regla, teclear un `?` en el buscador de productos
 * abriría el panel de ayuda en vez de escribir el carácter.
 */
export function debeIgnorarTecla(tagName: string | undefined, key: string): boolean {
    if (tagName !== 'INPUT' && tagName !== 'TEXTAREA' && tagName !== 'SELECT') return false;
    return !key.startsWith('F') && key !== 'Escape';
}
