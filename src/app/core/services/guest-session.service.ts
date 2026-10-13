import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { STORAGE_KEYS } from '@shared/constants/app.constants';

const GUEST_EMAIL_KEY = STORAGE_KEYS.guestEmail;
const GUEST_PHONE_KEY = STORAGE_KEYS.guestPhone;
const GUEST_NAME_KEY  = STORAGE_KEYS.guestName;
const GUEST_TOKEN_PREFIX = 'guestToken:';
export const GUEST_TOKEN_HEADER = 'X-Guest-Token';

/**
 * Cabecera que prueba al invitado que el pedido es suyo. Sólo viaja sin sesión y con token
 * conocido para ese pedido; con sesión manda el JWT y la cabecera sobra.
 */
export function cabeceraInvitado(
    token: string | null | undefined,
    haySesion: boolean,
): Record<string, string> | undefined {
    return !haySesion && token ? { [GUEST_TOKEN_HEADER]: token } : undefined;
}

/**
 * Gestiona la sesión de compra para usuarios invitados (sin cuenta).
 * Los datos se persisten en localStorage y se limpian al confirmar el pedido.
 */
@Injectable({ providedIn: 'root' })
export class GuestSessionService {
    private readonly auth = inject(AuthService);
    private _email  = signal<string>(localStorage.getItem(GUEST_EMAIL_KEY) ?? '');
    private _phone  = signal<string>(localStorage.getItem(GUEST_PHONE_KEY) ?? '');
    private _name   = signal<string>(localStorage.getItem(GUEST_NAME_KEY) ?? '');

    readonly email  = this._email.asReadonly();
    readonly phone  = this._phone.asReadonly();
    readonly name   = this._name.asReadonly();

    readonly isComplete = computed(() =>
        this._email().trim().length > 0 && this._name().trim().length > 0
    );

    setEmail(email: string): void {
        this._email.set(email);
        localStorage.setItem(GUEST_EMAIL_KEY, email);
    }

    setPhone(phone: string): void {
        this._phone.set(phone);
        localStorage.setItem(GUEST_PHONE_KEY, phone);
    }

    setName(name: string): void {
        this._name.set(name);
        localStorage.setItem(GUEST_NAME_KEY, name);
    }

    /** Token de invitado del pedido (sessionStorage: muere con la pestaña; puede fallar en modo privado). */
    tokenDe(orderId: number): string | null {
        try {
            return sessionStorage.getItem(GUEST_TOKEN_PREFIX + orderId);
        } catch {
            return null;
        }
    }

    guardarToken(orderId: number, token: string): void {
        try {
            sessionStorage.setItem(GUEST_TOKEN_PREFIX + orderId, token);
        } catch {
            // Sin storage no hay token: la confirmación cae al mensaje genérico.
        }
    }

    /** Opciones de petición con `X-Guest-Token` para un pedido de invitado, o `{}` si no aplica. */
    opcionesDe(orderId: number): { headers?: Record<string, string> } {
        const headers = cabeceraInvitado(this.tokenDe(orderId), !!this.auth.currentUser());
        return headers ? { headers } : {};
    }

    /** Limpia email/teléfono/nombre. NO toca los tokens por pedido: la confirmación aún los necesita. */
    clear(): void {
        this._email.set('');
        this._phone.set('');
        this._name.set('');
        localStorage.removeItem(GUEST_EMAIL_KEY);
        localStorage.removeItem(GUEST_PHONE_KEY);
        localStorage.removeItem(GUEST_NAME_KEY);
    }
}
