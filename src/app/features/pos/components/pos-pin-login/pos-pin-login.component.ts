import {
    Component, ChangeDetectionStrategy, output, signal, inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
    selector: 'app-pos-pin-login',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 w-full max-w-sm shadow-2xl">
            <div class="text-center mb-6">
                <h2 class="text-xl font-bold text-on">POS Login</h2>
                <p class="text-sm text-muted mt-1">Ingrese su PIN de 4-6 dígitos</p>
            </div>

            <!-- PIN display -->
            <div class="flex justify-center gap-2 mb-6">
                @for (i of pinSlots; track i) {
                    <div class="w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold"
                        [class]="i < pin().length
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-muted'">
                        @if (i < pin().length) { &bull; }
                    </div>
                }
            </div>

            <!-- Error -->
            @if (error()) {
                <p class="text-sm text-[var(--color-error)] text-center mb-4">{{ error() }}</p>
            }

            <!-- Numpad -->
            <div class="grid grid-cols-3 gap-2">
                @for (key of numpadKeys; track key) {
                    <button class="h-14 rounded-xl text-lg font-bold transition-colors"
                        [class]="key === 'C'
                            ? 'bg-[var(--color-error)]/10 text-[var(--color-error)] hover:bg-[var(--color-error)]/20'
                            : key === 'OK'
                                ? 'bg-[var(--color-primary)] text-white hover:brightness-110'
                                : 'bg-[var(--color-background)] text-on hover:bg-[var(--color-border)]'"
                        [disabled]="loading()"
                        (click)="onKey(key)">
                        @if (key === 'OK' && loading()) {
                            <svg class="animate-spin mx-auto" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                                <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
                            </svg>
                        } @else {
                            {{ key }}
                        }
                    </button>
                }
            </div>

            <button class="w-full mt-4 text-sm text-muted hover:text-on" (click)="skip.emit()">
                Continuar sin PIN
            </button>
        </div>
    </div>
    `,
})
export class PosPinLoginComponent {
    private readonly http = inject(HttpClient);

    readonly authenticated = output<{ token: string; username: string; userId: number; companyId: number }>();
    readonly skip = output<void>();

    readonly pin = signal('');
    readonly error = signal('');
    readonly loading = signal(false);

    readonly pinSlots = [0, 1, 2, 3, 4, 5];
    readonly numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

    onKey(key: string): void {
        if (key === 'C') {
            this.pin.set('');
            this.error.set('');
            return;
        }
        if (key === 'OK') {
            this.submit();
            return;
        }
        if (this.pin().length < 6) {
            this.pin.update(p => p + key);
        }
    }

    private submit(): void {
        const p = this.pin();
        if (p.length < 4) {
            this.error.set('Mínimo 4 dígitos');
            return;
        }
        this.loading.set(true);
        this.error.set('');

        this.http.post<{ token: string; username: string; userId: number; activeCompanyId: number }>(
            `${environment.apiUrls.users}/auth/pin-login`,
            null,
            { params: { pin: p } }
        ).subscribe({
            next: (resp) => {
                this.loading.set(false);
                this.authenticated.emit({
                    token: resp.token,
                    username: resp.username,
                    userId: resp.userId,
                    companyId: resp.activeCompanyId,
                });
            },
            error: () => {
                this.loading.set(false);
                this.error.set('PIN incorrecto');
                this.pin.set('');
            },
        });
    }
}
