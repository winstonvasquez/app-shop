import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-account-notifications',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">Notificaciones</h1>
                <p class="page-subtitle">Tus alertas y avisos importantes</p>
            </div>

            <div class="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    class="opacity-40">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <p class="text-base font-medium">No tienes notificaciones</p>
                <p class="text-sm text-[var(--color-text-muted)] opacity-70">
                    Te avisaremos aquí cuando haya novedades sobre tus pedidos u ofertas.
                </p>
            </div>
        </div>
    `,
})
export class AccountNotificationsComponent {}
