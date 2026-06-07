import { Component, ChangeDetectionStrategy, output, signal, input, computed, effect } from '@angular/core';

@Component({
    selector: 'app-pos-manager-pin-dialog',
    standalone: true,
    template: `
        <div class="shortcuts-overlay" (click)="cancel.emit()">
            <div class="shortcuts-panel" (click)="$event.stopPropagation()"
                 style="min-width: 300px; max-width: 360px;">
                <div class="shortcuts-header">
                    <h3 class="shortcuts-title">PIN Supervisor</h3>
                    <button class="shortcuts-close" (click)="cancel.emit()">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fill-rule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>

                <p style="font-size: 13px; color: var(--color-text-subtle); margin-bottom: 16px;">
                    Ingrese el PIN del supervisor para autorizar este descuento.
                </p>

                <!-- PIN display -->
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 28px; font-family: monospace; letter-spacing: 8px;
                                color: var(--color-text); min-height: 40px;">
                        {{ '●'.repeat(pin().length) }}
                    </div>
                </div>

                @if (displayError()) {
                <p style="color: var(--color-error); font-size: 12px; text-align: center; margin-bottom: 8px;">
                    {{ displayError() }}
                </p>
                }

                <!-- Numpad -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    @for (n of numKeys; track n) {
                    <button class="btn-secondary" style="height: 48px; font-size: 18px; font-weight: 600;"
                            [disabled]="loading()" (click)="addDigit(n)">{{ n }}</button>
                    }
                    <button class="btn-secondary" style="height: 48px; font-size: 14px;"
                            [disabled]="loading()" (click)="clear()">Borrar</button>
                    <button class="btn-secondary" style="height: 48px; font-size: 18px; font-weight: 600;"
                            [disabled]="loading()" (click)="addDigit('0')">0</button>
                    <button class="btn-primary" style="height: 48px; font-size: 14px; font-weight: 600;"
                            [disabled]="loading()" (click)="submit()">{{ loading() ? '...' : 'OK' }}</button>
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosManagerPinDialogComponent {
    readonly confirmed = output<string>();
    readonly cancel = output<void>();

    /** Error externo (ej: PIN rechazado por el backend). Limpia el PIN para reintentar. */
    readonly errorMessage = input<string>('');
    /** Mientras se valida contra el backend, bloquea el numpad. */
    readonly loading = input<boolean>(false);

    readonly pin = signal('');
    readonly error = signal('');

    /** Error mostrado: el del backend tiene prioridad sobre la validación local. */
    readonly displayError = computed(() => this.errorMessage() || this.error());

    readonly numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    constructor() {
        // Al llegar un error del backend, limpiar el PIN para que el cajero reintente.
        effect(() => {
            if (this.errorMessage()) {
                this.pin.set('');
            }
        });
    }

    addDigit(d: string): void {
        if (this.pin().length < 6) {
            this.pin.update(v => v + d);
            this.error.set('');
        }
    }

    clear(): void {
        this.pin.set('');
        this.error.set('');
    }

    submit(): void {
        if (this.pin().length < 4) {
            this.error.set('El PIN debe tener al menos 4 dígitos');
            return;
        }
        this.confirmed.emit(this.pin());
    }
}
