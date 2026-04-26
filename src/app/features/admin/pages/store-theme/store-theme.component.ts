import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    computed,
    OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeService, AVAILABLE_THEMES, type AppTheme, type ThemeMetadata } from '@core/services/theme/theme';

type ThemeModule = 'shop' | 'admin' | 'pos';

interface ActiveThemeResponse {
    themeKey: string;
    isSeasonalActive: boolean;
    seasonalName: string;
}

interface SeasonalTheme {
    id: number;
    themeKey: string;
    name: string;
    startDate: string;
    endDate: string;
    tenantId: string | null;
    active: boolean;
}

const MODULE_LABELS: Record<ThemeModule, string> = {
    shop:  'Tienda Pública',
    admin: 'Panel de Admin',
    pos:   'Punto de Venta',
};

/** Vista previa visual — par de colores complementarios para el chip de cada tema. */
const THEME_PREVIEW: Record<AppTheme, { bg: string; accent: string }> = {
    'confianza':      { bg: '#F7F6F3', accent: '#F08C00' },
    'confianza-dark': { bg: '#0B1320', accent: '#FFB04A' },
    'confianza-erp':  { bg: '#F1F3F8', accent: '#F08C00' },
};

@Component({
    selector: 'app-store-theme',
    standalone: true,
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Sistema de Diseño · Confianza</h1>
                <p class="page-subtitle">
                    Único sistema de diseño activo · 3 variantes (storefront light, storefront dark, ERP).
                </p>
            </div>
        </div>

        @if (error()) {
            <div class="card mb-4" style="border-left: 3px solid var(--color-warning); padding: var(--space-md)">
                <p style="color: var(--color-text-muted); font-size: 0.875rem">
                    No se pudo conectar con el servidor. Verifique que microshopusers esté activo (puerto 8080).
                </p>
            </div>
        }

        <!-- Selector de módulo -->
        <div class="card mb-4">
            <div class="card-body" style="padding: var(--space-sm)">
                <div style="display: flex; gap: var(--space-xs)">
                    @for (mod of modules; track mod) {
                        <button
                            class="btn"
                            [class.btn-primary]="activeModule() === mod"
                            [class.btn-secondary]="activeModule() !== mod"
                            style="flex: 1; font-size: 0.875rem"
                            (click)="selectModule(mod)"
                        >
                            {{ moduleLabel(mod) }}
                            @if (themesPerModule()[mod]) {
                                <span
                                    style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-left: 6px; vertical-align: middle"
                                    [style.background-color]="colorForTheme(themesPerModule()[mod]!.themeKey)"
                                ></span>
                            }
                        </button>
                    }
                </div>
            </div>
        </div>

        <!-- Tema activo del módulo seleccionado -->
        @if (currentModuleTheme()) {
            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Variante Activa — {{ moduleLabel(activeModule()) }}</h3>
                </div>
                <div class="card-body" style="padding: var(--space-md)">
                    <p style="font-size: 0.875rem; color: var(--color-text-muted)">
                        Variante actual:
                        <strong style="color: var(--color-text-primary)">{{ currentModuleTheme()!.themeKey }}</strong>
                    </p>
                </div>
            </div>
        }

        <!-- Selector de variantes Confianza -->
        <div class="card mb-4">
            <div class="card-header">
                <h3 class="card-title">Variantes del Sistema de Diseño</h3>
                <span class="badge badge-neutral">{{ themes.length }} variantes</span>
            </div>
            <div class="card-body" style="padding: var(--space-md)">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem">
                    @for (theme of themes; track theme.id) {
                        <div
                            style="border-radius: 12px; overflow: hidden; transition: border 0.2s"
                            [style.border]="currentModuleTheme()?.themeKey === theme.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'"
                        >
                            <!-- Vista previa -->
                            <div
                                class="p-3"
                                style="height: 84px; display: flex; align-items: center; justify-content: center; gap: 8px"
                                [style.background-color]="preview(theme.id).bg"
                            >
                                <div style="width: 28px; height: 28px; border-radius: 50%" [style.background-color]="theme.primaryColor"></div>
                                <div style="width: 28px; height: 28px; border-radius: 50%" [style.background-color]="preview(theme.id).accent"></div>
                                <div style="width: 28px; height: 28px; border-radius: 50%; opacity: 0.55" [style.background-color]="theme.primaryColor"></div>
                            </div>

                            <div class="p-3" style="background-color: var(--color-surface-raised)">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px">
                                    <p style="font-weight: 600; font-size: 0.875rem; color: var(--color-text-primary); margin: 0">
                                        {{ theme.name }}
                                    </p>
                                    <span class="badge" [class.badge-neutral]="theme.mode === 'light'" [class.badge-primary]="theme.mode === 'dark'">
                                        {{ theme.mode === 'dark' ? 'oscuro' : 'claro' }}
                                    </span>
                                </div>
                                <p style="font-size: 0.75rem; color: var(--color-text-muted); margin: 0 0 10px">
                                    {{ theme.description }}
                                </p>
                                @if (currentModuleTheme()?.themeKey === theme.id) {
                                    <span class="badge badge-success" style="width: 100%; justify-content: center">Activa</span>
                                } @else {
                                    <button
                                        class="btn btn-secondary"
                                        style="width: 100%; font-size: 0.75rem; padding: 6px 12px"
                                        [disabled]="!!guardando()"
                                        (click)="activarTema(theme.id)"
                                    >
                                        {{ guardando() === theme.id ? 'Activando...' : 'Activar' }}
                                    </button>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>

        <!-- Temas estacionales — solo aplican a tienda -->
        @if (activeModule() === 'shop') {
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Temas Estacionales Programados</h3>
                    <span class="badge badge-neutral">Activación automática por fecha</span>
                </div>
                @if (cargandoEstacionales()) {
                    <div class="loading-container"><div class="spinner-sm"></div></div>
                } @else if (temaEstacional().length > 0) {
                    <table class="table">
                        <thead>
                            <tr>
                                <th class="table-header-cell">Tema</th>
                                <th class="table-header-cell">Nombre</th>
                                <th class="table-header-cell">Inicio</th>
                                <th class="table-header-cell">Fin</th>
                                <th class="table-header-cell">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (st of temaEstacional(); track st.id) {
                                <tr class="table-row">
                                    <td class="table-cell">
                                        <code style="font-size: 0.8rem; background: var(--color-surface); padding: 2px 6px; border-radius: 4px">{{ st.themeKey }}</code>
                                    </td>
                                    <td class="table-cell">{{ st.name }}</td>
                                    <td class="table-cell" style="color: var(--color-text-muted)">{{ st.startDate }}</td>
                                    <td class="table-cell" style="color: var(--color-text-muted)">{{ st.endDate }}</td>
                                    <td class="table-cell">
                                        @if (st.active) {
                                            <span class="badge badge-success">Activo</span>
                                        } @else {
                                            <span class="badge badge-neutral">Inactivo</span>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                } @else {
                    <div class="card-body" style="text-align: center; padding: var(--space-xl)">
                        <p style="color: var(--color-text-muted)">No hay temas estacionales configurados.</p>
                    </div>
                }
            </div>
        }
    `,
})
export class StoreThemeComponent implements OnInit {
    private readonly http         = inject(HttpClient);
    private readonly themeService = inject(ThemeService);

    readonly themes: ThemeMetadata[] = AVAILABLE_THEMES;
    readonly modules: ThemeModule[]  = ['shop', 'admin', 'pos'];

    readonly activeModule         = signal<ThemeModule>('shop');
    readonly themesPerModule      = signal<Partial<Record<ThemeModule, ActiveThemeResponse>>>({});
    readonly temaEstacional       = signal<SeasonalTheme[]>([]);
    readonly guardando            = signal<string | null>(null);
    readonly cargandoEstacionales = signal(false);
    readonly error                = signal<string | null>(null);

    readonly currentModuleTheme = computed<ActiveThemeResponse | null>(
        () => this.themesPerModule()[this.activeModule()] ?? null
    );

    ngOnInit(): void {
        this.modules.forEach(m => this.cargarTemaActivo(m));
        this.cargarEstacionales();
    }

    moduleLabel(mod: ThemeModule): string {
        return MODULE_LABELS[mod];
    }

    colorForTheme(key: string): string {
        return this.themes.find(t => t.id === key)?.primaryColor ?? 'var(--color-primary)';
    }

    preview(id: AppTheme): { bg: string; accent: string } {
        return THEME_PREVIEW[id];
    }

    selectModule(mod: ThemeModule): void {
        this.activeModule.set(mod);
    }

    cargarTemaActivo(mod: ThemeModule): void {
        this.http
            .get<ActiveThemeResponse>(`${environment.apiUrls.users}/api/themes/active?module=${mod}`)
            .subscribe({
                next: data => {
                    this.themesPerModule.update(current => ({ ...current, [mod]: data }));
                    this.error.set(null);
                },
                error: () => this.error.set('No disponible'),
            });
    }

    cargarEstacionales(): void {
        this.cargandoEstacionales.set(true);
        this.http
            .get<SeasonalTheme[]>(`${environment.apiUrls.users}/api/themes/seasonal`)
            .subscribe({
                next: data => {
                    this.temaEstacional.set(data);
                    this.cargandoEstacionales.set(false);
                },
                error: () => this.cargandoEstacionales.set(false),
            });
    }

    activarTema(themeKey: string): void {
        const mod = this.activeModule();
        this.guardando.set(themeKey);
        this.http
            .put<void>(`${environment.apiUrls.users}/api/themes/active`, { themeKey, module: mod })
            .subscribe({
                next: () => {
                    this.themesPerModule.update(current => ({
                        ...current,
                        [mod]: { themeKey, isSeasonalActive: false, seasonalName: '' },
                    }));
                    this.themeService.setTheme(themeKey as AppTheme, mod);
                    this.guardando.set(null);
                },
                error: () => this.guardando.set(null),
            });
    }
}
