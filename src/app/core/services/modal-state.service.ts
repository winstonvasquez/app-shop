import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalStateService {
    readonly isAuthModalOpen = signal(false);

    openAuthModal() { this.isAuthModalOpen.set(true); }
    closeAuthModal() { this.isAuthModalOpen.set(false); }
}
