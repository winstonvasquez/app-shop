import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
    DsButtonComponent, DsBadgeComponent, DsPriceComponent, DsStarsComponent,
    DsInputComponent,
} from '@shared/ui/ds';

interface Swatch { name: string; hex: string; cssVar: string; }

/**
 * Docs section for /design-system: paleta de tokens, especímenes
 * tipográficos y biblioteca de componentes — Port de screens-tokens.jsx
 * (TokensPalette + TypeSpecimen + ComponentLibrary).
 */
@Component({
    selector: 'app-ds-docs',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        LucideAngularModule,
        DsButtonComponent, DsBadgeComponent, DsPriceComponent, DsStarsComponent,
        DsInputComponent,
    ],
    template: `
        <section class="docs">

            <!-- ════════════════════════════════════════════════════════
                 1 · TOKENS PALETTE
                 ════════════════════════════════════════════════════════ -->
            <header class="docs-head">
                <h2>Tokens · Paleta</h2>
                <p>Confianza Light (storefront default). Los swatches usan <code>var(--c-*)</code>;
                   el data-theme actual del documento define qué muestran.</p>
            </header>

            <div class="palette">
                @for (s of swatches; track s.name) {
                    <div class="swatch">
                        <div class="chip" [style.background]="'var(' + s.cssVar + ')'"></div>
                        <div class="swatch-label">
                            <div class="name">{{ s.name }}</div>
                            <div class="hex">{{ s.hex }}</div>
                            <div class="var">{{ s.cssVar }}</div>
                        </div>
                    </div>
                }
            </div>

            <!-- ════════════════════════════════════════════════════════
                 2 · TYPE SPECIMEN
                 ════════════════════════════════════════════════════════ -->
            <header class="docs-head">
                <h2>Tipografía</h2>
                <p>Display: <code>Source Serif 4</code> · Sans: <code>Inter</code></p>
            </header>

            <div class="type-specimen">
                <div class="type-head">
                    <div>
                        <div class="eyebrow">Display</div>
                        <div class="font-name display">Source Serif 4</div>
                    </div>
                    <div class="right">
                        <div class="eyebrow">Sans</div>
                        <div class="font-name">Inter</div>
                    </div>
                </div>

                <div class="display-aa">Aa Bb Cc</div>

                <div class="type-grid">
                    <div>
                        <div class="hero-32">Hero 32 / 800</div>
                        <div class="title-22">Title 22 / 700</div>
                        <div class="subtitle-16">Subtitle 16 / 600</div>
                    </div>
                    <div>
                        <div class="body-14">Body 14/regular — Texto base de la interfaz, legible y sin esfuerzo. 1.5 line-height.</div>
                        <div class="caption-12">Caption 12 / regular muted</div>
                        <div class="eyebrow eyebrow-bold">Eyebrow 11 / 800</div>
                    </div>
                </div>
            </div>

            <!-- ════════════════════════════════════════════════════════
                 3 · COMPONENT LIBRARY
                 ════════════════════════════════════════════════════════ -->
            <header class="docs-head">
                <h2>Biblioteca de componentes</h2>
                <p>Átomos <code>ds-*</code> en sus variantes.</p>
            </header>

            <div class="lib">

                <!-- Botones -->
                <div class="lib-section">
                    <div class="eyebrow eyebrow-bold">Botones · variantes</div>
                    <div class="row">
                        <ds-button variant="primary">Primario</ds-button>
                        <ds-button variant="accent">Acento</ds-button>
                        <ds-button variant="secondary">Secundario</ds-button>
                        <ds-button variant="outline">Outline</ds-button>
                        <ds-button variant="ghost">Ghost</ds-button>
                        <ds-button variant="danger">Eliminar</ds-button>
                    </div>
                    <div class="eyebrow eyebrow-bold mt">Botones · tamaños</div>
                    <div class="row">
                        <ds-button variant="primary" size="sm">SM</ds-button>
                        <ds-button variant="primary" size="md">MD</ds-button>
                        <ds-button variant="primary" size="lg">LG</ds-button>
                        <ds-button variant="primary" size="xl">XL</ds-button>
                    </div>
                    <div class="eyebrow eyebrow-bold mt">Botones · con iconos</div>
                    <div class="row">
                        <ds-button variant="primary" icon="shopping-cart">Agregar</ds-button>
                        <ds-button variant="accent" iconRight="arrow-right">Continuar</ds-button>
                        <ds-button variant="ghost" icon="x"/>
                        <ds-button variant="primary" [disabled]="true">Deshabilitado</ds-button>
                    </div>
                </div>

                <!-- Badges -->
                <div class="lib-section">
                    <div class="eyebrow eyebrow-bold">Badges</div>
                    <div class="row">
                        <ds-badge tone="brand">Brand</ds-badge>
                        <ds-badge tone="accent">Accent</ds-badge>
                        <ds-badge tone="success">Stock</ds-badge>
                        <ds-badge tone="danger">-30%</ds-badge>
                        <ds-badge tone="warn">Pocas</ds-badge>
                        <ds-badge tone="info">Nuevo</ds-badge>
                        <ds-badge tone="outline">Outline</ds-badge>
                        <ds-badge tone="neutral">Neutral</ds-badge>
                    </div>
                </div>

                <!-- Inputs (ds-input — 3 sizes + estados) -->
                <div class="lib-section">
                    <div class="eyebrow eyebrow-bold">Inputs · tamaños</div>
                    <div class="inputs-grid">
                        <ds-input size="sm" placeholder="Small" icon="search" [full]="true"/>
                        <ds-input size="md" placeholder="Medium (default)" icon="mail" [full]="true"/>
                        <ds-input size="lg" placeholder="Large" icon="user" [full]="true"/>
                    </div>
                    <div class="eyebrow eyebrow-bold mt">Inputs · estados</div>
                    <div class="inputs-grid">
                        <ds-input placeholder="Default" [full]="true"/>
                        <ds-input placeholder="Con suffix" icon="search" suffix="x" [full]="true"/>
                        <ds-input placeholder="Error" [error]="true" icon="x" [full]="true"/>
                    </div>
                </div>

                <!-- Precio -->
                <div class="lib-section">
                    <div class="eyebrow eyebrow-bold">Precio</div>
                    <div class="row baseline">
                        <ds-price [now]="89" [was]="109" size="md"/>
                        <ds-price [now]="1299" [was]="1599" size="lg"/>
                        <ds-price [now]="2299" [was]="2899" size="xl"/>
                    </div>
                </div>

                <!-- Stars + estados -->
                <div class="lib-grid">
                    <div class="lib-section">
                        <div class="eyebrow eyebrow-bold">Rating</div>
                        <ds-stars [rating]="4.7"/>
                    </div>
                    <div class="lib-section">
                        <div class="eyebrow eyebrow-bold">Estados</div>
                        <div class="row">
                            <span class="state default">Default</span>
                            <span class="state hover">Hover</span>
                            <span class="state disabled">Disabled</span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    `,
    styles: [`
        :host { display: block; }
        .docs {
            max-width: 1280px; margin: 0 auto;
            padding: 48px 24px 80px;
            background: var(--c-bg);
            color: var(--c-text);
            font-family: var(--f-sans);
        }
        .docs-head {
            margin: 32px 0 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--c-border);
        }
        .docs-head h2 {
            font-family: var(--f-display);
            font-size: 28px; font-weight: 700;
            margin: 0 0 4px; letter-spacing: -.01em;
        }
        .docs-head p { font-size: 13px; color: var(--c-muted); margin: 0; }
        code {
            font-family: var(--f-mono, ui-monospace, monospace);
            font-size: 12px;
            background: var(--c-surface2);
            padding: 1px 6px;
            border-radius: var(--r-xs);
        }

        /* ── Palette ──────────────────────────────── */
        .palette {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        .swatch {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-md);
            overflow: hidden;
        }
        .chip { height: 64px; }
        .swatch-label { padding: 10px 12px; }
        .swatch-label .name { font-size: 12px; font-weight: 700; color: var(--c-text); }
        .swatch-label .hex,
        .swatch-label .var {
            font-family: var(--f-mono, ui-monospace, monospace);
            font-size: 11px; color: var(--c-muted);
            line-height: 1.4;
        }

        /* ── Type specimen ────────────────────────── */
        .type-specimen {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            padding: 28px;
        }
        .type-head {
            display: flex; justify-content: space-between; align-items: baseline;
            padding-bottom: 14px;
            border-bottom: 1px solid var(--c-border);
            margin-bottom: 20px;
        }
        .type-head .right { text-align: right; }
        .eyebrow {
            font-size: 11px;
            color: var(--c-muted);
            letter-spacing: .08em;
            text-transform: uppercase;
            font-weight: 600;
        }
        .eyebrow-bold { font-weight: 800; }
        .font-name { font-size: 14px; font-weight: 600; }
        .font-name.display { font-family: var(--f-display); }
        .display-aa {
            font-family: var(--f-display);
            font-size: 64px; font-weight: 800;
            letter-spacing: -.03em; line-height: 1;
            margin: 16px 0 24px;
        }
        .type-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        }
        .hero-32      { font-family: var(--f-display); font-size: 32px; font-weight: 800; letter-spacing: -.02em; }
        .title-22     { font-size: 22px; font-weight: 700; margin-top: 8px; }
        .subtitle-16  { font-size: 16px; font-weight: 600; margin-top: 8px; }
        .body-14      { font-size: 14px; line-height: 1.5; }
        .caption-12   { font-size: 12px; color: var(--c-muted); margin-top: 10px; }

        .mt { margin-top: 16px; display: block; }

        /* ── Component library ────────────────────── */
        .lib { display: flex; flex-direction: column; gap: 24px; }
        .lib-section {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            padding: 20px;
        }
        .lib-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .row {
            display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
            margin-top: 8px;
        }
        .row.baseline { align-items: baseline; gap: 24px; }

        .inputs-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 8px; margin-top: 8px;
        }

        .state {
            padding: 4px 10px;
            border-radius: var(--r-sm);
            font-size: 11px;
        }
        .state.default  { background: var(--c-surface2); color: var(--c-text); }
        .state.hover    { background: var(--c-brand);    color: var(--c-onBrand, #fff); }
        .state.disabled { background: var(--c-surface2); color: var(--c-subtle, var(--c-muted)); opacity: .6; }

        @media (max-width: 900px) {
            .palette { grid-template-columns: repeat(2, 1fr); }
            .inputs-grid { grid-template-columns: 1fr; }
            .lib-grid { grid-template-columns: 1fr; }
            .type-grid { grid-template-columns: 1fr; }
            .display-aa { font-size: 48px; }
        }
    `],
})
export class DsDocsComponent {
    protected readonly swatches: Swatch[] = [
        { name: 'Brand',     hex: '#0B3D91', cssVar: '--c-brand' },
        { name: 'Brand alt', hex: '#062A6B', cssVar: '--c-brandHi' },
        { name: 'Accent',    hex: '#F08C00', cssVar: '--c-accent' },
        { name: 'Accent 2',  hex: '#0EA371', cssVar: '--c-accent2' },
        { name: 'Text',      hex: '#0E1B2C', cssVar: '--c-text' },
        { name: 'Muted',     hex: '#5A6473', cssVar: '--c-muted' },
        { name: 'Border',    hex: '#DCD8CE', cssVar: '--c-border' },
        { name: 'Surface',   hex: '#FFFFFF', cssVar: '--c-surface' },
        { name: 'Surface 2', hex: '#EFEDE7', cssVar: '--c-surface2' },
        { name: 'Bg',        hex: '#F7F6F3', cssVar: '--c-bg' },
        { name: 'Success',   hex: '#0E8A5F', cssVar: '--c-success' },
        { name: 'Warn',      hex: '#B45309', cssVar: '--c-warn' },
        { name: 'Danger',    hex: '#C0392B', cssVar: '--c-danger' },
        { name: 'Info',      hex: '#0B6FB8', cssVar: '--c-info' },
        { name: 'Header',    hex: '#0E1B2C', cssVar: '--c-headerBg' },
        { name: 'Price now', hex: '#C0392B', cssVar: '--c-priceNow' },
    ];
}
