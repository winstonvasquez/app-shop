import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
    selector: 'app-portal-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink],
    template: `
    <div class="portal-shell">
      <header class="portal-header">
        <div class="portal-header-inner">
          <a routerLink="/portal/landing" class="portal-logo">
            <span class="logo-app">APP</span><span class="logo-shop">SHOP</span>
            <span class="logo-tag">ERP</span>
          </a>
          <nav class="portal-nav">
            <a routerLink="/portal/landing">Inicio</a>
            <a routerLink="/portal/pricing">Planes</a>
            <a routerLink="/auth/login" class="btn-login">Ingresar</a>
            <a routerLink="/portal/register" class="btn-register">Regístrate gratis</a>
          </nav>
        </div>
      </header>
      <main class="portal-main">
        <router-outlet />
      </main>
      <footer class="portal-footer">
        <p>© 2026 AppShop ERP · Hecho en Perú 🇵🇪</p>
      </footer>
    </div>
    `,
    styles: [`
      .portal-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--color-background); color: var(--color-on-surface); }
      .portal-header { position: sticky; top: 0; z-index: 100; background: rgba(15,15,15,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border); }
      .portal-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
      .portal-logo { display: flex; align-items: center; gap: 4px; text-decoration: none; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }
      .logo-app { color: var(--color-primary); }
      .logo-shop { color: var(--color-on-surface); }
      .logo-tag { font-size: 0.65rem; font-weight: 600; color: var(--color-subtle); border: 1px solid var(--color-border); border-radius: 4px; padding: 1px 5px; margin-left: 6px; }
      .portal-nav { display: flex; align-items: center; gap: 24px; }
      .portal-nav a { text-decoration: none; color: var(--color-subtle); font-size: 0.9rem; transition: color 0.15s; }
      .portal-nav a:hover { color: var(--color-on-surface); }
      .btn-login { color: var(--color-subtle) !important; }
      .btn-register { background: var(--color-primary) !important; color: #fff !important; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.85rem !important; }
      .btn-register:hover { opacity: 0.9; }
      .portal-main { flex: 1; }
      .portal-footer { text-align: center; padding: 24px; color: var(--color-subtle); font-size: 0.8rem; border-top: 1px solid var(--color-border); }
    `]
})
export class PortalLayoutComponent {}
