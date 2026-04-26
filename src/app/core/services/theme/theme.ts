import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';

export type ThemeContext = 'shop' | 'admin' | 'pos';

const THEME_KEYS: Record<ThemeContext, string> = {
    shop:  'shop_theme',
    admin: 'admin_theme',
    pos:   'pos_theme',
};

/**
 * Único sistema de diseño activo: CONFIANZA.
 * 3 variantes que comparten tokens estructurales pero divergen en color/superficie.
 */
export type AppTheme =
    | 'confianza'        // Storefront — tienda pública (default shop)
    | 'confianza-dark'   // Storefront — modo oscuro opt-in
    | 'confianza-erp';   // ERP/Admin/POS — sibling del storefront

const VALID_THEMES: AppTheme[] = ['confianza', 'confianza-dark', 'confianza-erp'];

const DEFAULT_THEMES: Record<ThemeContext, AppTheme> = {
    shop:  'confianza',
    admin: 'confianza-erp',
    pos:   'confianza-erp',
};

interface ActiveThemeResponse {
    themeKey: string;
    isSeasonalActive: boolean;
    seasonalName: string;
}

/** Metadatos de los temas disponibles para la UI de selección de temas. */
export interface ThemeMetadata {
    id: AppTheme;
    name: string;
    mode: 'dark' | 'light';
    category: 'storefront' | 'erp';
    primaryColor: string;
    description: string;
}

export const AVAILABLE_THEMES: ThemeMetadata[] = [
    {
        id: 'confianza',
        name: 'Confianza',
        mode: 'light',
        category: 'storefront',
        primaryColor: '#0B3D91',
        description: 'Tienda pública — azul tinta + naranja CTA, neutros cálidos',
    },
    {
        id: 'confianza-dark',
        name: 'Confianza Oscuro',
        mode: 'dark',
        category: 'storefront',
        primaryColor: '#5A8DEE',
        description: 'Tienda — modo oscuro confortable',
    },
    {
        id: 'confianza-erp',
        name: 'Confianza ERP',
        mode: 'light',
        category: 'erp',
        primaryColor: '#0B3D91',
        description: 'ERP / Admin / POS — sibling profesional',
    },
];

/** Mapea cualquier tema legacy guardado al equivalente Confianza. */
function migrateLegacyTheme(saved: string | null, ctx: ThemeContext): AppTheme {
    if (!saved) return DEFAULT_THEMES[ctx];
    if (VALID_THEMES.includes(saved as AppTheme)) return saved as AppTheme;
    // Cualquier tema antiguo (orange-*, obsidian, fresh-mint, navy, ...) →
    // colapsa al default Confianza del contexto.
    return DEFAULT_THEMES[ctx];
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);

    // Evita PUTs durante initThemes()
    private initializing = true;

    public readonly shopTheme  = signal<AppTheme>(DEFAULT_THEMES.shop);
    public readonly adminTheme = signal<AppTheme>(DEFAULT_THEMES.admin);
    public readonly posTheme   = signal<AppTheme>(DEFAULT_THEMES.pos);

    private readonly activeContext = signal<ThemeContext>('shop');

    /** Tema activo del contexto actual. */
    public readonly currentTheme = computed<AppTheme>(() => {
        switch (this.activeContext()) {
            case 'admin': return this.adminTheme();
            case 'pos':   return this.posTheme();
            default:      return this.shopTheme();
        }
    });

    constructor() {
        this.initThemes();
        this.initializing = false;

        effect(() => {
            const theme = this.currentTheme();
            if (isPlatformBrowser(this.platformId)) {
                this.applyThemeToDocument(theme);
            }
        });

        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.shop, this.shopTheme());
            }
        });
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.admin, this.adminTheme());
            }
        });
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.pos, this.posTheme());
            }
        });

        this.loadThemeFromServer();
    }

    private initThemes(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        (['shop', 'admin', 'pos'] as ThemeContext[]).forEach(ctx => {
            const saved = localStorage.getItem(THEME_KEYS[ctx]);
            this.setTheme(migrateLegacyTheme(saved, ctx), ctx);
        });

        this.applyThemeToDocument(this.shopTheme());
    }

    public setContext(ctx: ThemeContext): void {
        this.activeContext.set(ctx);
    }

    public getContext(): ThemeContext {
        return this.activeContext();
    }

    public getTheme(ctx: ThemeContext): AppTheme {
        switch (ctx) {
            case 'admin': return this.adminTheme();
            case 'pos':   return this.posTheme();
            default:      return this.shopTheme();
        }
    }

    public setTheme(theme: AppTheme, ctx?: ThemeContext): void {
        const target = ctx ?? this.activeContext();
        switch (target) {
            case 'shop':  this.shopTheme.set(theme);  break;
            case 'admin': this.adminTheme.set(theme); break;
            case 'pos':   this.posTheme.set(theme);   break;
        }
        if (!this.initializing && this.authService.isAuthenticated()) {
            this.saveThemeToServer(theme, target);
        }
    }

    private saveThemeToServer(theme: AppTheme, ctx: ThemeContext): void {
        const user = this.authService.currentUser();
        if (!user) return;
        const body = {
            themeKey: theme,
            module: ctx,
            companyId: String(user.activeCompanyId ?? 0),
        };
        this.http.put<void>(`${environment.apiUrls.users}/api/themes/active`, body)
            .pipe(catchError(() => of(null)))
            .subscribe();
    }

    public loadThemeFromServer(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const base = environment.apiUrls.users;
        (['shop', 'admin', 'pos'] as ThemeContext[]).forEach(ctx => {
            this.http
                .get<ActiveThemeResponse>(`${base}/api/themes/active?module=${ctx}`)
                .pipe(catchError(() => of(null)))
                .subscribe((response) => {
                    if (!response) return;
                    const migrated = migrateLegacyTheme(response.themeKey, ctx);
                    if (migrated !== this.getTheme(ctx)) {
                        this.setTheme(migrated, ctx);
                    }
                });
        });
    }

    private applyThemeToDocument(theme: AppTheme): void {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Clase global "dark" para librerías third-party (Tailwind dark: variant, charts, etc.)
        if (theme === 'confianza-dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
}
