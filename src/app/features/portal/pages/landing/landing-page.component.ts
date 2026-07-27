import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../services/portal.service';
import { SaasModuleInfo, SaasPlanInfo } from '../../../../core/models/saas.model';
import { MODULE_CONTENT, MODULE_DOMAINS, ModuleDomainKey, minPlanForModule } from '../../../../shared/constants';

/** Acento por DOMINIO (no por módulo): paleta Confianza extendida, 4 tonos disciplinados, no arcoíris neón. */
const DOMAIN_ACCENT_COLORS: Record<ModuleDomainKey, string> = {
    comercial: '#0B3D91', // Ink Blue — mismo azul de marca
    'cadena-suministro': '#0B6FB8', // Info Blue — hermano del azul de marca
    finanzas: '#0E8A5F', // Success Green — dinero, cumplimiento
    personas: '#8B5E34', // Terracota cálido — el único tono "de calor humano"
};

interface ModuleCardView {
    code: string;
    name: string;
    purpose: string;
    capabilities: string[];
    minPlan: SaasPlanInfo | undefined;
}

interface DomainGroupView {
    key: ModuleDomainKey;
    label: string;
    description: string;
    accent: string;
    modules: ModuleCardView[];
}

/** Dolores reales de una pyme sin sistema conectado (framework PAS: problema→agitar→transición a la solución). */
const PROBLEM_POINTS: string[] = [
    'Vendes con cuaderno o Excel, y al cierre de mes nadie sabe si el stock real coincide con lo que dice el papel.',
    'Facturas manualmente o pagas a un tercero aparte solo para cumplir con SUNAT, sin que se conecte con tus ventas.',
    'Ventas, compras y contabilidad viven en archivos distintos, y armar un solo reporte implica copiar y pegar durante horas.',
    'Cuando creces y necesitas más de un almacén o una planilla de RRHH, tu sistema de hojas sueltas simplemente no aguanta.',
];

/** Pasos reales del onboarding SaaS (SaasOnboardingCommandService: registro → suscripción → módulos habilitados). */
const HOW_IT_WORKS_STEPS: { title: string; description: string }[] = [
    { title: 'Registra tu RUC', description: 'Crea tu empresa con tu RUC y elige el plan según lo que necesitas hoy. 30 días de prueba, sin tarjeta.' },
    { title: 'Tus módulos se activan solos', description: 'POS, ventas, inventario, compras... se habilitan automáticamente según tu plan, sin instalaciones ni configuraciones complejas.' },
    { title: 'Vende y factura desde el día uno', description: 'Emite comprobantes electrónicos SUNAT con todo ya conectado a tu inventario y tu contabilidad.' },
];

/** Confianza real y verificable (NO testimonios inventados — no hay clientes reales que citar todavía). */
const TRUST_POINTS: string[] = [
    'Aislamiento de datos por empresa: nadie fuera de tu RUC ve tu información',
    'Contraseñas cifradas con BCrypt, nunca en texto plano',
    'Cada registro guarda qué usuario lo creó o modificó y cuándo',
    'La misma seguridad para los 3 planes: no se cobra distinto por estar protegido',
];

/** FAQ con respuestas honestas — ninguna promete algo que el sistema real todavía no hace (ver auditoría 2026-07-26). */
const FAQ_ITEMS: { question: string; answer: string }[] = [
    { question: '¿Necesito tarjeta de crédito para probarlo?', answer: 'No. Regístrate con tu RUC y tienes 30 días de prueba, sin tarjeta ni compromiso de permanencia.' },
    { question: '¿Los comprobantes que emito son válidos ante SUNAT?', answer: 'El sistema genera comprobantes electrónicos en formato UBL 2.1, el estándar que exige SUNAT. Emitir en producción requiere el certificado digital de tu empresa; nuestro equipo te guía en esa configuración.' },
    { question: '¿Qué pasa si mi empresa ya usa Excel o un sistema antiguo?', answer: 'Puedes empezar a operar de inmediato. Si necesitas migrar tu historial de datos, escríbenos y te ayudamos según el volumen.' },
    { question: '¿Puedo cambiar de plan más adelante?', answer: 'Sí, tu plan puede crecer junto con tu negocio; escríbenos cuando necesites más módulos o usuarios.' },
    { question: '¿Qué pasa si necesito más usuarios de los que incluye mi plan?', answer: 'Tu equipo actual sigue operando sin problema; para sumar usuarios por encima del límite de tu plan, actualízalo cuando lo necesites.' },
    { question: '¿Mis datos están seguros?', answer: 'Sí: aislamos los datos de cada empresa, ciframos las contraseñas y cada acción queda registrada. Puedes ver el detalle completo en Planes.' },
];

@Component({
    selector: 'app-landing-page',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="landing-canvas">

      <!-- ============ HERO ============ -->
      <section class="hero-section">
        <div class="wrap hero-grid">
          <div class="hero-copy">
            <span class="kicker">🇵🇪 Hecho para el comercio peruano</span>
            <h1 class="hero-title">
              El ERP que entiende<br>
              <span class="hero-title-accent">tu negocio</span>
            </h1>
            <p class="hero-subtitle">
              Ventas, inventario, compras y contabilidad en un solo lugar. Emite tus comprobantes
              electrónicos SUNAT desde el primer día, sin hojas de cálculo sueltas ni sistemas a medias.
            </p>
            <div class="hero-actions">
              <a routerLink="/portal/register" id="btn-hero-cta" class="btn-primary">
                Empezar gratis
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a routerLink="/portal/pricing" id="btn-hero-plans" class="btn-secondary">Ver planes</a>
            </div>

            <div class="hero-ledger" role="list">
              <span role="listitem">{{ modules().length || 8 }} módulos integrados</span>
              <span class="dot" aria-hidden="true">·</span>
              <span role="listitem">Comprobantes SUNAT desde el día uno</span>
              <span class="dot" aria-hidden="true">·</span>
              <span role="listitem">Soporte en español, hecho en Perú</span>
            </div>
          </div>

          <div class="hero-art animate-float" aria-hidden="true">
            <svg viewBox="0 0 360 380" class="art-svg">
              <rect x="14" y="222" width="96" height="76" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" transform="rotate(-7 62 260)"/>
              <rect x="248" y="46" width="86" height="68" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" transform="rotate(9 291 80)"/>

              <g transform="rotate(-3 180 190)">
                <rect x="88" y="46" width="184" height="284" rx="16" fill="#FFFFFF" stroke="#DCD8CE" stroke-width="1.5"/>

                <rect x="110" y="72" width="92" height="11" rx="3" fill="#0B3D91"/>
                <rect x="110" y="91" width="60" height="7" rx="3" fill="#8C95A3"/>

                <g fill="#0E1B2C">
                  <rect x="220" y="68" width="9" height="9"/>
                  <rect x="233" y="68" width="9" height="9"/>
                  <rect x="220" y="81" width="9" height="9"/>
                  <rect x="246" y="68" width="9" height="9"/>
                  <rect x="233" y="81" width="9" height="9"/>
                  <rect x="246" y="94" width="9" height="9"/>
                </g>

                <line x1="110" y1="116" x2="250" y2="116" stroke="#DCD8CE" stroke-width="1.5" stroke-dasharray="3 4"/>

                <rect x="110" y="134" width="122" height="7" rx="3" fill="#DCD8CE"/>
                <rect x="110" y="152" width="98" height="7" rx="3" fill="#DCD8CE"/>
                <rect x="110" y="170" width="112" height="7" rx="3" fill="#DCD8CE"/>
                <rect x="110" y="188" width="86" height="7" rx="3" fill="#DCD8CE"/>

                <line x1="110" y1="214" x2="250" y2="214" stroke="#0E1B2C" stroke-width="1.5"/>
                <text x="110" y="242" font-family="'Source Serif 4', Georgia, serif" font-size="22" font-weight="700" fill="#0E1B2C">S/ 248.50</text>
              </g>

              <g transform="translate(238 268) rotate(-11)">
                <circle r="48" fill="none" stroke="#0E8A5F" stroke-width="3"/>
                <circle r="39" fill="none" stroke="#0E8A5F" stroke-width="1.5" stroke-dasharray="2 3"/>
                <text x="0" y="-6" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="800" fill="#0E8A5F" letter-spacing="1">SUNAT</text>
                <text x="0" y="11" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="800" fill="#0E8A5F" letter-spacing="1">VÁLIDO</text>
                <path d="M -11 24 L -3 32 L 13 13" stroke="#0E8A5F" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- ============ PROBLEMA ============ -->
      <section class="problem-section">
        <div class="wrap problem-grid">
          <div class="problem-head">
            <span class="section-kicker">El caos que ya conoces</span>
            <h2 class="section-title">Tu negocio ya no cabe en una hoja de cálculo</h2>
            <p class="section-subtitle">Así se ve manejar una empresa sin un sistema conectado:</p>
          </div>

          <ul class="problem-list">
            @for (point of problemPoints; track point) {
              <li class="problem-item">
                <span class="problem-mark" aria-hidden="true">✕</span>
                <span>{{ point }}</span>
              </li>
            }
          </ul>

          <p class="problem-bridge">
            AppShop conecta las {{ modules().length || 8 }} áreas de tu negocio en un solo sistema, con comprobantes SUNAT desde el primer día.
          </p>
        </div>
      </section>

      <!-- ============ MÓDULOS POR DOMINIO ============ -->
      <section class="modules-section">
        <div class="wrap">
          <div class="section-head">
            <span class="section-kicker">Todo tu negocio, un solo sistema</span>
            <h2 class="section-title">Organizado como realmente trabaja tu empresa</h2>
            <p class="section-subtitle">
              {{ modules().length }} módulos agrupados en {{ domainGroups().length }} frentes de tu operación diaria.
            </p>
          </div>

          @for (group of domainGroups(); track group.key; let gi = $index) {
            <div class="domain-block" [style]="'--accent:' + group.accent">
              <div class="domain-heading">
                <span class="domain-index">{{ gi + 1 < 10 ? '0' + (gi + 1) : gi + 1 }}</span>
                <div class="domain-heading-text">
                  <h3>{{ group.label }}</h3>
                  <p>{{ group.description }}</p>
                </div>
              </div>

              <div class="module-row">
                @for (mod of group.modules; track mod.code) {
                  <article class="module-card" [id]="'module-' + mod.code">
                    <div class="module-card-top">
                      <div class="module-icon">
                        @switch (mod.code) {
                          @case ('POS') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M12 7h.01"/><path d="M9 10h6"/></svg>
                          }
                          @case ('VENTAS') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M3 18l6-6 4 4 8-8"/></svg>
                          }
                          @case ('COMPRAS') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          }
                          @case ('INVENTARIO') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l-7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                          }
                          @case ('CONTABILIDAD') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg>
                          }
                          @case ('LOGISTICA') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                          }
                          @case ('TESORERIA') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polygon points="12 2 2 7 22 7"/><line x1="5" y1="10" x2="5" y2="21"/><line x1="19" y1="10" x2="19" y2="21"/></svg>
                          }
                          @case ('RRHH') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          }
                        }
                      </div>
                      <h4>{{ mod.name }}</h4>
                    </div>

                    <p class="module-purpose">{{ mod.purpose }}</p>

                    <div class="module-perf" aria-hidden="true"></div>

                    <ul class="module-caps">
                      @for (capability of mod.capabilities; track capability) {
                        <li>{{ capability }}</li>
                      }
                    </ul>

                    @if (mod.minPlan) {
                      <a routerLink="/portal/pricing" class="module-plan">Desde plan {{ mod.minPlan.name }}</a>
                    }
                  </article>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- ============ CÓMO FUNCIONA ============ -->
      <section class="how-section">
        <div class="wrap">
          <div class="section-head">
            <span class="section-kicker">Así de simple</span>
            <h2 class="section-title">De cero a operando en minutos</h2>
          </div>

          <div class="how-row">
            @for (step of howItWorksSteps; track step.title; let si = $index) {
              <div class="how-step">
                <span class="how-index">{{ si + 1 < 10 ? '0' + (si + 1) : si + 1 }}</span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ============ CONFIANZA / SEGURIDAD ============ -->
      <section class="trust-section">
        <div class="wrap trust-panel">
          <div class="trust-head">
            <span class="section-kicker">Por qué confiar tus datos</span>
            <h2 class="section-title">Seguridad de nivel empresarial, en todos los planes</h2>
          </div>

          <ul class="trust-list">
            @for (point of trustPoints; track point) {
              <li>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success, #0E8A5F)" stroke-width="3" class="trust-check"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ point }}</span>
              </li>
            }
          </ul>

          <a routerLink="/portal/pricing" class="trust-link">Ver todos los controles de seguridad →</a>
        </div>
      </section>

      <!-- ============ FAQ ============ -->
      <section class="faq-section">
        <div class="wrap">
          <div class="section-head">
            <span class="section-kicker">Preguntas frecuentes</span>
            <h2 class="section-title">Lo que suelen preguntarnos</h2>
          </div>

          <div class="faq-list">
            @for (item of faqItems; track item.question) {
              <div class="faq-item">
                <h3>{{ item.question }}</h3>
                <p>{{ item.answer }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ============ CTA FINAL ============ -->
      <section class="cta-band">
        <div class="wrap cta-inner">
          <span class="sello">30 días gratis</span>
          <h2>¿Listo para ordenar tu negocio?</h2>
          <p>Registra tu RUC y empieza hoy mismo. Sin tarjeta, sin instalación, sin vueltas.</p>
          <a routerLink="/portal/register" id="btn-banner-cta" class="btn-primary btn-on-band">Registrar mi empresa</a>
        </div>
      </section>

    </div>
    `,
    styles: [`
      .landing-canvas {
        background: var(--color-background, #F7F6F3);
        color: var(--color-text-primary, #0E1B2C);
        font-family: var(--f-sans, 'Inter', sans-serif);
        position: relative;
        z-index: 10;
      }

      .wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 0 24px;
      }

      /* ---------- Hero ---------- */
      /* section/article traen margin-bottom global (_layout.scss "harmonic structural spacing") — se anula aquí para controlar el espaciado exacto de esta página. */
      .hero-section,
      .problem-section,
      .modules-section,
      .how-section,
      .trust-section,
      .faq-section,
      .cta-band {
        margin-bottom: 0;
      }

      .hero-section {
        position: relative;
        overflow: hidden;
        background: var(--color-primary, #0B3D91);
        padding: 100px 0 118px;
        color: #ffffff;

        /* Textura sutil: trama de puntos, no glassmorphism — profundidad sin blur decorativo */
        &::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        &::after {
          content: '';
          position: absolute;
          top: -35%;
          right: -12%;
          width: 55%;
          height: 140%;
          background: radial-gradient(circle, rgba(240, 140, 0, 0.16) 0%, transparent 68%);
          pointer-events: none;
        }
      }

      .hero-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 56px;
        align-items: center;
      }

      .kicker {
        display: inline-flex;
        align-items: center;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.2px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.32);
        border-radius: var(--r-full, 999px);
        padding: 6px 16px;
        margin-bottom: 28px;
      }

      .hero-title {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: clamp(2.75rem, 5.2vw, 4.4rem);
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: -1px;
        margin: 0 0 24px;
        color: #ffffff;
      }

      .hero-title-accent {
        color: var(--color-accent, #F08C00);
      }

      .hero-subtitle {
        font-size: 1.15rem;
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.82);
        max-width: 520px;
        margin: 0 0 36px;
      }

      .hero-actions {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 40px;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--color-accent, #F08C00);
        color: #ffffff;
        padding: 14px 28px;
        border-radius: var(--r-md, 10px);
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        box-shadow: var(--s-sm, 0 1px 2px rgba(15,23,42,.08));
        transition: transform 0.2s var(--ease-out, ease), box-shadow 0.2s ease, background 0.2s ease;

        svg { transition: transform 0.2s ease; }

        &:hover {
          background: var(--color-accent-dark, #C97300);
          transform: translateY(-2px);
          box-shadow: var(--s-md, 0 4px 12px rgba(15,23,42,.12));

          svg { transform: translateX(3px); }
        }
      }

      .btn-secondary {
        display: inline-flex;
        align-items: center;
        color: #ffffff;
        background: transparent;
        border: 1.5px solid rgba(255, 255, 255, 0.4);
        padding: 13px 26px;
        border-radius: var(--r-md, 10px);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.2s ease;

        &:hover {
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }
      }

      .hero-ledger {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        padding-top: 24px;
        border-top: 1px dashed rgba(255, 255, 255, 0.25);
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.68);
        max-width: 560px;

        .dot { color: rgba(255, 255, 255, 0.3); }
      }

      .hero-art {
        position: relative;
        z-index: 1;
        display: flex;
        justify-content: center;
      }

      .art-svg {
        width: 100%;
        max-width: 400px;
        height: auto;
        filter: drop-shadow(0 30px 50px rgba(0, 0, 0, 0.32));
      }

      /* ---------- Módulos ---------- */
      .modules-section {
        padding: 40px 0 96px;
      }

      .section-head {
        max-width: 640px;
        margin: 0 0 56px;
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
        font-size: clamp(1.9rem, 3vw, 2.5rem);
        font-weight: 700;
        margin: 0 0 12px;
        letter-spacing: -0.4px;
      }

      .section-subtitle {
        color: var(--color-text-secondary, #5A6473);
        font-size: 1rem;
        margin: 0;
      }

      .domain-block {
        margin-bottom: 64px;

        &:last-child { margin-bottom: 0; }
      }

      .domain-heading {
        display: flex;
        align-items: baseline;
        gap: 18px;
        margin-bottom: 28px;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--accent);
      }

      .domain-index {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 2rem;
        font-weight: 700;
        color: var(--accent);
        line-height: 1;
        flex-shrink: 0;
      }

      .domain-heading-text {
        h3 {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0 0 4px;
          color: var(--color-text-primary, #0E1B2C);
        }

        p {
          margin: 0;
          color: var(--color-text-secondary, #5A6473);
          font-size: 0.925rem;
        }
      }

      .module-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px;
      }

      .module-card {
        margin-bottom: 0;
        position: relative;
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-lg, 14px);
        padding: 26px 24px 22px;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s var(--ease-out, ease), box-shadow 0.2s ease, border-color 0.2s ease;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 3px;
          background: var(--accent);
          border-radius: 0 0 3px 3px;
        }

        &:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: var(--s-lg, 0 8px 24px rgba(15,23,42,.08));
        }
      }

      .module-card-top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }

      .module-icon {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        border-radius: var(--r-md, 10px);
        background: color-mix(in srgb, var(--accent) 12%, white);
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 20px;
          height: 20px;
          color: var(--accent);
        }
      }

      .module-card-top h4 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--color-text-primary, #0E1B2C);
      }

      .module-purpose {
        font-size: 0.875rem;
        color: var(--color-text-secondary, #5A6473);
        line-height: 1.5;
        margin: 0;
      }

      .module-perf {
        height: 16px;
        margin: 14px -24px 12px;
        background-image: radial-gradient(circle at 8px 8px, var(--color-background, #F7F6F3) 5px, transparent 5.5px);
        background-size: 16px 16px;
        background-position: -8px center;
        background-repeat: repeat-x;
        border-top: 1px dashed var(--color-border, #DCD8CE);
      }

      .module-caps {
        list-style: none;
        margin: 0 0 18px;
        padding: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;

        li {
          position: relative;
          padding-left: 16px;
          font-size: 0.825rem;
          color: var(--color-text-secondary, #5A6473);
          line-height: 1.45;

          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 7px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--accent);
          }
        }
      }

      .module-plan {
        align-self: flex-start;
        font-size: 0.775rem;
        font-weight: 700;
        color: var(--accent);
        text-decoration: none;
        border-bottom: 1.5px solid color-mix(in srgb, var(--accent) 40%, transparent);
        padding-bottom: 1px;

        &:hover { border-color: var(--accent); }
      }

      /* ---------- Problema ---------- */
      .problem-section {
        padding: 24px 0 88px;
      }

      .problem-grid {
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 56px;
        align-items: start;
      }

      .problem-head {
        position: sticky;
        top: 96px;
      }

      .problem-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .problem-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        font-size: 1rem;
        line-height: 1.55;
        color: var(--color-text-secondary, #5A6473);
        padding-bottom: 20px;
        border-bottom: 1px dashed var(--color-border, #DCD8CE);

        &:last-child { border-bottom: none; padding-bottom: 0; }
      }

      .problem-mark {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1.5px solid var(--color-warning, #B45309);
        color: var(--color-warning, #B45309);
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .problem-bridge {
        grid-column: 1 / -1;
        margin: 8px 0 0;
        padding-top: 32px;
        border-top: 2px solid var(--color-primary, #0B3D91);
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--color-primary, #0B3D91);
        line-height: 1.4;
      }

      /* ---------- Cómo funciona ---------- */
      .how-section {
        background: var(--color-surface-raised, #EFEDE7);
        padding: 72px 0;
      }

      .how-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 40px;
      }

      .how-step {
        h3 {
          font-size: 1.15rem;
          font-weight: 700;
          margin: 10px 0 8px;
          color: var(--color-text-primary, #0E1B2C);
        }

        p {
          margin: 0;
          color: var(--color-text-secondary, #5A6473);
          font-size: 0.925rem;
          line-height: 1.55;
        }
      }

      .how-index {
        display: inline-block;
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 2.25rem;
        font-weight: 700;
        color: var(--color-accent, #F08C00);
        line-height: 1;
      }

      /* ---------- Confianza / Seguridad ---------- */
      .trust-section {
        padding: 0 0 96px;
      }

      .trust-panel {
        background: color-mix(in srgb, var(--color-success, #0E8A5F) 5%, var(--color-surface, #FFFFFF));
        border: 1px solid color-mix(in srgb, var(--color-success, #0E8A5F) 22%, var(--color-border, #DCD8CE));
        border-radius: var(--r-lg, 14px);
        padding: 44px 40px;
      }

      .trust-head {
        max-width: 640px;
        margin: 0 0 28px;
      }

      .trust-list {
        list-style: none;
        margin: 0 0 24px;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px 32px;

        li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.925rem;
          color: var(--color-text-secondary, #5A6473);
          line-height: 1.5;
        }
      }

      .trust-check {
        flex-shrink: 0;
        margin-top: 3px;
      }

      .trust-link {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--color-primary, #0B3D91);
        text-decoration: none;
        border-bottom: 1.5px solid color-mix(in srgb, var(--color-primary, #0B3D91) 35%, transparent);
        padding-bottom: 1px;

        &:hover { border-color: var(--color-primary, #0B3D91); }
      }

      /* ---------- FAQ ---------- */
      .faq-section {
        padding: 0 0 96px;
      }

      .faq-list {
        max-width: 760px;
      }

      .faq-item {
        padding: 22px 0;
        border-bottom: 1px solid var(--color-border, #DCD8CE);

        &:last-child { border-bottom: none; }

        h3 {
          font-size: 1.02rem;
          font-weight: 700;
          margin: 0 0 8px;
          color: var(--color-text-primary, #0E1B2C);
        }

        p {
          margin: 0;
          color: var(--color-text-secondary, #5A6473);
          font-size: 0.925rem;
          line-height: 1.6;
        }
      }

      /* ---------- CTA final: momento "drenched" en Ink Blue ---------- */
      .cta-band {
        background: var(--color-primary, #0B3D91);
        padding: 72px 0;
      }

      .cta-inner {
        max-width: 620px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .sello {
        display: inline-flex;
        align-items: center;
        border: 2px solid var(--color-accent, #F08C00);
        border-radius: var(--r-full, 999px);
        padding: 7px 18px;
        transform: rotate(-4deg);
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #ffffff;
        margin-bottom: 24px;
      }

      .cta-band h2 {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: clamp(1.8rem, 3.4vw, 2.5rem);
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 14px;
      }

      .cta-band p {
        color: rgba(255, 255, 255, 0.78);
        font-size: 1.05rem;
        margin: 0 0 32px;
      }

      .btn-on-band {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      /* ---------- Responsive ---------- */
      @media (max-width: 860px) {
        .hero-grid {
          grid-template-columns: 1fr;
        }

        .hero-art {
          order: -1;
          margin-bottom: 8px;
        }

        .art-svg {
          max-width: 260px;
        }

        .problem-grid {
          grid-template-columns: 1fr;
          gap: 32px;
        }

        .problem-head {
          position: static;
        }
      }

      @media (max-width: 560px) {
        .hero-section { padding: 48px 0 64px; }
        .domain-heading { align-items: flex-start; }
      }
    `]
})
export class LandingPageComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly portalService = inject(PortalService);

    readonly plans = signal<SaasPlanInfo[]>([]);
    readonly modules = signal<SaasModuleInfo[]>([]);

    readonly problemPoints = PROBLEM_POINTS;
    readonly howItWorksSteps = HOW_IT_WORKS_STEPS;
    readonly trustPoints = TRUST_POINTS;
    readonly faqItems = FAQ_ITEMS;

    readonly domainGroups = computed<DomainGroupView[]>(() => {
        const modules = this.modules();
        const plans = this.plans();

        return MODULE_DOMAINS
            .map((domain) => ({
                key: domain.key,
                label: domain.label,
                description: domain.description,
                accent: DOMAIN_ACCENT_COLORS[domain.key],
                modules: modules
                    .filter((mod) => MODULE_CONTENT[mod.code]?.domain === domain.key)
                    .map((mod) => ({
                        code: mod.code,
                        name: mod.name,
                        purpose: MODULE_CONTENT[mod.code].purpose,
                        capabilities: MODULE_CONTENT[mod.code].capabilities,
                        minPlan: minPlanForModule(mod.code, plans),
                    })),
            }))
            .filter((group) => group.modules.length > 0);
    });

    ngOnInit(): void {
        this.titleService.setTitle('AppShop ERP - El ERP Todo-en-Uno para Empresas Peruanas');
        this.metaService.updateTag({ name: 'description', content: 'Gestiona ventas, inventario, compras, contabilidad y facturación electrónica SUNAT con AppShop ERP. Diseñado especialmente para pymes y empresas en Perú. Empieza gratis.' });

        // OpenGraph tags for SEO
        this.metaService.updateTag({ property: 'og:title', content: 'AppShop ERP - El ERP Todo-en-Uno para Empresas Peruanas' });
        this.metaService.updateTag({ property: 'og:description', content: 'Gestiona ventas, inventario, compras, contabilidad y facturación electrónica SUNAT de forma unificada.' });
        this.metaService.updateTag({ property: 'og:type', content: 'website' });

        forkJoin({
            plans: this.portalService.getPlans(),
            modules: this.portalService.getModules(),
        }).subscribe({
            next: ({ plans, modules }) => {
                this.plans.set(plans);
                this.modules.set(modules);
            },
        });
    }
}
