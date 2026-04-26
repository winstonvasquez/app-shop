import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
    DsTopBarComponent, DsShopHeaderComponent, DsShopFooterComponent,
    DsBadgeComponent, DsProductCardComponent, DsCategoryTileComponent,
    DsButtonComponent,
    DsProduct, DsCategoryTile,
} from '@shared/ui/ds';

/**
 * Design System v2 — showcase/demo page.
 * Replica ScreenHome (screens-storefront-1.jsx) 1:1 como prueba visual
 * del sistema de diseño "Confianza". Ruta: /design-system.
 *
 * Estructura:
 *   TopBar → ShopHeader (con CategoryNav) → Hero → Trust strip →
 *   Categorías → Flash deals → Recomendado → Footer
 */
@Component({
    selector: 'app-design-system-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        LucideAngularModule,
        DsTopBarComponent, DsShopHeaderComponent, DsShopFooterComponent,
        DsBadgeComponent, DsProductCardComponent, DsCategoryTileComponent,
        DsButtonComponent,
    ],
    template: `
        <div class="page">
            <ds-top-bar/>
            <ds-shop-header [cartCount]="3"/>

            <!-- Hero -->
            <div class="hero-wrap">
                <div class="hero">
                    <ds-badge tone="accent" class="hero-chip">Solo hoy · 24h</ds-badge>
                    <h1>
                        Hot Sale<br/><span class="accent">hasta 70% OFF</span>
                    </h1>
                    <p>Tecnología, hogar y moda con descuentos que no se repiten.
                        Envío gratis en compras desde S/ 99.</p>
                    <div class="hero-cta">
                        <ds-button variant="accent" size="lg" iconRight="arrow-right">Ver ofertas</ds-button>
                        <ds-button variant="ghost" size="lg" class="ghost-light">Categorías</ds-button>
                    </div>
                    <div class="dots">
                        <span class="dot active"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
                <div class="side">
                    <div class="promo">
                        <div>
                            <ds-badge tone="success">Nuevo</ds-badge>
                            <h3>Vuelta al cole</h3>
                            <p>Útiles, mochilas y tech para estudiar</p>
                        </div>
                        <a class="link">Comprar →</a>
                    </div>
                    <div class="promo promo-alt">
                        <div>
                            <ds-badge tone="brand">App exclusivo</ds-badge>
                            <h3>S/ 30 OFF</h3>
                            <p>En tu primera compra desde la app</p>
                        </div>
                        <a class="link">Descargar →</a>
                    </div>
                </div>
            </div>

            <!-- Trust strip -->
            <div class="trust-wrap">
                <div class="trust">
                    @for (t of trust; track t.title) {
                        <div class="tr">
                            <div class="tr-ic">
                                <lucide-icon [name]="t.icon" [size]="22"/>
                            </div>
                            <div>
                                <div class="tr-t">{{ t.title }}</div>
                                <div class="tr-s">{{ t.sub }}</div>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Categories -->
            <div class="section">
                <header class="sec-hd">
                    <h2>Compra por categoría</h2>
                    <a class="link">Ver todas →</a>
                </header>
                <div class="cats">
                    @for (c of categories; track c.name) {
                        <ds-category-tile [c]="c"/>
                    }
                </div>
            </div>

            <!-- Flash deals -->
            <div class="section flash-wrap">
                <div class="flash-card">
                    <div class="flash-hd">
                        <div class="flash-hd-l">
                            <lucide-icon name="zap" [size]="22"/>
                            <span class="flash-title">OFERTAS RELÁMPAGO</span>
                            <span class="flash-sm">Termina en</span>
                            <div class="timer">
                                <span>05</span><span>:</span>
                                <span>42</span><span>:</span>
                                <span>17</span>
                            </div>
                        </div>
                        <a class="link link-fg">Ver todas →</a>
                    </div>
                    <div class="grid-6">
                        @for (p of flashDeals; track p.id) {
                            <ds-product-card [p]="p"/>
                        }
                    </div>
                </div>
            </div>

            <!-- Recommended -->
            <div class="section">
                <header class="sec-hd">
                    <h2>Recomendado para ti</h2>
                    <a class="link">Ver más →</a>
                </header>
                <div class="grid-6">
                    @for (p of recommended; track p.id) {
                        <ds-product-card [p]="p"/>
                    }
                </div>
            </div>

            <ds-shop-footer/>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .page {
            background: var(--c-bg);
            min-height: 100vh;
            font-family: var(--f-sans);
            color: var(--c-text);
        }

        /* Hero */
        .hero-wrap {
            max-width: 1280px; margin: 0 auto;
            padding: 20px 24px;
            display: grid; grid-template-columns: 1fr 320px; gap: 16px;
        }
        .hero {
            position: relative; border-radius: var(--r-xl); overflow: hidden;
            background: linear-gradient(110deg, var(--c-brand) 0%, var(--c-brandHi) 60%, var(--c-accent2) 100%);
            padding: 40px 48px; color: var(--c-onBrand, #fff);
            min-height: 280px; display: flex; flex-direction: column; justify-content: center;
        }
        .hero-chip { align-self: flex-start; margin-bottom: 12px; }
        .hero h1 {
            font-family: var(--f-display); font-size: 48px; font-weight: 800;
            margin: 0; letter-spacing: -0.03em; line-height: 1; color: #fff;
        }
        .hero .accent { color: var(--c-accent); }
        .hero p { font-size: 16px; margin: 12px 0 24px; max-width: 460px; color: rgba(255,255,255,.92); }
        .hero-cta { display: flex; gap: 12px; }
        .hero-cta .ghost-light ::ng-deep button { color: #fff; border-color: rgba(255,255,255,.3); }
        .dots { position: absolute; right: 32px; top: 32px; display: flex; gap: 8px; }
        .dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,.4); }
        .dot.active { background: #fff; }

        .side { display: grid; grid-template-rows: 1fr 1fr; gap: 16px; }
        .promo {
            background: var(--c-surface); border: 1px solid var(--c-border);
            border-radius: var(--r-lg); padding: 20px;
            display: flex; flex-direction: column; justify-content: space-between;
        }
        .promo-alt { background: var(--c-surface2); }
        .promo h3 { font-size: 18px; font-weight: 700; margin: 8px 0 4px; color: var(--c-text); }
        .promo p { font-size: 13px; margin: 0; color: var(--c-muted); }
        .link { color: var(--c-brand); font-size: 13px; font-weight: 700; cursor: pointer; }
        .link-fg { color: var(--c-onBrand, #fff); }

        /* Trust strip */
        .trust-wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px 16px; }
        .trust {
            background: var(--c-surface); border: 1px solid var(--c-border);
            border-radius: var(--r-lg); padding: 16px 24px;
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        .tr { display: flex; gap: 12px; align-items: center; }
        .tr-ic {
            width: 40px; height: 40px;
            background: var(--c-surface2); color: var(--c-brand);
            border-radius: var(--r-md);
            display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .tr-t { font-size: 14px; font-weight: 700; color: var(--c-text); }
        .tr-s { font-size: 12px; color: var(--c-muted); }

        /* Sections */
        .section { max-width: 1280px; margin: 0 auto; padding: 24px; }
        .sec-hd {
            display: flex; align-items: baseline; justify-content: space-between;
            margin-bottom: 16px;
        }
        .sec-hd h2 {
            font-family: var(--f-display); font-size: 24px; font-weight: 800;
            color: var(--c-text); margin: 0; letter-spacing: -0.02em;
        }
        .cats { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px; }
        .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }

        /* Flash */
        .flash-wrap { padding-top: 8px; padding-bottom: 8px; }
        .flash-card {
            background: var(--c-surface); border: 2px solid var(--c-brand);
            border-radius: var(--r-xl); overflow: hidden;
        }
        .flash-hd {
            background: var(--c-brand); color: var(--c-onBrand, #fff);
            padding: 12px 20px;
            display: flex; align-items: center; justify-content: space-between;
        }
        .flash-hd-l { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .flash-title { font-family: var(--f-display); font-size: 22px; font-weight: 800; }
        .flash-sm { font-size: 13px; opacity: .9; }
        .timer { display: inline-flex; gap: 4px; align-items: center; }
        .timer > span:nth-child(2n+1) {
            background: rgba(0,0,0,.3); padding: 2px 6px;
            border-radius: 4px; font-weight: 800; font-size: 14px;
        }
        .flash-card .grid-6 { padding: 16px; }

        /* Responsive */
        @media (max-width: 1200px) {
            .cats { grid-template-columns: repeat(4, 1fr); }
            .grid-6 { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 900px) {
            .hero-wrap { grid-template-columns: 1fr; }
            .trust { grid-template-columns: repeat(2, 1fr); }
            .hero h1 { font-size: 36px; }
        }
        @media (max-width: 600px) {
            .cats { grid-template-columns: repeat(2, 1fr); }
            .grid-6 { grid-template-columns: repeat(2, 1fr); }
            .trust { grid-template-columns: 1fr; }
        }
    `],
})
export class DesignSystemPageComponent {
    protected readonly trust = [
        { icon: 'truck',   title: 'Envío gratis',     sub: 'Desde S/ 99' },
        { icon: 'shield',  title: 'Compra protegida', sub: 'Garantía 30 días' },
        { icon: 'zap',     title: 'Entrega rápida',   sub: '24h en Lima' },
        { icon: 'lock',    title: 'Pago seguro',      sub: 'PCI DSS · Yape' },
    ];

    protected readonly categories: DsCategoryTile[] = [
        { name: 'Tecnología',   tone: 2, count: 4823 },
        { name: 'Hogar',        tone: 5, count: 12390 },
        { name: 'Moda',         tone: 0, count: 8721 },
        { name: 'Belleza',      tone: 3, count: 3211 },
        { name: 'Deportes',     tone: 1, count: 2087 },
        { name: 'Niños',        tone: 7, count: 1543 },
        { name: 'Supermercado', tone: 6, count: 5621 },
        { name: 'Salud',        tone: 4, count: 1109 },
    ];

    private readonly catalog: DsProduct[] = [
        { id: 1, name: 'Laptop Lenovo IdeaPad Slim 5 14"',    cat: 'Tecnología', tone: 2, now: 2299, was: 2899, rating: 4.7, reviews: 1284, sold: '2.3K vendidos', stock: 8,  badge: 'OFERTA',   tag: 'Más vendido',  shipFree: true,  fast: true,  flash: 18 },
        { id: 2, name: 'Audífonos Sony WH-1000XM5',            cat: 'Tecnología', tone: 0, now: 1199, was: 1499, rating: 4.9, reviews: 3421, sold: '8K+ vendidos',  stock: 24, badge: '-20%',     tag: 'Top elección', shipFree: true,  fast: true },
        { id: 3, name: 'Cafetera espresso automática',         cat: 'Hogar',      tone: 6, now: 549,  was: 799,  rating: 4.6, reviews: 892,  sold: '1.4K vendidos', stock: 15, badge: 'NUEVO',                        shipFree: true },
        { id: 4, name: 'Zapatillas Nike Air Zoom Pegasus',     cat: 'Deportes',   tone: 1, now: 379,  was: 459,  rating: 4.8, reviews: 2103, sold: '5K+ vendidos',  stock: 32, badge: '-17%',                         shipFree: true,  fast: true },
        { id: 5, name: 'Smartwatch Garmin Forerunner 265',     cat: 'Tecnología', tone: 2, now: 1799, was: 2099, rating: 4.7, reviews: 567,  sold: '780 vendidos',   stock: 6,  badge: 'POCAS',    tag: 'Popular',      shipFree: true },
        { id: 6, name: 'Set 4 sartenes antiadherentes',        cat: 'Hogar',      tone: 5, now: 189,  was: 269,  rating: 4.5, reviews: 1542, sold: '3.1K vendidos', stock: 48, badge: '-30%',                         shipFree: false },
        { id: 7, name: 'Crema hidratante CeraVe 473ml',        cat: 'Belleza',    tone: 3, now: 89,   was: 109,  rating: 4.9, reviews: 4280, sold: '12K+ vendidos',  stock: 100,                    tag: 'Bestseller',   shipFree: true,  fast: true },
        { id: 8, name: 'Bicicleta MTB aluminio rod. 29',       cat: 'Deportes',   tone: 4, now: 1349, was: 1699, rating: 4.6, reviews: 234,  sold: '420 vendidos',   stock: 4,  badge: 'POCAS',                        shipFree: false },
        { id: 9, name: 'Mochila escolar Totto Tula',           cat: 'Niños',      tone: 7, now: 159,  was: 199,  rating: 4.7, reviews: 891,  sold: '2.8K vendidos', stock: 60, badge: 'VUELTA AL COLE',               shipFree: true },
        { id: 10, name: 'Smart TV Samsung 55" 4K Crystal',     cat: 'Tecnología', tone: 2, now: 1899, was: 2499, rating: 4.8, reviews: 1876, sold: '4.2K vendidos', stock: 12, badge: '-24%',     tag: 'Más vendido',  shipFree: true,  fast: true,  flash: 6 },
        { id: 11, name: 'Lentes de sol Ray-Ban Aviator',       cat: 'Moda',       tone: 0, now: 489,  was: 579,  rating: 4.7, reviews: 645,  sold: '1.1K vendidos', stock: 22,                                        shipFree: true },
        { id: 12, name: 'Set de toallas algodón egipcio',      cat: 'Hogar',      tone: 5, now: 119,  was: 159,  rating: 4.5, reviews: 723,  sold: '1.6K vendidos', stock: 88, badge: '-25%',                         shipFree: false },
    ];

    protected readonly flashDeals = this.catalog.slice(0, 6);
    protected readonly recommended = this.catalog.slice(6, 12);
}
