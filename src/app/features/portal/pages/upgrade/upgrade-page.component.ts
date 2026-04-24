import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-upgrade-page',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="upgrade-page">
      <div class="upgrade-card">
        <div class="lock-icon">🔒</div>
        <h1>Módulo no disponible</h1>
        <p>Este módulo no está incluido en tu plan actual. Actualiza para acceder a toda la funcionalidad del ERP.</p>
        <a routerLink="/portal/pricing" class="cta-upgrade">Ver planes y actualizar</a>
        <a routerLink="/admin" class="cta-back">Volver al inicio</a>
      </div>
    </div>
    `,
    styles: [`
      .upgrade-page { min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 40px; }
      .upgrade-card { text-align: center; max-width: 400px; }
      .lock-icon { font-size: 3rem; margin-bottom: 16px; }
      h1 { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0 0 12px; }
      p { color: var(--color-subtle); line-height: 1.6; margin-bottom: 24px; }
      .cta-upgrade { display: block; background: var(--color-primary); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-bottom: 10px; }
      .cta-back { display: block; color: var(--color-subtle); text-decoration: none; font-size: 0.85rem; }
    `]
})
export class UpgradePageComponent {}
