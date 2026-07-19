import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

interface PlanCard {
    code: string;
    name: string;
    priceMonthly: number;
    priceAnnual: number;
    maxUsers: number;
    description: string;
    modules: string[];
    highlighted: boolean;
}

@Component({
    selector: 'app-pricing-page',
    standalone: true,
    imports: [RouterLink, DecimalPipe],
    template: `
    <div class="pricing-page">
      <div class="pricing-header">
        <h1 class="page-title">Planes y Precios</h1>
        <p class="page-subtitle">Elige el plan ideal para tu negocio. Sin contratos de permanencia mínima, cancela cuando quieras.</p>
        
        <div class="billing-toggle-container">
          <span [class.active]="!annual()" class="toggle-label">Mensual</span>
          <button class="toggle-btn" (click)="annual.set(!annual())" id="btn-billing-toggle" aria-label="Cambiar tipo de facturación">
            <span class="toggle-thumb" [class.right]="annual()"></span>
          </button>
          <span [class.active]="annual()" class="toggle-label">
            Anual <span class="discount-badge animate-pulse-glow">Ahorra 17%</span>
          </span>
        </div>
      </div>

      <div class="plans-grid">
        @for (plan of plans; track plan.code) {
          <div class="plan-card glass-card" [class.highlighted]="plan.highlighted" [id]="'plan-card-' + plan.code">
            @if (plan.highlighted) {
              <div class="popular-badge">El más recomendado</div>
            }
            
            <div class="plan-info-header">
              <h2 class="plan-name">{{ plan.name }}</h2>
              <p class="plan-desc">{{ plan.description }}</p>
            </div>

            <div class="plan-price-container">
              <div class="plan-price">
                <span class="currency">S/</span>
                <span class="amount">{{ annual() ? (plan.priceAnnual / 12 | number:'1.0-0') : plan.priceMonthly }}</span>
                <span class="period">/mes</span>
              </div>
              @if (annual()) {
                <div class="annual-note">Facturado anualmente: S/ {{ plan.priceAnnual | number:'1.0-0' }}</div>
              }
            </div>

            <div class="plan-divider"></div>

            <div class="plan-features">
              <div class="plan-users">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="user-icon">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <span>Hasta <strong>{{ plan.maxUsers === 999 ? 'ilimitados' : plan.maxUsers }}</strong> usuarios</span>
              </div>
              <ul class="plan-modules-list">
                @for (mod of plan.modules; track mod) {
                  <li>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--neon-teal)" stroke-width="3" class="check-icon">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{{ mod }}</span>
                  </li>
                }
              </ul>
            </div>

            <a [routerLink]="['/portal/register']" [queryParams]="{plan: plan.code}" class="plan-cta" [class.cta-highlight]="plan.highlighted" [id]="'btn-pricing-cta-' + plan.code">
              Comenzar prueba gratis
            </a>
          </div>
        }
      </div>
    </div>
    `,
    styles: [`
      .pricing-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 80px 24px;
        position: relative;
        z-index: 10;
      }

      .pricing-header {
        text-align: center;
        margin-bottom: 64px;
      }

      .page-title {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 900;
        letter-spacing: -1px;
        color: #ffffff;
        margin: 0 0 16px;
      }

      .page-subtitle {
        color: var(--portal-muted);
        max-width: 600px;
        margin: 0 auto 36px;
        font-size: 1.05rem;
        line-height: 1.6;
      }

      /* Toggle Switch */
      .billing-toggle-container {
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: center;
      }

      .toggle-label {
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--portal-muted);
        transition: color 0.2s ease;

        &.active {
          color: #ffffff;
          font-weight: 600;
        }
      }

      .toggle-btn {
        width: 54px;
        height: 28px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        cursor: pointer;
        position: relative;
        padding: 0;
        outline: none;
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--neon-purple);
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.25);
        }
      }

      .toggle-thumb {
        position: absolute;
        top: 3px;
        left: 4px;
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, var(--neon-purple), var(--neon-blue));
        border-radius: 50%;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);

        &.right {
          left: 28px;
        }
      }

      .discount-badge {
        background: rgba(6, 182, 212, 0.15);
        color: #8be9fd;
        font-size: 0.725rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 12px;
        border: 1px solid rgba(6, 182, 212, 0.3);
        margin-left: 6px;
      }

      /* Plans Grid */
      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 32px;
        align-items: stretch;
      }

      .plan-card {
        padding: 44px 32px 36px;
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;

        &.highlighted {
          border-color: var(--neon-purple);
          background: rgba(168, 85, 247, 0.04);
          box-shadow: 0 10px 30px rgba(168, 85, 247, 0.1), 0 0 20px rgba(168, 85, 247, 0.05);

          &:hover {
            border-color: rgba(244, 63, 94, 0.6);
            box-shadow: 0 15px 35px rgba(168, 85, 247, 0.2), 0 0 25px rgba(244, 63, 94, 0.1);
          }
        }

        &:hover {
          transform: translateY(-4px);
        }
      }

      .popular-badge {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%);
        color: #ffffff;
        font-size: 0.725rem;
        font-weight: 700;
        padding: 4px 16px;
        border-radius: 20px;
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .plan-info-header {
        margin-bottom: 24px;
      }

      .plan-name {
        font-size: 1.5rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 8px;
        font-family: 'Inter', sans-serif;
      }

      .plan-desc {
        color: var(--portal-muted);
        font-size: 0.9rem;
        margin: 0;
        line-height: 1.5;
      }

      .plan-price-container {
        margin-bottom: 24px;
      }

      .plan-price {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }

      .currency {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--portal-muted);
      }

      .amount {
        font-size: 3.5rem;
        font-weight: 900;
        color: #ffffff;
        line-height: 1;
        letter-spacing: -2px;
      }

      .period {
        color: var(--portal-muted);
        font-size: 1rem;
        font-weight: 500;
      }

      .annual-note {
        font-size: 0.775rem;
        color: var(--neon-teal);
        margin-top: 8px;
        font-weight: 500;
      }

      .plan-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin-bottom: 28px;
      }

      .plan-features {
        flex: 1;
        margin-bottom: 36px;
      }

      .plan-users {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: #ffffff;
        margin-bottom: 20px;
        font-weight: 500;

        .user-icon {
          color: var(--portal-muted);
        }
      }

      .plan-modules-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;

        li {
          font-size: 0.875rem;
          color: var(--portal-muted);
          display: flex;
          align-items: flex-start;
          line-height: 1.4;

          .check-icon {
            flex-shrink: 0;
            margin-top: 2px;
            margin-right: 10px;
          }
        }
      }

      .plan-cta {
        display: block;
        text-align: center;
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        padding: 14px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.25s ease;
        margin-top: auto;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        &.cta-highlight {
          background: linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-blue) 100%);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.25);

          &:hover {
            box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
            filter: brightness(1.1);
          }
        }
      }

      @media (max-width: 640px) {
        .plans-grid {
          grid-template-columns: 1fr;
        }
      }
    `]
})
export class PricingPageComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);

    annual = signal(false);

    readonly plans: PlanCard[] = [
        { code: 'STARTER', name: 'Starter', priceMonthly: 99, priceAnnual: 990, maxUsers: 5, description: 'Perfecto para pequeñas empresas que comienzan su digitalización.', modules: ['Punto de Venta (POS)', 'Ventas y Facturación', 'Reportes básicos de stock', 'Soporte vía chat estándar'], highlighted: false },
        { code: 'PROFESSIONAL', name: 'Professional', priceMonthly: 299, priceAnnual: 2990, maxUsers: 25, description: 'Para empresas en crecimiento que necesitan gestión completa integrada.', modules: ['Punto de Venta (POS)', 'Ventas y Facturación', 'Compras y Proveedores', 'Inventario multi-almacén', 'Contabilidad automatizada PLE', 'Logística y Guías de remisión', 'Tesorería y Flujo de caja', 'Soporte prioritario 24/7'], highlighted: true },
        { code: 'ENTERPRISE', name: 'Enterprise', priceMonthly: 799, priceAnnual: 7990, maxUsers: 999, description: 'Solución corporativa completa para negocios con múltiples sucursales.', modules: ['Todos los módulos del ERP', 'Módulo completo de RRHH', 'Consolidación multi-empresa', 'API abierta de integración', 'Infraestructura dedicada cloud', 'Ejecutivo de cuentas asignado', 'Garantía de SLA 99.9%'], highlighted: false },
    ];

    ngOnInit(): void {
        this.titleService.setTitle('Planes y Precios - AppShop ERP');
        this.metaService.updateTag({ name: 'description', content: 'Encuentra el plan ideal para digitalizar tu negocio. Starter, Professional y Enterprise con soporte SUNAT y facturación electrónica. Sin permanencia mínima.' });
        
        // OpenGraph
        this.metaService.updateTag({ property: 'og:title', content: 'Planes y Precios - AppShop ERP' });
        this.metaService.updateTag({ property: 'og:description', content: 'Planes flexibles y a tu medida para digitalizar las ventas, almacenes y contabilidad de tu pyme.' });
    }
}

