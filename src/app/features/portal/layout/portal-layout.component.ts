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
          <a routerLink="/portal/landing" class="portal-logo">
            <span class="logo-app">App</span><span class="logo-shop">Shop</span>
            <span class="logo-tag">ERP</span>
          </a>
          <nav class="portal-nav">
            <a routerLink="/portal/landing" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">Inicio</a>
            <a routerLink="/portal/pricing" routerLinkActive="active-link">Planes</a>
            <a routerLink="/auth/login" class="btn-login">Ingresar</a>
            <a routerLink="/portal/register" class="btn-register">Regístrate gratis</a>
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
    `
})
export class PortalLayoutComponent {}
