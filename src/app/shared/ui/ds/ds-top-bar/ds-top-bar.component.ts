import {
    Component, ChangeDetectionStrategy, signal,
    inject, ElementRef, HostListener,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';

/**
 * TopBar — utility bar con envío/protección/ubicación + ayuda/idioma.
 * Port de chrome.jsx → function TopBar() + handlers reales:
 * - Items info navegan a /info/<slug> (envios, privacidad, ayuda, descarga-app)
 * - Selector idioma usa LanguageService (es/en) con dropdown click-outside
 */
@Component({
    selector: 'ds-top-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule, RouterLink],
    template: `
        <div class="bar">
            <div class="inner">
                <div class="group">
                    <a class="item link" routerLink="/info/envios">
                        <lucide-icon name="truck" [size]="14"/> Envío gratis desde S/ 99
                    </a>
                    <a class="item link" routerLink="/info/privacidad">
                        <lucide-icon name="shield" [size]="14"/> Compra protegida
                    </a>
                    <a class="item link" routerLink="/info/envios">
                        <lucide-icon name="map-pin" [size]="14"/> Entrega en Lima en 24h
                    </a>
                </div>
                <div class="group">
                    <a class="link" routerLink="/info/descarga-app">Descarga la app</a>
                    <a class="link" routerLink="/info/ayuda">Ayuda</a>
                    <div class="lang-wrap">
                        <button type="button" class="item link lang-btn"
                                (click)="toggleLangMenu($event)" aria-haspopup="true"
                                [attr.aria-expanded]="langOpen()">
                            {{ currentLang().flag }} {{ currentLang().code.toUpperCase() }}
                            <lucide-icon name="chevron-down" [size]="12"
                                         [class.rot]="langOpen()"/>
                        </button>
                        @if (langOpen()) {
                            <div class="lang-menu">
                                @for (l of languages; track l.code) {
                                    <button type="button" class="lang-opt"
                                            [class.active]="l.code === currentLang().code"
                                            (click)="selectLang(l.code)">
                                        <span>{{ l.flag }}</span>
                                        <span class="opt-name">{{ l.name }}</span>
                                        @if (l.code === currentLang().code) {
                                            <lucide-icon name="check" [size]="14"/>
                                        }
                                    </button>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .bar {
            background: var(--c-surface2);
            border-bottom: 1px solid var(--c-border);
            font-size: 12px; color: var(--c-muted);
            font-family: var(--f-sans);
        }
        .inner {
            width: 90%; margin: 0 auto;
            padding: 6px 0;
            display: flex; justify-content: space-between; align-items: center; gap: 16px;
        }
        .group { display: flex; gap: 16px; align-items: center; }
        .item { display: inline-flex; align-items: center; gap: 4px; }
        .link {
            color: inherit; text-decoration: none;
            background: none; border: none; cursor: pointer;
            font: inherit; padding: 0;
            transition: color 120ms;
        }
        .link:hover { color: var(--c-text); }

        .lang-wrap { position: relative; }
        .lang-btn .rot { transform: rotate(180deg); transition: transform 150ms; }
        .lang-menu {
            position: absolute; top: calc(100% + 6px); right: 0;
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-md);
            box-shadow: var(--s-lg);
            padding: 4px; min-width: 160px;
            z-index: 50;
        }
        .lang-opt {
            display: flex; align-items: center; gap: 8px; width: 100%;
            padding: 8px 10px; background: none; border: none; cursor: pointer;
            border-radius: var(--r-sm); font-family: inherit; font-size: 13px;
            color: var(--c-text); text-align: left;
            transition: background 120ms;
        }
        .lang-opt:hover { background: var(--c-surface2); }
        .lang-opt.active { font-weight: 600; }
        .opt-name { flex: 1; }

        @media (max-width: 768px) {
            .group:first-child .item:nth-child(n+2) { display: none; }
        }
    `],
})
export class DsTopBarComponent {
    private langSvc = inject(LanguageService);
    private host = inject(ElementRef);

    readonly languages = this.langSvc.availableLanguages;
    readonly currentLang = () =>
        this.langSvc.getCurrentLanguageData() ?? this.languages[0];

    protected readonly langOpen = signal(false);

    @HostListener('document:click', ['$event.target'])
    onDocumentClick(target: EventTarget | null): void {
        if (!this.host.nativeElement.contains(target as Node)) {
            this.langOpen.set(false);
        }
    }

    protected toggleLangMenu(e: MouseEvent): void {
        e.stopPropagation();
        this.langOpen.update(v => !v);
    }

    protected selectLang(code: string): void {
        this.langSvc.setLanguage(code);
        this.langOpen.set(false);
    }
}
