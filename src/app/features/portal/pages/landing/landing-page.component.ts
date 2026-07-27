import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../services/portal.service';
import { SaasModuleInfo, SaasPlanInfo } from '../../../../core/models/saas.model';
import { DOMAIN_ACCENT_COLORS, MODULE_CONTENT, MODULE_DOMAINS, ModuleDomainKey, minPlanForModule } from '../../../../shared/constants';

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
        <!-- Modern connected ERP background graphic -->
        <div class="hero-bg-graphic" aria-hidden="true">
          <svg viewBox="0 0 1440 500" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>
              </pattern>
              <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: var(--color-info)" stop-opacity="0.4"/>
                <stop offset="50%" style="stop-color: var(--color-success)" stop-opacity="0.3"/>
                <stop offset="100%" style="stop-color: var(--color-accent)" stop-opacity="0.2"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)"/>
            
            <!-- Flow network lines -->
            <g stroke-linecap="round" opacity="0.4">
              <!-- Flow line 1 -->
              <path d="M-100,120 C200,80 400,280 700,160 C1000,40 1200,260 1600,180" stroke="url(#flow-grad)" stroke-width="3" fill="none"/>
              <!-- Flow line 2 -->
              <path d="M-100,260 C250,300 500,120 800,220 C1100,320 1300,140 1600,160" stroke="rgba(255,255,255,0.08)" stroke-dasharray="8 6" stroke-width="1.5" fill="none" class="flow-path-2"/>
            </g>

            <!-- Decorative glow nodes (posicionados fuera de la columna de texto: x>900 cae en la zona de la ilustracion, no sobre hero-copy) -->
            <g class="glow-nodes">
              <circle cx="200" cy="80" r="4" style="fill: var(--color-primary-contrast)" opacity="0.6"/>
              <circle cx="950" cy="70" r="5" style="fill: var(--color-accent)" class="pulse-node-1"/>
              <circle cx="1080" cy="160" r="4" style="fill: var(--color-primary-contrast)" opacity="0.6"/>
              <circle cx="1150" cy="230" r="6" style="fill: var(--color-success)" class="pulse-node-2"/>
              <circle cx="1000" cy="40" r="4" style="fill: var(--color-primary-contrast)" opacity="0.6"/>
              <circle cx="1300" cy="270" r="5" style="fill: var(--color-info)" class="pulse-node-3"/>
            </g>
          </svg>
        </div>

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
                <rect x="88" y="46" width="184" height="284" rx="16" style="fill: var(--color-surface); stroke: var(--color-border)" stroke-width="1.5"/>

                <rect x="110" y="72" width="92" height="11" rx="3" style="fill: var(--color-primary)"/>
                <rect x="110" y="91" width="60" height="7" rx="3" style="fill: var(--color-text-muted)"/>

                <g style="fill: var(--color-text-primary)">
                  <rect x="220" y="68" width="9" height="9"/>
                  <rect x="233" y="68" width="9" height="9"/>
                  <rect x="220" y="81" width="9" height="9"/>
                  <rect x="246" y="68" width="9" height="9"/>
                  <rect x="233" y="81" width="9" height="9"/>
                  <rect x="246" y="94" width="9" height="9"/>
                </g>

                <line x1="110" y1="116" x2="250" y2="116" style="stroke: var(--color-border)" stroke-width="1.5" stroke-dasharray="3 4"/>

                <rect x="110" y="134" width="122" height="7" rx="3" style="fill: var(--color-border)"/>
                <rect x="110" y="152" width="98" height="7" rx="3" style="fill: var(--color-border)"/>
                <rect x="110" y="170" width="112" height="7" rx="3" style="fill: var(--color-border)"/>
                <rect x="110" y="188" width="86" height="7" rx="3" style="fill: var(--color-border)"/>

                <line x1="110" y1="214" x2="250" y2="214" style="stroke: var(--color-text-primary)" stroke-width="1.5"/>
                <text x="110" y="242" font-family="'Source Serif 4', Georgia, serif" font-size="22" font-weight="700" style="fill: var(--color-text-primary)">S/ 248.50</text>
              </g>

              <g transform="translate(238 268) rotate(-11)">
                <circle r="48" fill="none" style="stroke: var(--color-success)" stroke-width="3"/>
                <circle r="39" fill="none" style="stroke: var(--color-success)" stroke-width="1.5" stroke-dasharray="2 3"/>
                <text x="0" y="-6" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="800" style="fill: var(--color-success)" letter-spacing="1">SUNAT</text>
                <text x="0" y="11" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="800" style="fill: var(--color-success)" letter-spacing="1">VÁLIDO</text>
                <path d="M -11 24 L -3 32 L 13 13" style="stroke: var(--color-success)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- ============ PROBLEMA ============ -->
      <section class="problem-section">
        <!-- Subtle background graphic for problem section -->
        <div class="problem-graphic" aria-hidden="true">
          <svg viewBox="0 0 320 280" class="problem-svg" xmlns="http://www.w3.org/2000/svg">
            <!-- Floating disconnected spreadsheet cells & papers -->
            <g transform="rotate(-8 180 140)">
              <rect x="170" y="70" width="70" height="40" rx="4" style="fill: var(--color-surface); stroke: var(--color-warning)" stroke-width="1.5" opacity="0.95"/>
              <line x1="180" y1="85" x2="230" y2="85" style="stroke: var(--color-warning)" stroke-width="1.5"/>
              <line x1="180" y1="95" x2="210" y2="95" style="stroke: var(--color-warning)" stroke-width="1.5"/>
              <circle cx="225" cy="95" r="3" style="fill: var(--color-warning)"/>
            </g>
            <g transform="rotate(12 210 180)">
              <rect x="200" y="150" width="60" height="35" rx="4" style="fill: var(--color-surface); stroke: var(--color-border)" stroke-width="1.2" opacity="0.9"/>
              <line x1="210" y1="162" x2="250" y2="162" style="stroke: var(--color-text-secondary)" stroke-width="1"/>
              <line x1="210" y1="172" x2="235" y2="172" style="stroke: var(--color-text-secondary)" stroke-width="1"/>
            </g>
            <g transform="rotate(-15 60 160)">
              <rect x="30" y="110" width="50" height="65" rx="5" style="fill: var(--color-surface); stroke: var(--color-warning)" stroke-width="1.5" opacity="0.95"/>
              <rect x="40" y="122" width="30" height="8" rx="1" style="fill: color-mix(in srgb, var(--color-warning) 10%, transparent)"/>
              <circle cx="45" cy="142" r="2.5" style="fill: var(--color-warning)"/>
              <circle cx="55" cy="142" r="2.5" style="fill: var(--color-warning)"/>
              <circle cx="65" cy="142" r="2.5" style="fill: var(--color-warning)"/>
              <circle cx="45" cy="155" r="2.5" style="fill: var(--color-warning)"/>
              <circle cx="55" cy="155" r="2.5" style="fill: var(--color-warning)"/>
              <circle cx="65" cy="155" r="2.5" style="fill: var(--color-warning)"/>
            </g>
          </svg>
        </div>

        <div class="wrap problem-grid">
          <div class="problem-content">
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

                    <!-- Vibrant Multi-Tone Abstract SVG Background Graphic -->
                    <div class="card-bg-graphic" aria-hidden="true">
                      @switch (mod.code) {
                        @case ('POS') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="pos-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.3"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="60" fill="url(#pos-glow)"/>
                            <path d="M 20,140 Q 60,80 100,110 T 150,50" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 40,150 Q 80,100 120,125 T 160,80" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round" opacity="0.4"/>
                            <circle cx="150" cy="50" r="6" fill="var(--accent)"/>
                            <circle cx="100" cy="110" r="4" fill="var(--accent)" opacity="0.7"/>
                          </svg>
                        }
                        @case ('VENTAS') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="ventas-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.35"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#ventas-glow)"/>
                            <path d="M 15,135 Q 55,100 95,115 T 150,45" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round"/>
                            <path d="M 30,145 Q 70,110 110,125 T 165,55" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
                            <circle cx="150" cy="45" r="7" fill="var(--accent)"/>
                            <circle cx="95" cy="115" r="4" fill="var(--accent)" opacity="0.7"/>
                          </svg>
                        }
                        @case ('COMPRAS') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="compras-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.3"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#compras-glow)"/>
                            <path d="M 130,30 Q 90,90 80,145" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 150,45 Q 110,105 100,160" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round" opacity="0.4"/>
                            <circle cx="130" cy="30" r="5" fill="var(--accent)"/>
                            <circle cx="80" cy="145" r="6" fill="var(--accent)" opacity="0.8"/>
                          </svg>
                        }
                        @case ('INVENTARIO') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="inv-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.35"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#inv-glow)"/>
                            <g transform="translate(100, 75)" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="0,-24 38,-4 0,16 -38,-4" fill="var(--accent)" fill-opacity="0.12"/>
                              <line x1="-38" y1="-4" x2="-38" y2="24"/>
                              <line x1="38" y1="-4" x2="38" y2="24"/>
                              <line x1="0" y1="16" x2="0" y2="44"/>
                              <polygon points="-38,24 0,44 38,24 0,4" fill="var(--accent)" fill-opacity="0.18"/>
                            </g>
                          </svg>
                        }
                        @case ('LOGISTICA') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="120" cy="120" r="60" fill="var(--accent)" fill-opacity="0.12"/>
                            <path d="M 20,110 H 140" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 125,95 L 142,110 L 125,125" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="50" cy="110" r="4" fill="var(--accent)"/>
                            <circle cx="90" cy="110" r="4" fill="var(--accent)" opacity="0.7"/>
                          </svg>
                        }
                        @case ('CONTABILIDAD') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="conta-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.3"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#conta-glow)"/>
                            <path d="M 20,130 Q 70,75 110,120 T 155,70" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 35,145 Q 85,90 125,135 T 165,85" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="4 3" opacity="0.4"/>
                            <circle cx="110" cy="120" r="5" fill="var(--accent)"/>
                            <circle cx="155" cy="70" r="6" fill="var(--accent)" opacity="0.8"/>
                          </svg>
                        }
                        @case ('TESORERIA') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="teso-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.35"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#teso-glow)"/>
                            <path d="M 25,135 C 65,80 95,140 145,85" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 30,115 C 70,60 100,120 150,65" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.4"/>
                            <circle cx="145" cy="85" r="6" fill="var(--accent)"/>
                          </svg>
                        }
                        @case ('RRHH') {
                          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="rrhh-glow" cx="80%" cy="80%" r="70%">
                                <stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.3"/>
                                <stop offset="100%" style="stop-color: var(--accent)" stop-opacity="0"/>
                              </radialGradient>
                            </defs>
                            <circle cx="120" cy="120" r="65" fill="url(#rrhh-glow)"/>
                            <circle cx="85" cy="115" r="28" stroke="var(--accent)" stroke-width="2.5"/>
                            <circle cx="125" cy="115" r="28" stroke="var(--accent)" stroke-width="2" opacity="0.6"/>
                            <circle cx="105" cy="85" r="20" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.8"/>
                            <circle cx="105" cy="85" r="4" fill="var(--accent)"/>
                            <circle cx="85" cy="115" r="4" fill="var(--accent)" opacity="0.8"/>
                            <circle cx="125" cy="115" r="4" fill="var(--accent)" opacity="0.6"/>
                          </svg>
                        }
                      }
                    </div>
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
          <div class="trust-content">
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
          <div class="trust-graphic">
            <svg viewBox="0 0 280 280" class="trust-svg" xmlns="http://www.w3.org/2000/svg">
              <!-- Outer decorative tech circles -->
              <circle cx="140" cy="140" r="110" fill="none" style="stroke: color-mix(in srgb, var(--color-success) 15%, transparent)" stroke-width="1.5"/>
              <circle cx="140" cy="140" r="90" fill="none" style="stroke: color-mix(in srgb, var(--color-success) 20%, transparent)" stroke-width="1" stroke-dasharray="4 4"/>

              <!-- Encrypted nodes around the central lock -->
              <g style="stroke: color-mix(in srgb, var(--color-success) 25%, transparent)" stroke-width="1">
                <line x1="140" y1="40" x2="60" y2="100"/>
                <line x1="140" y1="40" x2="220" y2="100"/>
                <line x1="60" y1="100" x2="60" y2="180"/>
                <line x1="220" y1="100" x2="220" y2="180"/>
                <line x1="60" y1="180" x2="140" y2="240"/>
                <line x1="220" y1="180" x2="140" y2="240"/>
                <line x1="140" y1="140" x2="140" y2="40"/>
                <line x1="140" y1="140" x2="60" y2="100"/>
                <line x1="140" y1="140" x2="220" y2="100"/>
                <line x1="140" y1="140" x2="60" y2="180"/>
                <line x1="140" y1="140" x2="220" y2="180"/>
                <line x1="140" y1="140" x2="140" y2="240"/>
              </g>

              <!-- Nodes dots -->
              <circle cx="140" cy="40" r="5" style="fill: var(--color-success)"/>
              <circle cx="60" cy="100" r="5" style="fill: var(--color-success)"/>
              <circle cx="220" cy="100" r="5" style="fill: var(--color-success)"/>
              <circle cx="60" cy="180" r="5" style="fill: var(--color-success)"/>
              <circle cx="220" cy="180" r="5" style="fill: var(--color-success)"/>
              <circle cx="140" cy="240" r="5" style="fill: var(--color-success)"/>

              <!-- Central Lock/Shield Graphic -->
              <g transform="translate(110, 105)" fill="none" style="stroke: var(--color-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="25" width="50" height="35" rx="6" style="fill: var(--color-surface); stroke: var(--color-success)" stroke-width="3"/>
                <path d="M 18,25 V 15 A 12,12 0 0 1 42,15 V 25" style="stroke: var(--color-success)" stroke-width="3"/>
                <circle cx="30" cy="40" r="3.5" style="fill: var(--color-success)" stroke="none"/>
                <path d="M 30,43.5 V 50" style="stroke: var(--color-success)" stroke-width="2.5"/>
              </g>
            </svg>
          </div>
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

      <section class="cta-band">
        <div class="cta-bg-image-container" aria-hidden="true">
          <img src="/images/cta_blue_bg.png" class="cta-bg-image" alt="">
        </div>
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

        &::after {
          content: '';
          position: absolute;
          top: -35%;
          right: -12%;
          width: 55%;
          height: 140%;
          background: radial-gradient(circle, rgba(240, 140, 0, 0.16) 0%, transparent 68%);
          pointer-events: none;
          z-index: 1;
        }
      }

      .hero-bg-graphic {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.85;

        svg {
          width: 100%;
          height: 100%;
          min-width: 1440px;
        }

        .flow-path-2 {
          animation: flowDash 45s linear infinite;
        }

        .pulse-node-1, .pulse-node-2, .pulse-node-3 {
          animation: pulseGlow 4s ease-in-out infinite alternate;
        }

        .pulse-node-2 {
          animation-delay: 1.3s;
        }

        .pulse-node-3 {
          animation-delay: 2.6s;
        }
      }

      @keyframes flowDash {
        to {
          stroke-dashoffset: -1000;
        }
      }

      @keyframes pulseGlow {
        0% {
          opacity: 0.35;
        }
        100% {
          opacity: 0.95;
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
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 3px;
          background: var(--accent);
          border-radius: 0 0 3px 3px;
          z-index: 2;
        }

        &:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: var(--s-lg, 0 8px 24px rgba(15,23,42,.08));
        }
      }

      .card-bg-graphic {
        position: absolute;
        bottom: -15px;
        right: -15px;
        width: 145px;
        height: 145px;
        pointer-events: none;
        z-index: 0;
        opacity: 0.85;

        svg {
          width: 100%;
          height: 100%;
        }
      }

      .module-card-top,
      .module-purpose,
      .module-perf,
      .module-caps,
      .module-plan {
        position: relative;
        z-index: 1;
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
        background: color-mix(in srgb, var(--accent) 12%, var(--color-surface, #FFFFFF));
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
        position: relative;
        overflow: hidden;
      }

      .problem-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 56px;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .problem-head {
        margin-bottom: 28px;
      }

      .problem-graphic {
        position: absolute;
        top: 50%;
        right: 8%;
        transform: translateY(-50%);
        opacity: 0.12; /* Subtle background blend */
        z-index: 0;
        pointer-events: none;
        display: flex;
        justify-content: center;
      }

      .problem-svg {
        width: 100%;
        max-width: 320px;
        height: auto;
        display: block;
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
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 56px;
        align-items: center;
      }

      .trust-head {
        margin: 0 0 28px;
      }

      .trust-graphic {
        display: flex;
        justify-content: center;
      }

      .trust-svg {
        width: 100%;
        max-width: 240px;
        height: auto;
        display: block;
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
        position: relative;
        overflow: hidden;
      }

      .cta-bg-image-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.16;
        mix-blend-mode: screen;
        mask-image: radial-gradient(circle at 85% 50%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 65%);
        -webkit-mask-image: radial-gradient(circle at 85% 50%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 65%);
      }

      .cta-bg-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cta-inner {
        max-width: 620px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
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

        .problem-graphic {
          position: relative;
          top: auto;
          right: auto;
          transform: none;
          opacity: 0.12;
          margin-top: 24px;
        }

        .trust-panel {
          grid-template-columns: 1fr;
          gap: 32px;
          padding: 32px 24px;
        }

        .trust-graphic {
          order: -1;
          margin-bottom: 12px;
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
