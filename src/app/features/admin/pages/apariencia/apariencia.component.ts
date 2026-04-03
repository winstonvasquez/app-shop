import {
    Component, ChangeDetectionStrategy, inject, signal, OnInit, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { StoreConfigService } from '@core/services/store-config.service';

interface ConfigSection {
    key:         string;
    label:       string;
    placeholder: string;
    type:        'text' | 'url' | 'email' | 'tel';
}

const IDENTITY_FIELDS: ConfigSection[] = [
    { key: 'STORE_NAME',    label: 'Nombre de la tienda', placeholder: 'Ej: Mi Tienda',           type: 'text'  },
    { key: 'STORE_SLOGAN',  label: 'Slogan',              placeholder: 'Ej: Lo mejor al mejor precio', type: 'text'  },
    { key: 'STORE_PHONE',   label: 'Teléfono',            placeholder: '+51 999 999 999',            type: 'tel'   },
    { key: 'STORE_EMAIL',   label: 'Correo de contacto',  placeholder: 'contacto@mitienda.com',     type: 'email' },
    { key: 'STORE_ADDRESS', label: 'Dirección',           placeholder: 'Av. Principal 123, Lima',   type: 'text'  },
];

const SOCIAL_FIELDS: ConfigSection[] = [
    { key: 'SOCIAL_FACEBOOK',  label: 'Facebook',  placeholder: 'https://facebook.com/mitienda',  type: 'url' },
    { key: 'SOCIAL_INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/mitienda', type: 'url' },
    { key: 'SOCIAL_TWITTER',   label: 'Twitter / X', placeholder: 'https://x.com/mitienda',      type: 'url' },
];

const HEADER_FIELDS: ConfigSection[] = [
    { key: 'HEADER_FREE_SHIPPING',       label: 'Etiqueta: Envío gratis',          placeholder: 'Envío gratis a todo el país', type: 'text' },
    { key: 'HEADER_GUARANTEED_DELIVERY', label: 'Etiqueta: Entrega garantizada',   placeholder: 'Entrega garantizada',         type: 'text' },
    { key: 'HEADER_DOWNLOAD_APP',        label: 'Etiqueta: Descarga app',          placeholder: 'Descarga nuestra app',        type: 'text' },
];

const APP_FIELDS: ConfigSection[] = [
    { key: 'APP_STORE_URL',  label: 'App Store URL',   placeholder: 'https://apps.apple.com/...', type: 'url' },
    { key: 'PLAY_STORE_URL', label: 'Play Store URL',  placeholder: 'https://play.google.com/...', type: 'url' },
];

@Component({
    selector: 'app-apariencia',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Apariencia</h1>
                <p class="page-subtitle">Configura la identidad, redes sociales y etiquetas de tu tienda</p>
            </div>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveAll()">
                @if (saving()) { Guardando... } @else { Guardar cambios }
            </button>
        </div>

        @if (successMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-success); padding: 12px 16px">
                <p style="color:var(--color-success); font-size:.875rem; margin:0">✓ {{ successMsg() }}</p>
            </div>
        }
        @if (errorMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-error); padding:12px 16px">
                <p style="color:var(--color-error); font-size:.875rem; margin:0">{{ errorMsg() }}</p>
            </div>
        }

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; align-items:start">

            <!-- Identidad de tienda -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Identidad de tienda</h3>
                </div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:.75rem">
                    @for (field of identityFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" [type]="field.type"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="form()[field.key]">
                        </div>
                    }
                </div>
            </div>

            <!-- Redes sociales -->
            <div class="card" style="min-height:320px">
                <div class="card-header">
                    <h3 class="card-title">Redes sociales</h3>
                </div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:.75rem">
                    @for (field of socialFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" type="url"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="form()[field.key]">
                        </div>
                    }
                </div>

                <div class="card-header" style="margin-top:1rem">
                    <h3 class="card-title">Apps móviles</h3>
                </div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:.75rem">
                    @for (field of appFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" type="url"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="form()[field.key]">
                        </div>
                    }
                </div>
            </div>

            <!-- Barra superior del Header -->
            <div class="card" style="grid-column: 1 / -1">
                <div class="card-header">
                    <h3 class="card-title">Barra informativa del header</h3>
                    <span class="badge badge-neutral">Texto visible en la barra superior de la tienda</span>
                </div>
                <div class="card-body"
                     style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:.75rem">
                    @for (field of headerFields; track field.key) {
                        <div>
                            <label class="input-label">{{ field.label }}</label>
                            <input class="input-field" type="text"
                                   [placeholder]="field.placeholder"
                                   [(ngModel)]="form()[field.key]">
                        </div>
                    }
                </div>

                <!-- Preview barra header -->
                <div class="card-body" style="padding-top:0">
                    <p style="font-size:.75rem; color:var(--color-text-muted); margin-bottom:.5rem">Preview barra superior:</p>
                    <div style="background: var(--color-header-top-bg, #321d00); color:rgba(255,255,255,.8);
                                font-size:.75rem; padding:.375rem 1rem; border-radius:6px;
                                display:flex; justify-content:space-between; align-items:center">
                        <span style="display:flex; gap:1.5rem">
                            <span>✓ {{ form()['HEADER_FREE_SHIPPING'] || 'Envío gratis' }}</span>
                            <span>🛡 {{ form()['HEADER_GUARANTEED_DELIVERY'] || 'Entrega garantizada' }}</span>
                        </span>
                        <span>{{ form()['HEADER_DOWNLOAD_APP'] || 'Descarga la app' }}</span>
                    </div>
                </div>
            </div>

        </div>
    `,
})
export class AparienciaComponent implements OnInit {
    private readonly http          = inject(HttpClient);
    private readonly storeConfig   = inject(StoreConfigService);

    readonly identityFields = IDENTITY_FIELDS;
    readonly socialFields   = SOCIAL_FIELDS;
    readonly headerFields   = HEADER_FIELDS;
    readonly appFields      = APP_FIELDS;

    form       = signal<Record<string, string>>({});
    saving     = signal(false);
    successMsg = signal('');
    errorMsg   = signal('');

    ngOnInit(): void {
        this.storeConfig.loadConfig('es').subscribe(cfg => {
            this.form.set({ ...cfg });
        });
    }

    saveAll(): void {
        this.saving.set(true);
        this.successMsg.set('');
        this.errorMsg.set('');

        const url = `${environment.apiUrls.sales}/api/ventas/tienda/config?locale=es`;
        this.http.put<void>(url, this.form()).subscribe({
            next: () => {
                this.saving.set(false);
                this.successMsg.set('Configuración guardada correctamente.');
                this.storeConfig.loadConfig('es').subscribe();
            },
            error: () => {
                this.saving.set(false);
                this.errorMsg.set('Error al guardar. Verifica que microshopventas esté activo.');
            },
        });
    }
}
