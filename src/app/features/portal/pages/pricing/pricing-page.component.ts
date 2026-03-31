import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

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
    imports: [RouterLink, CommonModule],
    template: `
    <div class="pricing-page">
      <div class="pricing-header">
        <h1>Planes y Precios</h1>
        <p>Elige el plan ideal para tu empresa. Sin permanencia mínima.</p>
        <div class="billing-toggle">
          <span [class.active]="!annual()">Mensual</span>
          <button class="toggle-btn" (click)="annual.set(!annual())">
            <span class="toggle-thumb" [class.right]="annual()"></span>
          </button>
          <span [class.active]="annual()">Anual <span class="discount-badge">-17%</span></span>
        </div>
      </div>

      <div class="plans-grid">
        @for (plan of plans; track plan.code) {
          <div class="plan-card" [class.highlighted]="plan.highlighted">
            @if (plan.highlighted) {
              <div class="popular-badge">Más popular</div>
            }
            <div class="plan-name">{{ plan.name }}</div>
            <div class="plan-price">
              <span class="currency">S/</span>
              <span class="amount">{{ annual() ? (plan.priceAnnual / 12 | number:'1.0-0') : plan.priceMonthly }}</span>
              <span class="period">/mes</span>
            </div>
            @if (annual()) {
              <div class="annual-note">Facturado anualmente: S/ {{ plan.priceAnnual | number:'1.0-0' }}</div>
            }
            <p class="plan-desc">{{ plan.description }}</p>
            <div class="plan-users">👤 Hasta {{ plan.maxUsers === 999 ? 'ilimitados' : plan.maxUsers }} usuarios</div>
            <ul class="plan-modules">
              @for (mod of plan.modules; track mod) {
                <li>✓ {{ mod }}</li>
              }
            </ul>
            <a [routerLink]="['/portal/register']" [queryParams]="{plan: plan.code}" class="plan-cta" [class.cta-highlight]="plan.highlighted">
              Comenzar gratis
            </a>
          </div>
        }
      </div>
    </div>
    `,
    styles: [`
      .pricing-page { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
      .pricing-header { text-align: center; margin-bottom: 48px; }
      .pricing-header h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin: 0 0 12px; }
      .pricing-header p { color: var(--color-subtle); margin-bottom: 24px; }
      .billing-toggle { display: flex; align-items: center; gap: 12px; justify-content: center; color: var(--color-subtle); }
      .billing-toggle span.active { color: #fff; font-weight: 600; }
      .toggle-btn { width: 48px; height: 26px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 13px; cursor: pointer; position: relative; }
      .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: var(--color-primary); border-radius: 50%; transition: left 0.2s; }
      .toggle-thumb.right { left: 25px; }
      .discount-badge { background: rgba(16,185,129,0.2); color: #10b981; font-size: 0.7rem; padding: 1px 6px; border-radius: 10px; }
      .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
      .plan-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 32px 24px; position: relative; }
      .plan-card.highlighted { border-color: var(--color-primary); background: rgba(215,19,42,0.05); }
      .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--color-primary); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 14px; border-radius: 10px; }
      .plan-name { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
      .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
      .currency { font-size: 1.2rem; color: var(--color-subtle); }
      .amount { font-size: 3rem; font-weight: 900; color: #fff; }
      .period { color: var(--color-subtle); }
      .annual-note { font-size: 0.75rem; color: var(--color-subtle); margin-bottom: 12px; }
      .plan-desc { color: var(--color-subtle); font-size: 0.85rem; margin: 8px 0 16px; }
      .plan-users { font-size: 0.85rem; color: var(--color-subtle); margin-bottom: 16px; }
      .plan-modules { list-style: none; padding: 0; margin: 0 0 24px; }
      .plan-modules li { font-size: 0.85rem; color: #aaa; padding: 4px 0; }
      .plan-cta { display: block; text-align: center; background: var(--color-surface-raised); color: #fff; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; border: 1px solid var(--color-border); transition: background 0.15s; }
      .plan-cta:hover { background: var(--color-surface-sunken); }
      .plan-cta.cta-highlight { background: var(--color-primary); border-color: var(--color-primary); }
      .plan-cta.cta-highlight:hover { opacity: 0.9; }
    `]
})
export class PricingPageComponent {
    annual = signal(false);

    readonly plans: PlanCard[] = [
        { code: 'STARTER', name: 'Starter', priceMonthly: 99, priceAnnual: 990, maxUsers: 5, description: 'Perfecto para pequeñas empresas que comienzan su digitalización.', modules: ['Punto de Venta', 'Ventas'], highlighted: false },
        { code: 'PROFESSIONAL', name: 'Professional', priceMonthly: 299, priceAnnual: 2990, maxUsers: 25, description: 'Para empresas en crecimiento que necesitan gestión completa.', modules: ['Punto de Venta', 'Ventas', 'Compras', 'Inventario', 'Contabilidad', 'Logística', 'Tesorería'], highlighted: true },
        { code: 'ENTERPRISE', name: 'Enterprise', priceMonthly: 799, priceAnnual: 7990, maxUsers: 999, description: 'Solución completa para corporativos con múltiples sucursales.', modules: ['Todos los módulos', 'RRHH', 'Soporte prioritario', 'API personalizada'], highlighted: false },
    ];
}
