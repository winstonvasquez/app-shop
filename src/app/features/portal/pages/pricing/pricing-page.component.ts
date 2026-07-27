import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../services/portal.service';
import { SaasModuleInfo, SaasPlanInfo } from '../../../../core/models/saas.model';
import { PLAN_CONTENT, SECURITY_BASELINE, SECURITY_PARITY_NOTE, UNLIMITED_ACROSS_PLANS, COMPLIANCE_BY_PLAN, PlanContentMeta } from '../../../../shared/constants';

interface PlanCard extends SaasPlanInfo {
    content: PlanContentMeta;
    moduleNames: string[];
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
            Anual <span class="discount-badge animate-pulse-glow">Ahorra hasta 17%</span>
          </span>
        </div>
      </div>

      <div class="plans-grid">
        @for (plan of planCards(); track plan.code) {
          <div class="plan-card glass-card" [class.highlighted]="plan.content.recommended" [id]="'plan-card-' + plan.code">
            @if (plan.content.recommended) {
              <div class="popular-badge">El más recomendado</div>
            }

            <div class="plan-info-header">
              <h2 class="plan-name">{{ plan.name }}</h2>
              <p class="plan-desc">{{ plan.content.audience }}</p>
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
                <span>Hasta <strong>{{ plan.maxUsers >= 999 ? 'ilimitados' : plan.maxUsers }}</strong> usuarios</span>
              </div>
              <ul class="plan-modules-list">
                @for (mod of plan.moduleNames; track mod) {
                  <li>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--neon-teal)" stroke-width="3" class="check-icon">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{{ mod }}</span>
                  </li>
                }
              </ul>
            </div>

            <div class="plan-support">
              <div class="plan-support-row">
                <strong>{{ plan.content.support.channel }}</strong>
                <span>{{ plan.content.support.hours }}</span>
              </div>
              <div class="plan-support-sla">{{ plan.content.support.slaResponse }}</div>
              @if (plan.content.support.extra) {
                <div class="plan-support-extra">{{ plan.content.support.extra }}</div>
              }
            </div>

            <a [routerLink]="['/portal/register']" [queryParams]="{plan: plan.code}" class="plan-cta" [class.cta-highlight]="plan.content.recommended" [id]="'btn-pricing-cta-' + plan.code">
              Comenzar prueba gratis
            </a>
          </div>
        }
      </div>

      <div class="unlimited-note">
        @for (item of unlimitedAcrossPlans; track item) {
          <span class="unlimited-item">{{ item }}</span>
        }
      </div>

      <div class="security-panel glass-card">
        <h2 class="security-title">Seguridad incluida en todos los planes</h2>
        <ul class="security-list">
          @for (item of securityBaseline; track item) {
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--neon-teal)" stroke-width="3" class="check-icon">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ item }}</span>
            </li>
          }
        </ul>
        <div class="security-extra">
          <strong>Nota:</strong> {{ securityParityNote }}
        </div>
      </div>

      <div class="compliance-panel glass-card">
        <h2 class="security-title">Cumplimiento SUNAT por plan</h2>
        <ul class="security-list">
          @for (item of complianceByPlan; track item) {
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--neon-purple)" stroke-width="3" class="check-icon">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ item }}</span>
            </li>
          }
        </ul>
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
        margin-bottom: 28px;
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

      .plan-support {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 16px;
        margin-bottom: 28px;
        font-size: 0.8rem;
        color: var(--portal-muted);
      }

      .plan-support-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: #ffffff;
        margin-bottom: 4px;

        strong {
          font-weight: 700;
          font-size: 0.85rem;
        }
      }

      .plan-support-sla {
        font-size: 0.775rem;
      }

      .plan-support-extra {
        margin-top: 8px;
        color: var(--neon-teal);
        font-size: 0.775rem;
        font-weight: 500;
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

      .unlimited-note {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px 28px;
        margin-top: 32px;
        text-align: center;
      }

      .unlimited-item {
        font-size: 0.85rem;
        color: var(--portal-muted);
        position: relative;
        padding-left: 18px;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--neon-teal);
        }
      }

      .security-panel {
        margin-top: 56px;
        padding: 40px 36px;
      }

      .compliance-panel {
        margin-top: 24px;
        padding: 40px 36px;
      }

      .security-title {
        font-size: 1.4rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 24px;
        text-align: center;
      }

      .security-list {
        list-style: none;
        padding: 0;
        margin: 0 0 24px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px 32px;

        li {
          font-size: 0.9rem;
          color: var(--portal-muted);
          display: flex;
          align-items: flex-start;
          line-height: 1.5;

          .check-icon {
            flex-shrink: 0;
            margin-top: 3px;
            margin-right: 10px;
          }
        }
      }

      .security-extra {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 20px;
        font-size: 0.875rem;
        color: var(--portal-muted);
        line-height: 1.6;

        strong {
          color: var(--neon-purple);
          font-weight: 700;
        }
      }

      @media (max-width: 640px) {
        .plans-grid {
          grid-template-columns: 1fr;
        }

        .security-panel,
        .compliance-panel {
          padding: 28px 20px;
        }

        .plan-support-row {
          flex-direction: column;
          gap: 2px;
        }
      }
    `]
})
export class PricingPageComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly portalService = inject(PortalService);

    annual = signal(false);
    plans = signal<SaasPlanInfo[]>([]);
    modules = signal<SaasModuleInfo[]>([]);

    readonly securityBaseline = SECURITY_BASELINE;
    readonly securityParityNote = SECURITY_PARITY_NOTE;
    readonly unlimitedAcrossPlans = UNLIMITED_ACROSS_PLANS;
    readonly complianceByPlan = COMPLIANCE_BY_PLAN;

    planCards = computed<PlanCard[]>(() => {
        const modules = this.modules();
        return [...this.plans()]
            .sort((a, b) => a.priceMonthly - b.priceMonthly)
            .map((p) => ({
                ...p,
                content: PLAN_CONTENT[p.code] ?? { audience: p.description, recommended: false, support: { channel: 'Soporte estándar', hours: 'Horario de oficina', slaResponse: 'Respuesta objetivo en 24h' } },
                moduleNames: p.moduleCodes.map((code) => modules.find((m) => m.code === code)?.name ?? code),
            }));
    });

    ngOnInit(): void {
        this.titleService.setTitle('Planes y Precios - AppShop ERP');
        this.metaService.updateTag({ name: 'description', content: 'Encuentra el plan ideal para digitalizar tu negocio. Starter, Professional y Enterprise con soporte SUNAT y facturación electrónica. Sin permanencia mínima.' });

        // OpenGraph
        this.metaService.updateTag({ property: 'og:title', content: 'Planes y Precios - AppShop ERP' });
        this.metaService.updateTag({ property: 'og:description', content: 'Planes flexibles y a tu medida para digitalizar las ventas, almacenes y contabilidad de tu pyme.' });

        forkJoin({ plans: this.portalService.getPlans(), modules: this.portalService.getModules() }).subscribe(({ plans, modules }) => {
            this.plans.set(plans);
            this.modules.set(modules);
        });
    }
}
