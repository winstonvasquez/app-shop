import {
    Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { StoreConfigService } from '@core/services/store-config.service';

interface FooterLink { label: string; url: string; }

type ColumnKey = 'FOOTER_COMPANY_LINKS' | 'FOOTER_HELP_LINKS' | 'FOOTER_LEGAL_LINKS';

interface FooterColumn {
    titleKey: string;
    linksKey: ColumnKey;
    label:    string;
}

const COLUMNS: FooterColumn[] = [
    { titleKey: 'FOOTER_COMPANY_TITLE', linksKey: 'FOOTER_COMPANY_LINKS', label: 'Empresa' },
    { titleKey: 'FOOTER_HELP_TITLE',    linksKey: 'FOOTER_HELP_LINKS',    label: 'Ayuda' },
    { titleKey: 'FOOTER_LEGAL_TITLE',   linksKey: 'FOOTER_LEGAL_LINKS',   label: 'Legal' },
];

@Component({
    selector: 'app-footer-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Gestor de Footer</h1>
                <p class="page-subtitle">Edita los títulos, enlaces y redes sociales del footer de la tienda</p>
            </div>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveAll()">
                @if (saving()) { Guardando... } @else { Guardar cambios }
            </button>
        </div>

        @if (successMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-success); padding:12px 16px">
                <p style="color:var(--color-success); font-size:.875rem; margin:0">✓ {{ successMsg() }}</p>
            </div>
        }
        @if (errorMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-error); padding:12px 16px">
                <p style="color:var(--color-error); font-size:.875rem; margin:0">{{ errorMsg() }}</p>
            </div>
        }

        <!-- 3 columnas de links -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; margin-bottom:1.5rem">
            @for (col of columns; track col.linksKey) {
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">{{ col.label }}</h3>
                        <button class="btn btn-secondary" style="font-size:.75rem; padding:4px 10px"
                                (click)="addLink(col.linksKey)">+ Link</button>
                    </div>
                    <div class="card-body" style="display:flex; flex-direction:column; gap:.5rem">
                        <div>
                            <label class="input-label">Título de sección</label>
                            <input class="input-field" type="text"
                                   [placeholder]="'Ej: ' + col.label"
                                   [(ngModel)]="titles()[col.titleKey]">
                        </div>
                        <div style="border-top:1px solid var(--color-border); padding-top:.5rem; margin-top:.25rem">
                            <p style="font-size:.75rem; color:var(--color-text-muted); margin-bottom:.5rem">
                                Links ({{ links()[col.linksKey].length }})
                            </p>
                            @for (link of links()[col.linksKey]; track $index) {
                                <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:.375rem; margin-bottom:.375rem; align-items:center">
                                    <input class="input-field" type="text" placeholder="Texto"
                                           style="font-size:.8rem; padding:6px 10px"
                                           [(ngModel)]="link.label">
                                    <input class="input-field" type="url" placeholder="/ruta"
                                           style="font-size:.8rem; padding:6px 10px"
                                           [(ngModel)]="link.url">
                                    <button class="btn btn-icon btn-icon-delete"
                                            (click)="removeLink(col.linksKey, $index)"
                                            title="Eliminar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" stroke-width="2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            }
                            @if (links()[col.linksKey].length === 0) {
                                <p style="font-size:.8rem; color:var(--color-text-muted); font-style:italic">
                                    Sin links. Haz clic en "+ Link" para agregar.
                                </p>
                            }
                        </div>
                    </div>
                </div>
            }
        </div>

        <!-- Textos adicionales + redes sociales -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem">
            <div class="card">
                <div class="card-header"><h3 class="card-title">Textos del footer</h3></div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:.75rem">
                    @for (field of textFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" type="text"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="titles()[field.key]">
                        </div>
                    }
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3 class="card-title">Redes sociales</h3></div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:.75rem">
                    @for (field of socialFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" type="url"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="titles()[field.key]">
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
})
export class FooterManagerComponent implements OnInit {
    private readonly http        = inject(HttpClient);
    private readonly storeConfig = inject(StoreConfigService);

    readonly columns     = COLUMNS;
    readonly textFields  = [
        { key: 'FOOTER_APP_TITLE',      label: 'Título sección App',      placeholder: 'Descarga la app' },
        { key: 'FOOTER_SHOP_ANYWHERE',  label: 'Subtítulo app',           placeholder: 'Compra desde tu móvil' },
        { key: 'FOOTER_ALL_RIGHTS',     label: 'Copyright',               placeholder: '© 2025 Mi Tienda' },
        { key: 'FOOTER_PRIVACY',        label: 'Texto privacidad',        placeholder: 'Política de privacidad' },
        { key: 'FOOTER_TERMS',          label: 'Texto términos',          placeholder: 'Términos y condiciones' },
    ];
    readonly socialFields = [
        { key: 'SOCIAL_FACEBOOK',  label: 'Facebook',   placeholder: 'https://facebook.com/...' },
        { key: 'SOCIAL_INSTAGRAM', label: 'Instagram',  placeholder: 'https://instagram.com/...' },
        { key: 'SOCIAL_TWITTER',   label: 'Twitter/X',  placeholder: 'https://x.com/...' },
    ];

    titles     = signal<Record<string, string>>({});
    links      = signal<Record<ColumnKey, FooterLink[]>>({
        FOOTER_COMPANY_LINKS: [],
        FOOTER_HELP_LINKS:    [],
        FOOTER_LEGAL_LINKS:   [],
    });
    saving     = signal(false);
    successMsg = signal('');
    errorMsg   = signal('');

    ngOnInit(): void {
        this.storeConfig.loadConfig('es').subscribe(cfg => {
            this.titles.set({ ...cfg });
            this.links.set({
                FOOTER_COMPANY_LINKS: this.parseLinks(cfg['FOOTER_COMPANY_LINKS']),
                FOOTER_HELP_LINKS:    this.parseLinks(cfg['FOOTER_HELP_LINKS']),
                FOOTER_LEGAL_LINKS:   this.parseLinks(cfg['FOOTER_LEGAL_LINKS']),
            });
        });
    }

    addLink(key: ColumnKey): void {
        this.links.update(current => ({
            ...current,
            [key]: [...current[key], { label: '', url: '' }],
        }));
    }

    removeLink(key: ColumnKey, index: number): void {
        this.links.update(current => ({
            ...current,
            [key]: current[key].filter((_, i) => i !== index),
        }));
    }

    saveAll(): void {
        this.saving.set(true);
        this.successMsg.set('');
        this.errorMsg.set('');

        const payload: Record<string, string> = { ...this.titles() };
        (['FOOTER_COMPANY_LINKS', 'FOOTER_HELP_LINKS', 'FOOTER_LEGAL_LINKS'] as ColumnKey[])
            .forEach(key => {
                payload[key] = JSON.stringify(this.links()[key]);
            });

        const url = `${environment.apiUrls.sales}/api/ventas/tienda/config?locale=es`;
        this.http.put<void>(url, payload).subscribe({
            next: () => {
                this.saving.set(false);
                this.successMsg.set('Footer actualizado correctamente.');
                this.storeConfig.loadConfig('es').subscribe();
            },
            error: () => {
                this.saving.set(false);
                this.errorMsg.set('Error al guardar. Verifica que microshopventas esté activo.');
            },
        });
    }

    private parseLinks(raw: string | undefined): FooterLink[] {
        try {
            if (!raw) return [];
            return JSON.parse(raw) as FooterLink[];
        } catch {
            return [];
        }
    }
}
