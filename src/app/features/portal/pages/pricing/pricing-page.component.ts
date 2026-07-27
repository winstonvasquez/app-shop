import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../services/portal.service';
import { SaasModuleInfo, SaasPlanInfo } from '../../../../core/models/saas.model';
import { PLAN_CONTENT, SECURITY_BASELINE, SECURITY_PARITY_NOTE, UNLIMITED_ACROSS_PLANS, COMPLIANCE_BY_PLAN, MODULE_CONTENT, MODULE_DOMAINS, DOMAIN_ACCENT_COLORS, ModuleDomainKey, PlanContentMeta } from '../../../../shared/constants';

interface PlanCard extends SaasPlanInfo {
    content: PlanContentMeta;
    moduleNames: string[];
}

interface ComparisonRow {
    code: string;
    name: string;
    domain: ModuleDomainKey | undefined;
    includedIn: Record<string, boolean>;
}

@Component({
    selector: 'app-pricing-page',
    standalone: true,
    imports: [RouterLink, DecimalPipe],
    template: `
    <div class="pricing-canvas">
      <div class="pricing-page">
        <div class="pricing-header">
          <span class="kicker">Planes</span>
          <h1 class="page-title">Un plan para cada etapa de tu negocio</h1>
          <p class="page-subtitle">Elige el plan ideal según los módulos que necesitas hoy. Sin contratos de permanencia mínima, cancela cuando quieras.</p>

          <div class="billing-toggle-container">
            <span [class.active]="!annual()" class="toggle-label">Mensual</span>
            <button class="toggle-btn" (click)="annual.set(!annual())" id="btn-billing-toggle" aria-label="Cambiar tipo de facturación">
              <span class="toggle-thumb" [class.right]="annual()"></span>
            </button>
            <span [class.active]="annual()" class="toggle-label">
              Anual <span class="discount-badge">Ahorra hasta 17%</span>
            </span>
          </div>
        </div>

        <div class="plans-grid">
          @for (plan of planCards(); track plan.code) {
            <div class="plan-card" [class.highlighted]="plan.content.recommended" [id]="'plan-card-' + plan.code">
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
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success, #0E8A5F)" stroke-width="3" class="check-icon">
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

        <!-- ============ TABLA COMPARATIVA ============ -->
        <div class="comparison-section">
          <div class="section-head">
            <span class="section-kicker">Módulo por módulo</span>
            <h2 class="section-title">Compara exactamente qué incluye cada plan</h2>
          </div>

          <div class="comparison-table-wrap">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th class="col-module"></th>
                  @for (plan of planCards(); track plan.code) {
                    <th [class.col-highlight]="plan.content.recommended">{{ plan.name }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows(); track row.code) {
                  <tr>
                    <td class="col-module">
                      <span class="domain-dot" [style]="'--domain-accent:' + (row.domain ? domainAccent(row.domain) : 'var(--color-text-muted)')" [title]="row.domain ? domainLabel(row.domain) : ''"></span>
                      {{ row.name }}
                    </td>
                    @for (plan of planCards(); track plan.code) {
                      <td [class.col-highlight]="plan.content.recommended">
                        @if (row.includedIn[plan.code]) {
                          <svg class="cell-check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-success, #0E8A5F)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else {
                          <span class="cell-dash" aria-hidden="true">—</span>
                        }
                      </td>
                    }
                  </tr>
                }
                <tr class="row-users">
                  <td class="col-module">Usuarios incluidos</td>
                  @for (plan of planCards(); track plan.code) {
                    <td [class.col-highlight]="plan.content.recommended">{{ plan.maxUsers >= 999 ? 'Ilimitados' : plan.maxUsers }}</td>
                  }
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="security-panel">
          <h2 class="security-title">Seguridad incluida en todos los planes</h2>
          <ul class="security-list">
            @for (item of securityBaseline; track item) {
              <li>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success, #0E8A5F)" stroke-width="3" class="check-icon">
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

        <div class="compliance-panel">
          <h2 class="security-title">Cumplimiento SUNAT por plan</h2>
          <ul class="security-list">
            @for (item of complianceByPlan; track item) {
              <li>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-primary, #0B3D91)" stroke-width="3" class="check-icon">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{{ item }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    </div>
    `,
    styles: [`
      .pricing-canvas {
        background: var(--color-background, #F7F6F3);
        color: var(--color-text-primary, #0E1B2C);
        font-family: var(--f-sans, 'Inter', sans-serif);
        position: relative;
        z-index: 10;
      }

      .pricing-page {
        max-width: 1180px;
        margin: 0 auto;
        padding: 72px 24px 96px;
      }

      .pricing-header {
        text-align: center;
        max-width: 640px;
        margin: 0 auto 64px;
      }

      .kicker {
        display: inline-flex;
        align-items: center;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-primary, #0B3D91);
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-full, 999px);
        padding: 6px 16px;
        margin-bottom: 20px;
      }

      .page-title {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: clamp(2rem, 4.2vw, 2.75rem);
        font-weight: 700;
        letter-spacing: -0.5px;
        margin: 0 0 16px;
      }

      .page-subtitle {
        color: var(--color-text-secondary, #5A6473);
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
        color: var(--color-text-muted, #8C95A3);
        transition: color 0.2s ease;

        &.active {
          color: var(--color-text-primary, #0E1B2C);
          font-weight: 700;
        }
      }

      .toggle-btn {
        width: 54px;
        height: 28px;
        background: var(--color-surface-raised, #EFEDE7);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: 20px;
        cursor: pointer;
        position: relative;
        padding: 0;
        outline: none;
        transition: all 0.2s ease;

        &:focus-visible {
          border-color: var(--color-primary, #0B3D91);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #0B3D91) 25%, transparent);
        }
      }

      .toggle-thumb {
        position: absolute;
        top: 3px;
        left: 4px;
        width: 20px;
        height: 20px;
        background: var(--color-primary, #0B3D91);
        border-radius: 50%;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

        &.right {
          left: 28px;
          background: var(--color-accent, #F08C00);
        }
      }

      .discount-badge {
        background: color-mix(in srgb, var(--color-success, #0E8A5F) 12%, white);
        color: var(--color-success, #0E8A5F);
        font-size: 0.725rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 12px;
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
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-lg, 14px);
        padding: 44px 32px 36px;
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        transition: transform 0.2s var(--ease-out, ease), box-shadow 0.2s ease, border-color 0.2s ease;

        &.highlighted {
          border-color: var(--color-primary, #0B3D91);
          box-shadow: var(--s-lg, 0 8px 24px rgba(15,23,42,.08));
        }

        &:hover {
          transform: translateY(-4px);
          box-shadow: var(--s-lg, 0 8px 24px rgba(15,23,42,.08));
        }
      }

      .popular-badge {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-primary, #0B3D91);
        color: #ffffff;
        font-size: 0.725rem;
        font-weight: 700;
        padding: 4px 16px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .plan-info-header {
        margin-bottom: 24px;
      }

      .plan-name {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text-primary, #0E1B2C);
        margin: 0 0 8px;
      }

      .plan-desc {
        color: var(--color-text-secondary, #5A6473);
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
        color: var(--color-text-muted, #8C95A3);
      }

      .amount {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 3.25rem;
        font-weight: 700;
        color: var(--color-text-primary, #0E1B2C);
        line-height: 1;
        letter-spacing: -1px;
      }

      .period {
        color: var(--color-text-muted, #8C95A3);
        font-size: 1rem;
        font-weight: 500;
      }

      .annual-note {
        font-size: 0.775rem;
        color: var(--color-success, #0E8A5F);
        margin-top: 8px;
        font-weight: 500;
      }

      .plan-divider {
        height: 1px;
        background: var(--color-border, #DCD8CE);
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
        color: var(--color-text-primary, #0E1B2C);
        margin-bottom: 20px;
        font-weight: 500;

        .user-icon {
          color: var(--color-text-muted, #8C95A3);
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
          color: var(--color-text-secondary, #5A6473);
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
        border-top: 1px dashed var(--color-border, #DCD8CE);
        padding-top: 16px;
        margin-bottom: 28px;
        font-size: 0.8rem;
        color: var(--color-text-secondary, #5A6473);
      }

      .plan-support-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: var(--color-text-primary, #0E1B2C);
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
        color: var(--color-success, #0E8A5F);
        font-size: 0.775rem;
        font-weight: 500;
      }

      .plan-cta {
        display: block;
        text-align: center;
        background: var(--color-surface-raised, #EFEDE7);
        color: var(--color-text-primary, #0E1B2C);
        padding: 14px;
        border-radius: var(--r-md, 10px);
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        border: 1px solid var(--color-border, #DCD8CE);
        transition: all 0.25s ease;
        margin-top: auto;

        &:hover {
          border-color: var(--color-primary, #0B3D91);
          transform: translateY(-2px);
        }

        &.cta-highlight {
          background: var(--color-accent, #F08C00);
          color: #ffffff;
          border-color: transparent;
          box-shadow: var(--s-sm, 0 1px 2px rgba(15,23,42,.08));

          &:hover {
            background: var(--color-accent-dark, #C97300);
            box-shadow: var(--s-md, 0 4px 12px rgba(15,23,42,.12));
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
        color: var(--color-text-secondary, #5A6473);
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
          background: var(--color-success, #0E8A5F);
        }
      }

      /* ---------- Tabla comparativa ---------- */
      .comparison-section {
        margin-top: 88px;
      }

      .section-head {
        max-width: 640px;
        margin: 0 0 32px;
      }

      .section-kicker {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--color-accent-dark, #C97300);
        margin-bottom: 12px;
      }

      .section-title {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: clamp(1.6rem, 2.6vw, 2rem);
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.3px;
      }

      .comparison-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-lg, 14px);
        background: var(--color-surface, #FFFFFF);
      }

      .comparison-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;

        th, td {
          padding: 14px 20px;
          text-align: center;
          border-bottom: 1px solid var(--color-border, #DCD8CE);
        }

        th.col-module, td.col-module {
          text-align: left;
          font-weight: 600;
          color: var(--color-text-primary, #0E1B2C);
          white-space: nowrap;
        }

        td.col-module {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        thead th {
          font-family: var(--f-display, 'Source Serif 4', serif);
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-primary, #0E1B2C);
          background: var(--color-surface-raised, #EFEDE7);
        }

        thead th.col-highlight {
          color: var(--color-primary, #0B3D91);
        }

        tbody td.col-highlight {
          background: color-mix(in srgb, var(--color-primary, #0B3D91) 4%, transparent);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr.row-users td {
          font-weight: 700;
          background: var(--color-surface-raised, #EFEDE7);
        }
      }

      .cell-check {
        vertical-align: middle;
      }

      .cell-dash {
        color: var(--color-text-muted, #8C95A3);
      }

      .domain-dot {
        display: inline-block;
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--domain-accent, var(--color-text-muted, #8C95A3));
      }

      .security-panel,
      .compliance-panel {
        margin-top: 56px;
        padding: 40px 36px;
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-lg, 14px);
      }

      .compliance-panel {
        margin-top: 24px;
      }

      .security-title {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--color-text-primary, #0E1B2C);
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
          color: var(--color-text-secondary, #5A6473);
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
        border-top: 1px dashed var(--color-border, #DCD8CE);
        padding-top: 20px;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #5A6473);
        line-height: 1.6;

        strong {
          color: var(--color-primary, #0B3D91);
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

        .comparison-table th, .comparison-table td {
          padding: 10px 12px;
          font-size: 0.825rem;
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

    comparisonRows = computed<ComparisonRow[]>(() => {
        const plans = this.planCards();
        return this.modules().map((m) => ({
            code: m.code,
            name: m.name,
            domain: MODULE_CONTENT[m.code]?.domain,
            includedIn: Object.fromEntries(plans.map((p) => [p.code, p.moduleCodes.includes(m.code)])),
        }));
    });

    /** Mismo acento por dominio que agrupa los módulos en /portal/landing — misma fuente única, para que la tabla comparativa se lea como parte del mismo sistema. */
    domainAccent(domain: ModuleDomainKey): string {
        return DOMAIN_ACCENT_COLORS[domain];
    }

    domainLabel(domain: ModuleDomainKey): string {
        return MODULE_DOMAINS.find((d) => d.key === domain)?.label ?? '';
    }

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
