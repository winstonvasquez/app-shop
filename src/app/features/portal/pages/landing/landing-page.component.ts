import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ModuleCard {
    code: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

@Component({
    selector: 'app-landing-page',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="landing">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-badge">🇵🇪 Hecho para empresas peruanas</div>
        <h1 class="hero-title">
          El ERP todo-en-uno<br>para tu empresa
        </h1>
        <p class="hero-subtitle">
          Gestiona ventas, inventario, compras, contabilidad y más.
          Cumple con SUNAT, PCGE 2020 y facturación electrónica desde el primer día.
        </p>
        <div class="hero-actions">
          <a routerLink="/portal/register" class="cta-primary">Empezar gratis — 30 días de prueba</a>
          <a routerLink="/portal/pricing" class="cta-secondary">Ver planes</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-num">8</span><span class="stat-label">Módulos integrados</span></div>
          <div class="stat"><span class="stat-num">100%</span><span class="stat-label">Cumplimiento SUNAT</span></div>
          <div class="stat"><span class="stat-num">S/0</span><span class="stat-label">Instalación</span></div>
        </div>
      </section>

      <!-- Modules -->
      <section class="modules-section">
        <h2 class="section-title">Todo lo que necesita tu empresa</h2>
        <p class="section-subtitle">8 módulos especializados, todos integrados entre sí</p>
        <div class="modules-grid">
          @for (mod of modules; track mod.code) {
            <div class="module-card" [style]="'--accent:' + mod.color">
              <div class="module-icon">{{ mod.icon }}</div>
              <h3>{{ mod.name }}</h3>
              <p>{{ mod.description }}</p>
            </div>
          }
        </div>
      </section>

      <!-- CTA Banner -->
      <section class="cta-banner">
        <h2>¿Listo para digitalizar tu empresa?</h2>
        <p>Comienza tu prueba gratuita de 30 días. Sin tarjeta de crédito.</p>
        <a routerLink="/portal/register" class="cta-primary">Crear cuenta gratuita</a>
      </section>
    </div>
    `,
    styles: [`
      .landing { background: var(--color-background); }

      /* Hero */
      .hero { max-width: 800px; margin: 0 auto; padding: 80px 24px 60px; text-align: center; }
      .hero-badge { display: inline-block; background: color-mix(in oklch, var(--color-primary) 12%, transparent); color: var(--color-primary); border: 1px solid color-mix(in oklch, var(--color-primary) 30%, transparent); border-radius: 20px; padding: 4px 14px; font-size: 0.8rem; font-weight: 600; margin-bottom: 24px; }
      .hero-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; color: #fff; margin: 0 0 20px; letter-spacing: -1px; }
      .hero-subtitle { font-size: 1.1rem; color: var(--color-subtle); max-width: 560px; margin: 0 auto 36px; line-height: 1.6; }
      .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }
      .cta-primary { background: var(--color-primary); color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.95rem; transition: opacity 0.15s; }
      .cta-primary:hover { opacity: 0.88; }
      .cta-secondary { background: oklch(1 0 0 / 0.06); color: #fff; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; border: 1px solid var(--color-border); transition: background 0.15s; }
      .cta-secondary:hover { background: oklch(1 0 0 / 0.1); }
      .hero-stats { display: flex; gap: 40px; justify-content: center; }
      .stat { display: flex; flex-direction: column; align-items: center; }
      .stat-num { font-size: 2rem; font-weight: 900; color: var(--color-primary); }
      .stat-label { font-size: 0.75rem; color: var(--color-subtle); }

      /* Modules */
      .modules-section { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
      .section-title { font-size: 2rem; font-weight: 800; color: #fff; text-align: center; margin: 0 0 8px; }
      .section-subtitle { text-align: center; color: var(--color-subtle); margin-bottom: 40px; }
      .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
      .module-card { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 12px; padding: 24px; transition: border-color 0.2s, transform 0.2s; border-top: 3px solid var(--accent); }
      .module-card:hover { border-color: var(--accent); transform: translateY(-2px); }
      .module-icon { font-size: 2rem; margin-bottom: 12px; }
      .module-card h3 { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 8px; }
      .module-card p { font-size: 0.8rem; color: var(--color-subtle); margin: 0; line-height: 1.5; }

      /* CTA Banner */
      .cta-banner { background: linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 15%, transparent), color-mix(in oklch, var(--color-primary) 5%, transparent)); border-top: 1px solid color-mix(in oklch, var(--color-primary) 20%, transparent); border-bottom: 1px solid color-mix(in oklch, var(--color-primary) 20%, transparent); padding: 60px 24px; text-align: center; }
      .cta-banner h2 { font-size: 2rem; font-weight: 800; color: #fff; margin: 0 0 12px; }
      .cta-banner p { color: var(--color-subtle); margin-bottom: 28px; }
    `]
})
export class LandingPageComponent {
    readonly modules: ModuleCard[] = [
        { code: 'POS', name: 'Punto de Venta', description: 'POS táctil con soporte para múltiples medios de pago, boletas y facturas electrónicas.', icon: '🛒', color: '#d7132a' },
        { code: 'VENTAS', name: 'Ventas', description: 'Pedidos, cotizaciones, comprobantes electrónicos SUNAT. Integración con e-commerce.', icon: '📊', color: '#fb8c00' },
        { code: 'COMPRAS', name: 'Compras', description: 'Gestión de proveedores, órdenes de compra y recepción de mercadería con validación SUNAT.', icon: '📦', color: 'var(--color-success)' },
        { code: 'INVENTARIO', name: 'Inventario', description: 'Control de almacenes, kardex, stock mínimo y máximo. Múltiples ubicaciones.', icon: '🏭', color: '#3b82f6' },
        { code: 'CONTABILIDAD', name: 'Contabilidad', description: 'PCGE 2020, libro diario y mayor. PLE para SUNAT, PDT 621, declaraciones automáticas.', icon: '📒', color: '#8b5cf6' },
        { code: 'LOGISTICA', name: 'Logística', description: 'Guías de remisión electrónicas, tracking de envíos, gestión de despacho y devoluciones.', icon: '🚚', color: '#06b6d4' },
        { code: 'TESORERIA', name: 'Tesorería', description: 'Control de cajas, flujo de caja, conciliación bancaria y gestión de pagos.', icon: '🏦', color: '#f59e0b' },
        { code: 'RRHH', name: 'RRHH', description: 'Planillas, asistencia, vacaciones y contratos. Cálculo automático de beneficios sociales.', icon: '👥', color: '#ec4899' },
    ];
}
