import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';

const GUEST_EMAIL_KEY = 'guest_email';
const GUEST_PHONE_KEY = 'guest_phone';
const GUEST_NAME_KEY  = 'guest_name';

/**
 * Gestiona la sesión de compra para usuarios invitados (sin cuenta).
 * Los datos se persisten en localStorage y se limpian al confirmar el pedido.
 */
@Injectable({ providedIn: 'root' })
export class GuestSessionService {
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

    clear(): void {
        this._email.set('');
        this._phone.set('');
        this._name.set('');
        localStorage.removeItem(GUEST_EMAIL_KEY);
        localStorage.removeItem(GUEST_PHONE_KEY);
        localStorage.removeItem(GUEST_NAME_KEY);
    }
}
