import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreConfigService } from '@core/services/store-config.service';

interface FooterLink { label: string; route: string; }
interface FooterColumn { title: string; links: FooterLink[]; }

/**
 * Shop Footer — 4 columnas (info / ayuda / legal / app downloads) + copyright.
 *
 * Las 3 columnas de enlaces, sus títulos y el copyright son DINÁMICOS: se editan
 * desde el panel admin (Gestor de Footer → /api/ventas/tienda/config, claves
 * FOOTER_*_LINKS / FOOTER_*_TITLE / FOOTER_ALL_RIGHTS) y se leen vía
 * StoreConfigService. Si la tienda aún no configuró el footer, se usan los
 * defaults de abajo para no mostrar un footer vacío.
 */
@Component({
    selector: 'ds-shop-footer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <footer class="ft">
            <div class="grid">
                @for (col of columns(); track col.title) {
                    <div>
                        <h4>{{ col.title }}</h4>
                        <ul>
                            @for (l of col.links; track l.route) {
                                <li><a [routerLink]="l.route">{{ l.label }}</a></li>
                            }
                        </ul>
                    </div>
                }
                <div>
                    <h4>Descarga la app</h4>
                    <p class="p">Compra donde y cuando quieras.</p>
                    <div class="store-col">
                        <a class="store" routerLink="/info/descarga-app">
                            <span class="store-ic">⌘</span> App Store
                        </a>
                        <a class="store" routerLink="/info/descarga-app">
                            <span class="store-ic">▶</span> Google Play
                        </a>
                    </div>
                </div>
            </div>
            <div class="bar">
                <span>{{ copyright() }}</span>
                <div class="pays">
                    @for (p of payments; track p) {
                        <span class="pay">{{ p }}</span>
                    }
                </div>
            </div>
        </footer>
    `,
    styles: [`
        :host { display: block; }
        .ft {
            background: var(--c-surface);
            border-top: 1px solid var(--c-border);
            padding: 40px 0 20px;
            font-family: var(--f-sans);
        }
        .grid {
            width: 90%; margin: 0 auto;
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
        }
        h4 {
            font-size: 13px; font-weight: 700; color: var(--c-text);
            margin: 0 0 12px;
            text-transform: uppercase; letter-spacing: .05em;
        }
        ul {
            list-style: none; padding: 0; margin: 0;
            display: flex; flex-direction: column; gap: 8px;
        }
        li a {
            font-size: 13px; color: var(--c-muted);
            text-decoration: none; cursor: pointer;
            transition: color 120ms;
        }
        li a:hover { color: var(--c-text); }
        .p { font-size: 12px; color: var(--c-muted); margin: 0 0 12px; }
        .store-col { display: flex; flex-direction: column; gap: 8px; }
        .store {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 14px;
            background: var(--c-text); color: var(--c-surface);
            border-radius: var(--r-md); font-size: 12px;
            cursor: pointer; text-decoration: none;
            transition: filter 120ms;
        }
        .store:hover { filter: brightness(1.15); }
        .store-ic { font-size: 18px; }
        .bar {
            width: 90%; margin: 32px auto 0;
            padding-top: 16px; border-top: 1px solid var(--c-border);
            display: flex; justify-content: space-between; align-items: center;
            font-size: 12px; color: var(--c-muted);
        }
        .pays { display: flex; gap: 8px; }
        .pay {
            padding: 3px 8px; border: 1px solid var(--c-border);
            border-radius: 4px; font-weight: 700; font-size: 10px;
            color: var(--c-text);
        }

        @media (max-width: 768px) {
            .grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
            .bar { flex-direction: column; gap: 12px; text-align: center; }
        }
    `],
})
export class DsShopFooterComponent {
    private readonly sc = inject(StoreConfigService);

    readonly year = new Date().getFullYear();

    /** Defaults usados cuando la tienda aún no configuró el footer desde el admin. */
    private readonly defaultColumns: FooterColumn[] = [
        {
            title: 'Información',
            links: [
                { label: 'Acerca de nosotros',    route: '/info/nosotros'  },
                { label: 'Programa de afiliados', route: '/info/afiliados' },
                { label: 'Vende con nosotros',    route: '/info/vender'    },
                { label: 'Prensa y medios',       route: '/info/prensa'    },
            ],
        },
        {
            title: 'Ayuda y soporte',
            links: [
                { label: 'Centro de ayuda',  route: '/info/ayuda'        },
                { label: 'Estado del pedido', route: '/account/orders'   },
                { label: 'Devoluciones',     route: '/info/devoluciones' },
                { label: 'Reportar problema', route: '/info/reporte'     },
            ],
        },
        {
            title: 'Legal',
            links: [
                { label: 'Términos y condiciones', route: '/info/terminos'      },
                { label: 'Política de privacidad', route: '/info/privacidad'    },
                { label: 'Protección de datos',    route: '/info/datos'         },
                { label: 'Accesibilidad',          route: '/info/accesibilidad' },
            ],
        },
    ];

    /**
     * Columnas del footer derivadas de la config de tienda (editable desde
     * admin → Gestor de Footer). Cada columna usa los enlaces configurados si
     * existen; si no, cae al default. El título usa la clave FOOTER_*_TITLE o el
     * título por defecto.
     */
    readonly columns = computed<FooterColumn[]>(() => {
        const cfg: { title: string; links: { label: string; url: string }[]; def: FooterColumn }[] = [
            { title: this.sc.footerCompanyTitle(), links: this.sc.footerCompanyLinks(), def: this.defaultColumns[0] },
            { title: this.sc.footerHelpTitle(),    links: this.sc.footerHelpLinks(),    def: this.defaultColumns[1] },
            { title: this.sc.footerLegalTitle(),   links: this.sc.footerLegalLinks(),   def: this.defaultColumns[2] },
        ];
        return cfg.map(c => ({
            title: c.title || c.def.title,
            links: c.links.length
                ? c.links.map(l => ({ label: l.label, route: l.url }))
                : c.def.links,
        }));
    });

    /** Copyright editable desde admin (FOOTER_ALL_RIGHTS); fallback con el año actual. */
    readonly copyright = computed<string>(() =>
        this.sc.footerAllRightsLabel() || `© ${this.year} ${this.sc.storeName()}. Todos los derechos reservados.`
    );

    readonly payments = ['VISA', 'MC', 'AMEX', 'PP', 'YAPE'];
}
