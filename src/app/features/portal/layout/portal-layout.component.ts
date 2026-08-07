import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-portal-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="portal-shell">
      <!-- Background overlays -->
      <div class="portal-grid-overlay"></div>
      <div class="portal-stars"></div>
      <div class="shooting-star-container">
        <div class="shooting-star"></div>
        <div class="shooting-star"></div>
      </div>

      <header class="portal-header">
        <div class="portal-header-inner">
          <a routerLink="/portal/landing" class="portal-logo" title="AppShop ERP - Solución ERP Perú">
            <div class="logo-icon-wrap">
              <svg class="logo-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <span class="logo-text">
              <span class="logo-app">App</span><span class="logo-shop">Shop</span>
            </span>
            <span class="logo-tag">ERP</span>
          </a>

          <nav class="portal-nav">
            <a routerLink="/portal/landing" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}" class="portal-nav-link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Inicio</span>
            </a>
            <a routerLink="/portal/pricing" routerLinkActive="active-link" class="portal-nav-link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <span>Planes</span>
            </a>

            <div class="nav-divider"></div>

            <a routerLink="/auth/login" class="btn-login">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>Ingresar</span>
            </a>
            <a routerLink="/portal/register" class="btn-register">
              <svg class="btn-icon-left" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
              <span>Regístrate gratis</span>
            </a>
          </nav>
        </div>
      </header>
      <main class="portal-main">
        <router-outlet />
      </main>
      <footer class="portal-footer">
        <p>© 2026 AppShop ERP · Solución ERP Premium para Empresas Peruanas · Hecho en Perú 🇵🇪</p>
      </footer>
    </div>
    `,
    styles: [`
      .portal-nav {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 14px !important;
      }

      .portal-nav-link, .btn-login, .btn-register {
        display: inline-flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        white-space: nowrap !important;
      }

      .portal-nav-link svg, .btn-login svg, .btn-register svg {
        display: inline-block !important;
        flex-shrink: 0 !important;
        width: 16px !important;
        height: 16px !important;
        margin: 0 !important;
      }

      .portal-nav-link span, .btn-login span, .btn-register span {
        display: inline-block !important;
        line-height: 1 !important;
        margin: 0 !important;
      }
    `]
})
export class PortalLayoutComponent {}
