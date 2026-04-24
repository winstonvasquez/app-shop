import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalStateService {
    readonly isAuthModalOpen = signal(false);

    /** URL a la que redirigir tras login exitoso desde el modal */
    readonly authModalReturnUrl = signal<string | null>(null);

    openAuthModal(returnUrl?: string) {
        this.authModalReturnUrl.set(returnUrl ?? null);
        this.isAuthModalOpen.set(true);
    }

    closeAuthModal() {
        this.isAuthModalOpen.set(false);
        this.authModalReturnUrl.set(null);
    }
}
