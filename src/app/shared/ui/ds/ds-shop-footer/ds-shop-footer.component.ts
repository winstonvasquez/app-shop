import { Component, ChangeDetectionStrategy } from '@angular/core';

interface FooterColumn {
    title: string;
    links: string[];
}

/**
 * Shop Footer — 4 columnas (info / ayuda / legal / app downloads) + copyright.
 * Port 1:1 de chrome.jsx → function Footer()
 */
@Component({
    selector: 'ds-shop-footer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <footer class="ft">
            <div class="grid">
                @for (col of columns; track col.title) {
                    <div>
                        <h4>{{ col.title }}</h4>
                        <ul>
                            @for (l of col.links; track l) {
                                <li>{{ l }}</li>
                            }
                        </ul>
                    </div>
                }
                <div>
                    <h4>Descarga la app</h4>
                    <p class="p">Compra donde y cuando quieras.</p>
                    <div class="store-col">
                        <div class="store"><span class="store-ic">⌘</span> App Store</div>
                        <div class="store"><span class="store-ic">▶</span> Google Play</div>
                    </div>
                </div>
            </div>
            <div class="bar">
                <span>© 2026 APPSHOP. Todos los derechos reservados.</span>
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
            padding: 40px 24px 20px;
            font-family: var(--f-sans);
        }
        .grid {
            max-width: 1280px; margin: 0 auto;
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
        li { font-size: 13px; color: var(--c-muted); cursor: pointer; }
        li:hover { color: var(--c-text); }
        .p { font-size: 12px; color: var(--c-muted); margin: 0 0 12px; }
        .store-col { display: flex; flex-direction: column; gap: 8px; }
        .store {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 14px;
            background: var(--c-text); color: var(--c-surface);
            border-radius: var(--r-md); font-size: 12px;
            cursor: pointer;
        }
        .store-ic { font-size: 18px; }
        .bar {
            max-width: 1280px; margin: 32px auto 0;
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
    readonly columns: FooterColumn[] = [
        { title: 'Información', links: ['Acerca de nosotros', 'Programa de afiliados', 'Vende con nosotros', 'Prensa y medios'] },
        { title: 'Ayuda y soporte', links: ['Centro de ayuda', 'Estado del pedido', 'Devoluciones', 'Reportar problema'] },
        { title: 'Legal', links: ['Términos y condiciones', 'Política de privacidad', 'Protección de datos', 'Accesibilidad'] },
    ];
    readonly payments = ['VISA', 'MC', 'AMEX', 'PP', 'YAPE'];
}
