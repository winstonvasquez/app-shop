import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

interface ModuleCard {
    code: string;
    name: string;
    description: string;
    color: string;
}

@Component({
    selector: 'app-landing-page',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="landing">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">🇵🇪 Diseñado para el Crecimiento de Empresas Peruanas</div>
          <h1 class="hero-title">
            El ERP todo-en-uno <br>
            <span class="gradient-text">para tu empresa</span>
          </h1>
          <p class="hero-subtitle">
            Gestiona ventas, inventario, compras, contabilidad y más de forma integrada. 
            Cumple con SUNAT y automatiza tu facturación electrónica hoy mismo.
          </p>
          <div class="hero-actions">
            <a routerLink="/portal/register" id="btn-hero-cta" class="cta-primary">
              Empezar gratis
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a routerLink="/portal/pricing" id="btn-hero-plans" class="cta-secondary">Ver planes</a>
          </div>
          
          <div class="hero-stats">
            <div class="stat-card glass-card">
              <span class="stat-num text-gradient-pink">8+</span>
              <span class="stat-label">Módulos listos</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-num text-gradient-teal">100%</span>
              <span class="stat-label">SUNAT Activo</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-num text-gradient-blue">S/ 0</span>
              <span class="stat-label">Costo Setup</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="visual-container animate-float">
            <!-- Rocket & Space SVG Illustration -->
            <svg viewBox="0 0 200 200" class="rocket-svg">
              <defs>
                <linearGradient id="rocketBodyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="50%" stop-color="#a5b4fc" />
                  <stop offset="100%" stop-color="#4f46e5" />
                </linearGradient>
                <linearGradient id="fireGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#f43f5e" />
                  <stop offset="60%" stop-color="#a855f7" />
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
                </linearGradient>
                <radialGradient id="glowBack" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#a855f7" stop-opacity="0" />
                </radialGradient>
              </defs>
              <!-- Back Glow -->
              <circle cx="100" cy="100" r="70" fill="url(#glowBack)" />
              
              <!-- Stars inside visual -->
              <circle cx="30" cy="50" r="1.5" fill="#fff" opacity="0.6" />
              <circle cx="170" cy="80" r="2" fill="#fff" opacity="0.8" />
              <circle cx="150" cy="30" r="1" fill="#fff" opacity="0.4" />
              <circle cx="60" cy="150" r="1.5" fill="#fff" opacity="0.5" />
              
              <!-- Fire Trail -->
              <path d="M 65,135 Q 85,115 75,95 Q 90,85 110,115 Q 95,140 65,135 Z" fill="url(#fireGradient)" />
              
              <!-- Rocket Body (rotated to fly up-right) -->
              <g transform="rotate(45, 100, 100)">
                <!-- Fins -->
                <path d="M 85,125 L 68,145 L 85,138 Z" fill="#818cf8" />
                <path d="M 115,125 L 132,145 L 115,138 Z" fill="#818cf8" />
                <!-- Main Core -->
                <path d="M 85,80 C 85,50 100,28 100,28 C 100,28 115,50 115,80 L 115,130 L 85,130 Z" fill="url(#rocketBodyGradient)" />
                <!-- Window -->
                <circle cx="100" cy="72" r="8" fill="#0f172a" stroke="#818cf8" stroke-width="1.5" />
                <circle cx="100" cy="72" r="4" fill="#38bdf8" />
                <!-- Body Stripes -->
                <path d="M 85,96 L 115,96" stroke="#ffffff" stroke-width="2.5" opacity="0.4" />
                <path d="M 85,108 L 115,108" stroke="#ffffff" stroke-width="2.5" opacity="0.4" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- Modules Section -->
      <section class="modules-section">
        <h2 class="section-title">Todo lo que necesita tu empresa</h2>
        <p class="section-subtitle">8 módulos especializados, 100% integrados y automatizados</p>
        
        <div class="modules-grid">
          @for (mod of modules; track mod.code) {
            <div class="module-card glass-card" [style]="'--accent:' + mod.color" [id]="'module-' + mod.code">
              <div class="module-icon-container">
                @switch (mod.code) {
                  @case ('POS') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                      <path d="M12 7h.01"/>
                      <path d="M9 10h6"/>
                    </svg>
                  }
                  @case ('VENTAS') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                      <path d="M3 18l6-6 4 4 8-8"/>
                    </svg>
                  }
                  @case ('COMPRAS') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                  }
                  @case ('INVENTARIO') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l-7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  }
                  @case ('CONTABILIDAD') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      <line x1="8" y1="6" x2="16" y2="6"/>
                      <line x1="8" y1="10" x2="16" y2="10"/>
                    </svg>
                  }
                  @case ('LOGISTICA') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  }
                  @case ('TESORERIA') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <line x1="3" y1="21" x2="21" y2="21"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                      <polygon points="12 2 2 7 22 7"/>
                      <line x1="5" y1="10" x2="5" y2="21"/>
                      <line x1="19" y1="10" x2="19" y2="21"/>
                    </svg>
                  }
                  @case ('RRHH') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-svg">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  }
                }
              </div>
              <h3>{{ mod.name }}</h3>
              <p>{{ mod.description }}</p>
            </div>
          }
        </div>
      </section>

      <!-- CTA Banner Section -->
      <section class="cta-banner-section glass-card">
        <div class="cta-glow"></div>
        <h2>¿Listo para digitalizar tu negocio hoy?</h2>
        <p>Comienza tu prueba gratuita de 30 días sin compromisos. No se requiere tarjeta de crédito.</p>
        <a routerLink="/portal/register" id="btn-banner-cta" class="cta-primary animate-pulse-glow">
          Registrar Empresa Gratis
        </a>
      </section>
    </div>
    `,
    styles: [`
      .landing {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 24px;
        position: relative;
        z-index: 10;
      }

      /* Hero Section */
      .hero-section {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 40px;
        padding: 80px 0 100px;
        align-items: center;
      }

      .hero-content {
        text-align: left;
      }

      .hero-badge {
        display: inline-block;
        background: rgba(168, 85, 247, 0.12);
        color: #d8b4fe;
        border: 1px solid rgba(168, 85, 247, 0.3);
        border-radius: 30px;
        padding: 6px 16px;
        font-size: 0.825rem;
        font-weight: 600;
        margin-bottom: 24px;
        letter-spacing: 0.25px;
        box-shadow: 0 0 15px rgba(168, 85, 247, 0.1);
      }

      .hero-title {
        font-size: clamp(2.25rem, 6vw, 3.75rem);
        font-weight: 900;
        line-height: 1.1;
        color: #ffffff;
        margin: 0 0 24px;
        letter-spacing: -1.5px;
      }

      .gradient-text {
        background: linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 900;
      }

      .hero-subtitle {
        font-size: 1.15rem;
        color: var(--portal-muted);
        max-width: 580px;
        margin: 0 0 40px;
        line-height: 1.6;
      }

      .hero-actions {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 56px;
      }

      .cta-primary {
        background: linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-blue) 100%);
        color: #ffffff;
        padding: 14px 28px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 700;
        font-size: 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 15px rgba(168, 85, 247, 0.25);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.25s ease;

        svg {
          transition: transform 0.2s ease;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.45);
          filter: brightness(1.1);

          svg {
            transform: translateX(4px);
          }
        }
      }

      .cta-secondary {
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
        padding: 14px 28px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.25s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }
      }

      .hero-stats {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }

      .stat-card {
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        min-width: 140px;
        align-items: flex-start;
      }

      .stat-num {
        font-size: 2rem;
        font-weight: 900;
        line-height: 1.1;
      }

      .text-gradient-pink {
        background: linear-gradient(135deg, #f43f5e, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .text-gradient-teal {
        background: linear-gradient(135deg, #06b6d4, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .text-gradient-blue {
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .stat-label {
        font-size: 0.775rem;
        color: var(--portal-muted);
        margin-top: 4px;
        font-weight: 500;
      }

      /* Hero Visual Rocket */
      .hero-visual {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .visual-container {
        width: 100%;
        max-width: 320px;
      }

      .rocket-svg {
        width: 100%;
        height: auto;
      }

      /* Modules Section */
      .modules-section {
        padding: 80px 0;
      }

      .section-title {
        font-size: 2.25rem;
        font-weight: 800;
        color: #ffffff;
        text-align: center;
        margin: 0 0 12px;
        letter-spacing: -0.75px;
      }

      .section-subtitle {
        text-align: center;
        color: var(--portal-muted);
        margin-bottom: 56px;
        font-size: 1.05rem;
      }

      .modules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 24px;
      }

      .module-card {
        padding: 32px 24px;
        border-top: 3px solid var(--accent);
        cursor: pointer;

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 15px color-mix(in srgb, var(--accent) 20%, transparent);
          border-color: var(--accent);

          .icon-svg {
            transform: scale(1.1) rotate(5deg);
            filter: drop-shadow(0 0 12px var(--accent));
          }
        }
      }

      .module-icon-container {
        margin-bottom: 20px;
      }

      .icon-svg {
        width: 42px;
        height: 42px;
        stroke: var(--accent);
        fill: color-mix(in srgb, var(--accent) 12%, transparent);
        filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 30%, transparent));
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .module-card h3 {
        font-size: 1.15rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 12px;
      }

      .module-card p {
        font-size: 0.875rem;
        color: var(--portal-muted);
        margin: 0;
        line-height: 1.6;
      }

      /* CTA Banner Section */
      .cta-banner-section {
        padding: 60px 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
        margin: 40px 0 80px;

        .cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          height: 150px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        h2 {
          font-size: 2.25rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 16px;
          position: relative;
          z-index: 5;
        }

        p {
          color: var(--portal-muted);
          margin-bottom: 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 5;
        }

        .cta-primary {
          position: relative;
          z-index: 5;
        }
      }

      /* Responsiveness */
      @media (max-width: 768px) {
        .hero-section {
          grid-template-columns: 1fr;
          padding: 40px 0 60px;
          text-align: center;
        }

        .hero-content {
          text-align: center;
        }

        .hero-subtitle {
          margin-left: auto;
          margin-right: auto;
        }

        .hero-actions {
          justify-content: center;
        }

        .hero-stats {
          justify-content: center;
        }

        .hero-visual {
          order: -1;
          margin-bottom: 20px;
        }

        .visual-container {
          max-width: 220px;
        }
      }
    `]
})
export class LandingPageComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);

    readonly modules: ModuleCard[] = [
        { code: 'POS', name: 'Punto de Venta', description: 'POS táctil rápido con múltiples medios de pago, boletas y facturas electrónicas.', color: '#f43f5e' },
        { code: 'VENTAS', name: 'Ventas', description: 'Pedidos, cotizaciones, comprobantes electrónicos SUNAT. Integración con e-commerce.', color: '#fb8c00' },
        { code: 'COMPRAS', name: 'Compras', description: 'Gestión de proveedores, órdenes de compra y recepción de mercadería con validación SUNAT.', color: '#10b981' },
        { code: 'INVENTARIO', name: 'Inventario', description: 'Control de almacenes, kardex valorizado, stock mínimo/máximo y múltiples almacenes.', color: '#3b82f6' },
        { code: 'CONTABILIDAD', name: 'Contabilidad', description: 'Plan contable general empresarial, libro diario, mayor y generación de libros electrónicos PLE.', color: '#a855f7' },
        { code: 'LOGISTICA', name: 'Logística', description: 'Guías de remisión electrónicas, tracking de despacho, y gestión de transportistas.', color: '#06b6d4' },
        { code: 'TESORERIA', name: 'Tesorería', description: 'Control de cajas y cuentas bancarias, flujo de caja real, conciliaciones y egresos.', color: '#f59e0b' },
        { code: 'RRHH', name: 'RRHH', description: 'Gestión de planillas, cálculo automático de beneficios de ley CTS, gratificación y contratos.', color: '#ec4899' },
    ];

    ngOnInit(): void {
        this.titleService.setTitle('AppShop ERP - El ERP Todo-en-Uno para Empresas Peruanas');
        this.metaService.updateTag({ name: 'description', content: 'Gestiona ventas, inventario, compras, contabilidad y facturación electrónica SUNAT con AppShop ERP. Diseñado especialmente para pymes y empresas en Perú. Empieza gratis.' });
        
        // OpenGraph tags for SEO
        this.metaService.updateTag({ property: 'og:title', content: 'AppShop ERP - El ERP Todo-en-Uno para Empresas Peruanas' });
        this.metaService.updateTag({ property: 'og:description', content: 'Gestiona ventas, inventario, compras, contabilidad y facturación electrónica SUNAT de forma unificada.' });
        this.metaService.updateTag({ property: 'og:type', content: 'website' });
    }
}

