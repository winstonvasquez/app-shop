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
    /**
     * TODOS los módulos del catálogo, en el mismo orden para las tres cards, cada uno marcado
     * según entre o no en este plan. Antes era solo la lista de los incluidos (`string[]`), y
     * eso hacía que las cards tuvieran alturas de contenido muy distintas —Starter con 2 filas
     * frente a las 8 de Enterprise— dejando medio panel vacío.
     */
    moduleRows: { name: string; included: boolean }[];
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
      <!-- Glows de ambiente sutiles en armonía con la paleta de marca (Azul Ink, Naranja Accent, Verde Success) -->
      <div class="pricing-orb pricing-orb-primary" aria-hidden="true"></div>
      <div class="pricing-orb pricing-orb-accent" aria-hidden="true"></div>
      <div class="pricing-orb pricing-orb-success" aria-hidden="true"></div>

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
              <!-- Fila reservada en TODAS las cards (aunque esté vacía) para que el subgrid alinee la cabecera de las tres -->
              <div class="plan-badge-row">
                @if (plan.content.recommended) {
                  <span class="popular-badge">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>El más recomendado</span>
                  </span>
                }
              </div>

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
                  <div class="annual-note">✓ Facturado anualmente: S/ {{ plan.priceAnnual | number:'1.0-0' }}</div>
                }
              </div>

              <div class="plan-features">
                <div class="plan-users">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="user-icon">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  <!-- Sin «ilimitados»: UserCompanyCommandService corta con 409 en
                       activeUsers >= maxUsers, y ENTERPRISE tiene max_users = 999. El tope
                       existe, así que se dice el número. -->
                  <span>Hasta <strong>{{ plan.maxUsers }}</strong> usuarios</span>
                </div>
                <!-- Las TRES cards listan los MISMOS módulos en el MISMO orden, marcando los que no
                     entran. Antes cada card listaba solo los suyos, así que Starter mostraba 2 líneas
                     frente a las 8 de Enterprise y dejaba un hueco vacío de media card. Además, al
                     coincidir el orden, la fila N de una card es el mismo módulo en las tres. -->
                <ul class="plan-modules-list">
                  @for (mod of plan.moduleRows; track mod.name) {
                    <li [class.not-included]="!mod.included">
                      @if (mod.included) {
                        <div class="check-icon-wrap">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" class="check-icon">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      } @else {
                        <div class="check-icon-wrap is-absent">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" aria-hidden="true">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </div>
                      }
                      <span>{{ mod.name }}</span>
                      @if (!mod.included) {
                        <span class="sr-only">no incluido en este plan</span>
                      }
                    </li>
                  }
                </ul>
              </div>

              <div class="plan-support">
                <div class="plan-support-channel">{{ plan.content.support.channel }}</div>
                <div class="plan-support-meta">
                  <span>{{ plan.content.support.hours }}</span>
                  <span>{{ plan.content.support.slaResponse }}</span>
                </div>
                @if (plan.content.support.extra) {
                  <div class="plan-support-extra">{{ plan.content.support.extra }}</div>
                }
              </div>

              <a [routerLink]="['/portal/register']" [queryParams]="{plan: plan.code}" class="plan-cta" [class.cta-highlight]="plan.content.recommended" [id]="'btn-pricing-cta-' + plan.code">
                <span>Comenzar prueba gratis</span>
                <svg class="cta-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
                    <td [class.col-highlight]="plan.content.recommended">{{ plan.maxUsers }}</td>
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
        background-color: var(--color-background, #F7F6F3);
        background-image: 
          radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.85) 0%, rgba(247, 246, 243, 0.72) 60%, rgba(247, 246, 243, 0.92) 100%),
          url('/images/pricing_corporate_bg.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        color: var(--color-text-primary, #0E1B2C);
        font-family: var(--f-sans, 'Inter', sans-serif);
        position: relative;
        z-index: 10;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(color-mix(in srgb, var(--color-primary, #0B3D91) 6%, transparent) 1.2px, transparent 1.2px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse at 50% 40%, black 40%, transparent 90%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black 40%, transparent 90%);
          pointer-events: none;
          z-index: 0;
        }
      }

      .pricing-orb {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        z-index: 0;
        filter: blur(100px);
      }

      .pricing-orb-primary {
        top: -6%;
        left: 50%;
        transform: translateX(-50%);
        width: 700px;
        height: 500px;
        background: radial-gradient(circle, color-mix(in srgb, var(--color-primary, #0B3D91) 12%, transparent) 0%, transparent 70%);
      }

      .pricing-orb-accent {
        top: 32%;
        right: -8%;
        width: 580px;
        height: 580px;
        background: radial-gradient(circle, color-mix(in srgb, var(--color-accent, #F08C00) 9%, transparent) 0%, transparent 68%);
      }

      .pricing-orb-success {
        bottom: 5%;
        left: -8%;
        width: 540px;
        height: 540px;
        background: radial-gradient(circle, color-mix(in srgb, var(--color-success, #0E8A5F) 8%, transparent) 0%, transparent 68%);
      }

      .pricing-page {
        max-width: 1180px;
        margin: 0 auto;
        padding: 72px 24px 96px;
        position: relative;
        z-index: 1;
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

      /* ---------- Plans Grid ----------
         Seis filas compartidas por las tres cards (badge · cabecera · precio · módulos ·
         soporte · CTA). Con subgrid cada card se cuelga de esas filas, así el precio, el
         bloque de soporte y el botón quedan a la MISMA altura aunque las descripciones
         ocupen 2 o 3 líneas. Antes cada card se maquetaba por su cuenta y nada alineaba. */
      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        grid-template-rows: auto auto auto 1fr auto auto;
        gap: 28px;
        align-items: stretch;
        margin-top: 24px;
      }

      .plan-card {
        grid-row: span 6;
        display: grid;
        grid-template-rows: subgrid;
        row-gap: 22px;
        background: #ffffff;
        border: 1.5px solid rgba(220, 216, 206, 0.85);
        border-radius: 20px;
        padding: 26px 30px 32px;
        position: relative;
        /* Recorta el filete al radio EXTERIOR de la card. Es la pieza que hace que el resto
           funcione: sin esto, el pseudo-elemento tiene que redondearse por su cuenta y su
           curva nunca casa con la del borde. */
        overflow: hidden;
        box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* Filete de acento superior.
           Un elemento absoluto con top/left/right en 0 se ancla al PADDING box, o sea por
           DENTRO del borde de 1.5px: el filete quedaba más estrecho y más bajo que la card,
           con el borde gris asomando por encima y por los lados, y su radio propio (18px)
           no coincidía con el de la card (20px). Eso es lo que se leía como una barra suelta
           flotando por encima del panel.
           La solución es al revés de lo que parece: se SACA el filete hasta el border box con
           offsets negativos del grosor del borde, y es el overflow:hidden de la card quien
           lo recorta con la curva correcta. Por eso aquí no hace falta border-radius. */
        &::before {
          content: '';
          position: absolute;
          top: -1.5px;
          left: -1.5px;
          right: -1.5px;
          height: 5px;
          background: var(--color-primary, #0B3D91);
          z-index: 1;
          pointer-events: none;
        }

        &.highlighted {
          background: linear-gradient(180deg, #FFFFFF 0%, #F4F7FC 100%);
          border: 2px solid var(--color-primary, #0B3D91);
          box-shadow: 0 20px 48px -12px rgba(11, 61, 145, 0.18), 0 0 0 1px rgba(11, 61, 145, 0.15);

          /* Su borde es de 2px, no de 1.5px: los offsets del filete se corrigen para que
             siga alineado con el border box (si no, asoma medio píxel de azul del borde). */
          &::before {
            top: -2px;
            left: -2px;
            right: -2px;
            height: 6px;
            background: linear-gradient(90deg, #0B3D91 0%, #F08C00 100%);
          }

          &:hover {
            transform: translateY(-6px);
            box-shadow: 0 24px 56px -12px rgba(11, 61, 145, 0.25), 0 0 0 1px rgba(240, 140, 0, 0.3);
          }
        }

        &:hover:not(.highlighted) {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px -10px rgba(15, 23, 42, 0.1);
          border-color: color-mix(in srgb, var(--color-primary, #0B3D91) 40%, transparent);
        }
      }

      /* Navegadores sin subgrid: se cae a la maqueta en columna de siempre. */
      @supports not (grid-template-rows: subgrid) {
        .plans-grid {
          grid-template-rows: none;
        }

        .plan-card {
          grid-row: auto;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .plan-features {
          flex: 1;
        }
      }

      /* El filete de Enterprise iba a un cian #06B6D4 que no pertenece a la paleta «Confianza»
         (Ink Blue + Signal Orange): con las tres cards juntas se leían tres familias de color
         distintas. Ahora los tres filetes son de la misma familia y la única card que rompe con
         el naranja de marca es la recomendada, que es justo lo que debe destacar. */
      /* El filete de Enterprise iba a un cian #06B6D4 que no pertenece a la paleta «Confianza»
         (Ink Blue + Signal Orange): con las tres cards juntas se leían tres familias de color
         distintas. El primer arreglo se pasó al otro extremo y lo degradaba casi a blanco, así
         que el filete parecía cortado a media card. Ahora baja sólo hasta un azul medio, que se
         distingue del de Starter sin llegar a desvanecerse contra el fondo. */
      #plan-card-ENTERPRISE::before {
        background: linear-gradient(90deg, #0B3D91 0%, #3E7BC8 100%);
      }

      /* El badge va EN FLUJO, no flotando sobre el borde: así no pisa el filete de acento
         y la fila existe (vacía) en las otras dos cards, que es lo que las alinea. */
      .plan-badge-row {
        display: flex;
        align-items: center;
        min-height: 26px;
      }

      .popular-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #0B3D91 0%, #1D5BBF 100%);
        color: #ffffff;
        font-size: 0.7rem;
        font-weight: 800;
        padding: 6px 16px;
        border-radius: 100px;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        line-height: 1;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(11, 61, 145, 0.28);

        svg {
          flex-shrink: 0;
        }
      }

      .plan-info-header {
        align-self: start;
      }

      .plan-name {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 1.65rem;
        font-weight: 800;
        color: var(--color-text-primary, #0E1B2C);
        margin: 0 0 8px;
        letter-spacing: -0.5px;
      }

      .plan-desc {
        color: var(--color-text-secondary, #5A6473);
        font-size: 0.9rem;
        margin: 0;
        line-height: 1.5;
      }

      .plan-price-container {
        align-self: start;
      }

      .plan-price {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .currency {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-primary, #0B3D91);
      }

      .amount {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 3.5rem;
        font-weight: 800;
        color: var(--color-text-primary, #0E1B2C);
        line-height: 1;
        letter-spacing: -1.5px;
      }

      .period {
        color: var(--color-text-muted, #8C95A3);
        font-size: 0.95rem;
        font-weight: 600;
        margin-left: 2px;
      }

      .annual-note {
        font-size: 0.775rem;
        color: var(--color-success, #0E8A5F);
        background: color-mix(in srgb, var(--color-success, #0E8A5F) 10%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-success, #0E8A5F) 22%, transparent);
        padding: 4px 12px;
        border-radius: 100px;
        display: inline-block;
        margin-top: 10px;
        font-weight: 600;
      }

      .plan-features {
        align-self: start;
        border-top: 1px solid rgba(220, 216, 206, 0.8);
        padding-top: 22px;
      }

      .plan-users {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: var(--color-text-primary, #0E1B2C);
        margin-bottom: 20px;
        font-weight: 600;
        background: rgba(11, 61, 145, 0.04);
        border: 1px solid rgba(11, 61, 145, 0.1);
        padding: 10px 14px;
        border-radius: 12px;

        .user-icon {
          color: var(--color-primary, #0B3D91);
          flex-shrink: 0;
        }

        strong {
          color: var(--color-primary, #0B3D91);
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
          font-size: 0.9rem;
          color: var(--color-text-secondary, #2C3E50);
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1.4;

          .check-icon-wrap {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: color-mix(in srgb, var(--color-success, #0E8A5F) 12%, transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            svg {
              stroke: var(--color-success, #0E8A5F);
            }

            /* Módulo que NO entra en el plan: mismo hueco, sin peso visual. Se marca con un
               guion en gris y NO con una equis roja — un plan más barato no es un error. */
            &.is-absent {
              background: rgba(220, 216, 206, 0.35);

              svg {
                stroke: var(--color-text-muted, #8A8F98);
              }
            }
          }

          &.not-included {
            color: var(--color-text-muted, #8A8F98);
          }
        }
      }

      /* Texto solo para lectores de pantalla: el estado "no incluido" se comunica visualmente
         con el color y el icono, que un lector de pantalla no percibe. */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* El soporte iba con space-between: el canal y el horario se partían en dos líneas
         cada uno y quedaban descuadrados. Ahora apila canal → detalle, siempre a la izquierda. */
      .plan-support {
        align-self: stretch;
        background: rgba(247, 246, 243, 0.75);
        border: 1px solid rgba(220, 216, 206, 0.9);
        border-radius: 14px;
        padding: 14px 16px;
        font-size: 0.8rem;
        color: var(--color-text-secondary, #5A6473);
      }

      .plan-support-channel {
        font-weight: 700;
        font-size: 0.85rem;
        color: var(--color-text-primary, #0E1B2C);
        margin-bottom: 4px;
        line-height: 1.35;
      }

      /* Apilado, no en línea con separador: el horario largo de Starter envolvía y dejaba
         el separador colgando al final de la primera línea. */
      .plan-support-meta {
        display: flex;
        flex-direction: column;
        font-size: 0.775rem;
        color: var(--color-text-muted, #5A6473);
        line-height: 1.45;
      }

      .plan-support-extra {
        margin-top: 8px;
        color: var(--color-success, #0E8A5F);
        font-size: 0.775rem;
        font-weight: 600;
        line-height: 1.45;
      }

      .plan-cta {
        align-self: end;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
        background: rgba(255, 255, 255, 0.9);
        color: var(--color-primary, #0B3D91);
        padding: 14px 24px;
        border-radius: 100px;
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        line-height: 1;
        border: 2px solid color-mix(in srgb, var(--color-primary, #0B3D91) 30%, transparent);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);

        span {
          line-height: 1;
        }

        svg, .cta-arrow {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          transition: transform 0.25s ease;
        }

        &:hover:not(.cta-highlight) {
          background: var(--color-primary, #0B3D91);
          color: #ffffff;
          border-color: var(--color-primary, #0B3D91);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(11, 61, 145, 0.25);

          .cta-arrow {
            transform: translateX(3px);
          }
        }

        &.cta-highlight {
          background: linear-gradient(135deg, #F08C00 0%, #D97706 100%);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 6px 20px rgba(240, 140, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;

          &::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -60%;
            width: 40%;
            height: 200%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transform: rotate(25deg);
            transition: left 0.6s ease;
          }

          &:hover {
            background: linear-gradient(135deg, #FF9800 0%, #E07B00 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(240, 140, 0, 0.48);

            &::after {
              left: 130%;
            }

            .cta-arrow {
              transform: translateX(3px);
            }
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

      /* En una sola columna no hay nada que alinear entre cards: se desactiva el subgrid
         y cada card vuelve a maquetarse en columna. */
      @media (max-width: 900px) {
        .plans-grid {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          grid-template-rows: none;
        }

        .plan-card {
          grid-row: auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .plan-features {
          flex: 1;
        }

        .plan-badge-row:empty {
          display: none;
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
                // Se recorre el catálogo completo (no `p.moduleCodes`) para que las tres cards
                // tengan las mismas filas en el mismo orden y sean comparables línea a línea.
                moduleRows: modules.map((m) => ({
                    name: m.name,
                    included: p.moduleCodes.includes(m.code),
                })),
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
