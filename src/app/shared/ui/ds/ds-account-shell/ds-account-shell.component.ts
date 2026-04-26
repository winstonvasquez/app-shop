import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

interface AccountNavItem {
    path: string;
    icon: string;
    label: string;
}

/**
 * Account Shell — DS Confianza.
 * Layout estándar para todas las páginas de "Mi Cuenta":
 * breadcrumb · sidebar de navegación lateral · área de contenido.
 *
 * Uso:
 * ```html
 * <ds-account-shell title="Mis pedidos" subtitle="Historial y seguimiento">
 *   <!-- contenido de la página -->
 * </ds-account-shell>
 * ```
 */
@Component({
    selector: 'ds-account-shell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive, LucideAngularModule],
    template: `
        <div class="ds-account">

            <!-- Breadcrumb -->
            <div class="bc-wrap">
                <div class="bc">
                    <lucide-icon name="home" [size]="14"/>
                    <a class="bc-link" routerLink="/home">Inicio</a>
                    <lucide-icon name="chevron-right" [size]="11"/>
                    <a class="bc-link" routerLink="/account">Mi Cuenta</a>
                    @if (title()) {
                        <lucide-icon name="chevron-right" [size]="11"/>
                        <span class="bc-current">{{ title() }}</span>
                    }
                </div>
            </div>

            <div class="cols">

                <!-- ── Sidebar ── -->
                <aside class="sidebar">
                    <header class="side-head">
                        <span class="avatar"><lucide-icon name="user" [size]="20"/></span>
                        <div>
                            <div class="hello">Hola,</div>
                            <strong>{{ userName() || 'Usuario' }}</strong>
                        </div>
                    </header>

                    <nav class="nav">
                        @for (item of navItems; track item.path) {
                            <a class="nav-link"
                                [routerLink]="['/account', item.path]"
                                routerLinkActive="is-active">
                                <lucide-icon [name]="item.icon" [size]="16"/>
                                <span>{{ item.label }}</span>
                            </a>
                        }
                    </nav>
                </aside>

                <!-- ── Main content ── -->
                <main class="main">
                    <header class="main-head">
                        <h1>{{ title() }}</h1>
                        @if (subtitle()) {
                            <p>{{ subtitle() }}</p>
                        }
                    </header>

                    <div class="content">
                        <ng-content/>
                    </div>
                </main>

            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .ds-account {
            background: var(--c-bg);
            font-family: var(--f-sans);
            color: var(--c-text);
            min-height: 100%;
        }

        /* Breadcrumb */
        .bc-wrap { max-width: 1280px; margin: 0 auto; padding: 16px 24px 8px; }
        .bc {
            display: flex; align-items: center; gap: 6px;
            font-size: 13px; color: var(--c-muted);
            flex-wrap: wrap;
        }
        .bc-link { color: inherit; text-decoration: none; cursor: pointer; }
        .bc-link:hover { color: var(--c-brand); }
        .bc-current { color: var(--c-text); font-weight: 600; }

        /* Layout 2-col */
        .cols {
            max-width: 1280px; margin: 0 auto;
            padding: 8px 24px 40px;
            display: grid; grid-template-columns: 260px 1fr; gap: 24px;
        }

        /* Sidebar */
        .sidebar {
            display: flex; flex-direction: column; gap: 12px;
            position: sticky; top: 16px; align-self: flex-start;
        }
        .side-head {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            padding: 16px;
            display: flex; align-items: center; gap: 12px;
        }
        .avatar {
            width: 40px; height: 40px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--c-brand) 12%, var(--c-surface));
            color: var(--c-brand);
            display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .hello { font-size: 12px; color: var(--c-muted); }
        .side-head strong { font-size: 14px; color: var(--c-text); }

        .nav {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            padding: 8px;
            display: flex; flex-direction: column; gap: 2px;
        }
        .nav-link {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px;
            border-radius: var(--r-sm);
            color: var(--c-text);
            font-size: 13px; font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: background 120ms, color 120ms;
        }
        .nav-link:hover { background: var(--c-surface2); color: var(--c-brand); }
        .nav-link.is-active {
            background: color-mix(in srgb, var(--c-brand) 10%, transparent);
            color: var(--c-brand); font-weight: 700;
        }
        .nav-link lucide-icon { color: inherit; }

        /* Main */
        .main {
            min-width: 0;
            display: flex; flex-direction: column; gap: 16px;
        }
        .main-head {
            display: flex; flex-direction: column; gap: 6px;
            margin-bottom: 8px;
        }
        .main-head h1 {
            font-family: var(--f-display);
            font-size: 28px; font-weight: 800;
            margin: 0; color: var(--c-text);
            letter-spacing: -0.02em;
        }
        .main-head p { font-size: 13px; color: var(--c-muted); margin: 0; }
        .content { display: flex; flex-direction: column; gap: 16px; }

        /* Responsive */
        @media (max-width: 1024px) {
            .cols { grid-template-columns: 1fr; }
            .sidebar { position: static; }
            .nav { flex-direction: row; overflow-x: auto; }
            .nav-link { white-space: nowrap; flex-shrink: 0; }
        }
        @media (max-width: 640px) {
            .cols { padding: 8px 16px 24px; }
            .bc-wrap { padding: 12px 16px 8px; }
            .main-head h1 { font-size: 22px; }
            .side-head { display: none; }
        }
    `],
})
export class DsAccountShellComponent {
    title    = input<string>('Mi Cuenta');
    subtitle = input<string>('');
    userName = input<string>('');

    readonly navItems: AccountNavItem[] = [
        { path: 'orders',          icon: 'package',         label: 'Mis pedidos' },
        { path: 'profile',         icon: 'user',            label: 'Mi perfil' },
        { path: 'addresses',       icon: 'map-pin',         label: 'Direcciones' },
        { path: 'security',        icon: 'lock',            label: 'Seguridad' },
        { path: 'wishlist',        icon: 'heart',           label: 'Favoritos' },
        { path: 'coupons',         icon: 'ticket',          label: 'Cupones' },
        { path: 'credit',          icon: 'wallet',          label: 'Saldo y crédito' },
        { path: 'followed-stores', icon: 'shopping-bag',    label: 'Tiendas seguidas' },
        { path: 'reviews',         icon: 'star',            label: 'Mis reseñas' },
        { path: 'history',         icon: 'clock',           label: 'Historial' },
        { path: 'notifications',   icon: 'bell',            label: 'Notificaciones' },
        { path: 'permissions',     icon: 'shield',          label: 'Permisos y privacidad' },
    ];
}
