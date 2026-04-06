import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { PosScreen } from '../components/pos-topbar/pos-topbar.component';

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

export type PosKeyAction =
    | { type: 'navigate'; screen: PosScreen }
    | { type: 'action'; name: 'nuevaVenta' | 'cobrar' | 'holdOrder' | 'recallOrder' | 'customerSearch' | 'toggleFullscreen' | 'toggleShortcuts' };

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
            // Skip if user is typing in an input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                // Only handle Escape and F-keys in inputs
                if (!e.key.startsWith('F') && e.key !== 'Escape') return;
            }

            const action = this.mapKey(e);
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

    private mapKey(e: KeyboardEvent): PosKeyAction | null {
        switch (e.key) {
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
}
