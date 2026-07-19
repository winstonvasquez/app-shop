import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-upgrade-page',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="upgrade-page">
      <div class="upgrade-card glass-card">
        <div class="lock-icon-container">
          <svg viewBox="0 0 24 24" class="lock-svg animate-float">
            <circle cx="12" cy="12" r="10" stroke="rgba(244, 63, 94, 0.12)" stroke-width="1.5" fill="none" />
            <circle cx="12" cy="12" r="10" stroke="var(--neon-pink)" stroke-width="0.75" stroke-dasharray="3 5" fill="none" class="rotating-ring" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--neon-pink)" stroke-width="2" fill="none" stroke-linecap="round" />
            <rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(244, 63, 94, 0.08)" stroke="var(--neon-pink)" stroke-width="2" />
            <circle cx="12" cy="15.5" r="1.5" fill="var(--neon-pink)" />
            <path d="M12 17v2.5" stroke="var(--neon-pink)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <h1 class="upgrade-title">Módulo No Disponible</h1>
        <p class="upgrade-desc">Este módulo no está incluido en tu plan actual. Actualiza tu suscripción para desbloquear toda la potencia del ERP.</p>
        <div class="upgrade-actions">
          <a routerLink="/portal/pricing" class="cta-upgrade" id="btn-upgrade-plans">
            Ver planes y actualizar
          </a>
          <a routerLink="/admin" class="cta-back" id="btn-upgrade-back">
            Volver al panel de control
          </a>
        </div>
      </div>
    </div>
    `,
    styles: [`
      .upgrade-page {
        min-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        position: relative;
        z-index: 10;
      }

      .upgrade-card {
        text-align: center;
        max-width: 440px;
        padding: 48px 36px;
        border-radius: 24px;
      }

      .lock-icon-container {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .lock-svg {
        width: 68px;
        height: 68px;
        filter: drop-shadow(0 0 8px rgba(244, 63, 94, 0.4));
      }

      .rotating-ring {
        transform-origin: center;
        animation: spin 10s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .upgrade-title {
        font-size: 1.6rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 12px;
        letter-spacing: -0.5px;
      }

      .upgrade-desc {
        color: var(--portal-muted);
        line-height: 1.6;
        font-size: 0.925rem;
        margin-bottom: 32px;
      }

      .upgrade-actions {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .cta-upgrade {
        display: block;
        background: linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-purple) 100%);
        color: #ffffff;
        padding: 14px 28px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 15px rgba(244, 63, 94, 0.25);
        transition: all 0.25s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.45);
          filter: brightness(1.1);
        }
      }

      .cta-back {
        display: inline-block;
        color: var(--portal-muted);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s ease;
        padding: 8px 16px;
        align-self: center;

        &:hover {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
        }
      }
    `]
})
export class UpgradePageComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);

    ngOnInit(): void {
        this.titleService.setTitle('Actualizar Plan - AppShop ERP');
        this.metaService.updateTag({ name: 'description', content: 'Lleva tu negocio al siguiente nivel. Actualiza tu plan en AppShop ERP para desbloquear módulos avanzados y funciones adicionales.' });
        
        // OpenGraph
        this.metaService.updateTag({ property: 'og:title', content: 'Actualizar Plan - AppShop ERP' });
        this.metaService.updateTag({ property: 'og:description', content: 'Accede a módulos adicionales y expande las capacidades de tu ERP para cumplir con SUNAT y optimizar tu administración.' });
    }
}

