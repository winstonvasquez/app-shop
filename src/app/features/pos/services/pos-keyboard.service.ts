import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { PosKeyAction, debeIgnorarTecla, mapearTeclaPos } from './pos-keyboard.keymap';

export type { PosKeyAction };

export interface PosShortcut {
    key: string;
    label: string;
    action: string;
}

export const POS_SHORTCUTS: PosShortcut[] = [
    { key: 'F1', label: 'F1', action: 'Nueva venta' },
    { key: 'F2', label: 'F2', action: 'Retener orden' },
    { key: 'F3', label: 'F3', action: 'Recuperar orden' },
    { key: 'F4', label: 'F4', action: 'Buscar cliente' },
    { key: 'F5', label: 'F5', action: 'Cobrar' },
    { key: 'F7', label: 'F7', action: 'Historial' },
    { key: 'F8', label: 'F8', action: 'Devoluciones' },
    { key: 'F9', label: 'F9', action: 'Mi turno' },
    { key: 'F10', label: 'F10', action: 'Pantalla completa' },
    { key: 'Escape', label: 'Esc', action: 'Volver a venta' },
    { key: '?', label: '?', action: 'Mostrar atajos' },
];

@Injectable({ providedIn: 'root' })
export class PosKeyboardService {

    readonly showShortcuts = signal(false);

    private handler: ((action: PosKeyAction) => void) | null = null;
    private listener: ((e: KeyboardEvent) => void) | null = null;
    private destroyRef = inject(DestroyRef);

    /**
     * Register the keyboard handler. Call from PosPageComponent.ngOnInit().
     * Returns an unsubscribe function.
     */
    register(onAction: (action: PosKeyAction) => void): () => void {
        this.handler = onAction;

        this.listener = (e: KeyboardEvent) => {
            if (debeIgnorarTecla((e.target as HTMLElement)?.tagName, e.key)) return;

            const action = mapearTeclaPos(e.key);
            if (action) {
                e.preventDefault();
                this.handler?.(action);
            }
        };

        window.addEventListener('keydown', this.listener);

        const cleanup = () => {
            if (this.listener) {
                window.removeEventListener('keydown', this.listener);
                this.listener = null;
            }
            this.handler = null;
        };

        this.destroyRef.onDestroy(cleanup);
        return cleanup;
    }

    toggleShortcutsPanel(): void {
        this.showShortcuts.update(v => !v);
    }

}
