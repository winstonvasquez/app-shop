import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    computed,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeService } from '@core/services/theme/theme';

type ThemeModule = 'shop' | 'admin' | 'pos';

interface ThemeOption {
    key: string;
    name: string;
    description: string;
    primaryColor: string;
    bgColor: string;
    accentColor: string;
}

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

const AVAILABLE_THEMES: ThemeOption[] = [
    {
        key: 'dark',
        name: 'Dark',
        description: 'Tema oscuro estándar',
        primaryColor: '#ef4444',
        bgColor: '#171717',
        accentColor: '#fb8c00',
    },
    {
        key: 'obsidian',
        name: 'Obsidian',
        description: 'Oscuro profundo con acento rojo',
        primaryColor: '#e8152d',
        bgColor: '#0e1520',
        accentColor: '#ff4d6d',
    },
    {
        key: 'orange-black',
        name: 'Orange Black',
        description: 'Oscuro con acento naranja',
        primaryColor: '#ff7e0d',
        bgColor: '#1d1a19',
        accentColor: '#ffa94d',
    },
    {
        key: 'orange-light',
        name: 'Orange Light',
        description: 'Claro con acento naranja cálido',
        primaryColor: '#f36203',
        bgColor: '#fff8ec',
        accentColor: '#fb8c00',
    },
    {
        key: 'christmas',
        name: 'Navidad',
        description: 'Tema festivo de Navidad',
        primaryColor: '#cc0000',
        bgColor: '#0a1a0a',
        accentColor: '#00aa44',
    },
    {
        key: 'black-friday',
        name: 'Black Friday',
        description: 'Tema de Black Friday',
        primaryColor: '#ffcc00',
        bgColor: '#0d0d0d',
        accentColor: '#ff6600',
    },
    {
        key: 'summer',
        name: 'Verano',
        description: 'Tema cálido de verano',
        primaryColor: '#f59e0b',
        bgColor: '#fffbeb',
        accentColor: '#ef4444',
    },
    {
        key: 'verano',
        name: 'Verano Clásico',
        description: 'Tono terracota y arena',
        primaryColor: '#c75535',
        bgColor: '#fff7ed',
        accentColor: '#f59e0b',
    },
    {
        key: 'fresh-mint',
        name: 'Fresh Mint ⭐',
        description: 'Verde menta vivo — tema por defecto tienda',
        primaryColor: '#1a9e5c',
        bgColor: '#f0faf4',
        accentColor: '#84cc16',
    },
    {
        key: 'soft-blossom',
        name: 'Soft Blossom',
        description: 'Rosa cereza elegante y femenino',
        primaryColor: '#c4456a',
        bgColor: '#fdf4f7',
        accentColor: '#f472b6',
    },
    {
        key: 'golden-light',
        name: 'Golden Light',
        description: 'Dorado cálido premium y luminoso',
        primaryColor: '#b8860b',
        bgColor: '#fffbf0',
        accentColor: '#e6ac2c',
    },
    {
        key: 'peach-cream',
        name: 'Peach Cream',
        description: 'Naranja durazno cálido y acogedor',
        primaryColor: '#c4561e',
        bgColor: '#fff8f4',
        accentColor: '#f59e0b',
    },
    {
        key: 'nordic-light',
        name: 'Nordic Light',
        description: 'Azul nórdico sobrio y confiable',
        primaryColor: '#2e4a6e',
        bgColor: '#f5f7fa',
        accentColor: '#5b7fa6',
    },
    {
        key: 'vibrant-play',
        name: 'Vibrant Play',
        description: 'Violeta vivo creativo y moderno',
        primaryColor: '#7c2dbd',
        bgColor: '#fdf5ff',
        accentColor: '#d946ef',
    },
];

@Component({
    selector: 'app-store-theme',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Configuración de Temas</h1>
                <p class="page-subtitle">Gestiona el aspecto visual de cada módulo de forma independiente</p>
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
                    <h3 class="card-title">Tema Activo — {{ moduleLabel(activeModule()) }}</h3>
                    @if (currentModuleTheme()!.isSeasonalActive) {
                        <span class="badge badge-accent">Estacional — {{ currentModuleTheme()!.seasonalName }}</span>
                    } @else {
                        <span class="badge badge-neutral">Manual</span>
                    }
                </div>
                <div class="card-body" style="padding: var(--space-md)">
                    <p style="font-size: 0.875rem; color: var(--color-text-muted)">
                        Tema actual: <strong style="color: var(--color-text-primary)">{{ currentModuleTheme()!.themeKey }}</strong>
                    </p>
                </div>
            </div>
        }

        <!-- Selector de temas -->
        <div class="card mb-4">
            <div class="card-header">
                <h3 class="card-title">Temas Disponibles</h3>
                <span class="badge badge-neutral">{{ themes.length }} temas</span>
            </div>
            <div class="card-body" style="padding: var(--space-md)">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem">
                    @for (theme of themes; track theme.key) {
                        <div
                            style="border-radius: 12px; overflow: hidden; transition: border 0.2s"
                            [style.border]="currentModuleTheme()?.themeKey === theme.key ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'"
                        >
                            <!-- Vista previa -->
                            <div
                                style="height: 80px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px"
                                [style.background-color]="theme.bgColor"
                            >
                                <div style="width: 24px; height: 24px; border-radius: 50%" [style.background-color]="theme.primaryColor"></div>
                                <div style="width: 24px; height: 24px; border-radius: 50%" [style.background-color]="theme.accentColor"></div>
                                <div style="width: 24px; height: 24px; border-radius: 50%; opacity: 0.5" [style.background-color]="theme.primaryColor"></div>
                            </div>

                            <!-- Info y botón -->
                            <div style="padding: 12px; background-color: var(--color-surface-raised)">
                                <p style="font-weight: 600; font-size: 0.875rem; color: var(--color-text-primary); margin: 0 0 4px">{{ theme.name }}</p>
                                <p style="font-size: 0.75rem; color: var(--color-text-muted); margin: 0 0 10px">{{ theme.description }}</p>
                                @if (currentModuleTheme()?.themeKey === theme.key) {
                                    <span class="badge badge-success" style="width: 100%; justify-content: center">Activo</span>
                                } @else {
                                    <button
                                        class="btn btn-secondary"
                                        style="width: 100%; font-size: 0.75rem; padding: 6px 12px"
                                        [disabled]="!!guardando()"
                                        (click)="activarTema(theme.key)"
                                    >
                                        {{ guardando() === theme.key ? 'Activando...' : 'Activar' }}
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

    readonly themes    = AVAILABLE_THEMES;
    readonly modules: ThemeModule[] = ['shop', 'admin', 'pos'];

    readonly activeModule     = signal<ThemeModule>('shop');
    readonly themesPerModule  = signal<Partial<Record<ThemeModule, ActiveThemeResponse>>>({});
    readonly temaEstacional   = signal<SeasonalTheme[]>([]);
    readonly guardando        = signal<string | null>(null);
    readonly cargandoEstacionales = signal(false);
    readonly error            = signal<string | null>(null);

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
        return AVAILABLE_THEMES.find(t => t.key === key)?.primaryColor ?? 'var(--color-primary)';
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
                    this.themeService.setTheme(themeKey as Parameters<ThemeService['setTheme']>[0], mod);
                    this.guardando.set(null);
                },
                error: () => this.guardando.set(null),
            });
    }
}
