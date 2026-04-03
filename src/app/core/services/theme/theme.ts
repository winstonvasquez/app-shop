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

const DEFAULT_THEMES: Record<ThemeContext, AppTheme> = {
    shop:  'fresh-mint',
    admin: 'dark',
    pos:   'dark',
};

export type AppTheme =
    | 'dark'
    | 'obsidian'
    | 'orange-black'
    | 'orange-light'
    | 'verano'
    | 'invierno'
    | 'primavera'
    | 'otoño'
    | 'christmas'
    | 'black-friday'
    | 'summer'
    // Temas profesionales
    | 'slate-professional'
    | 'obsidian-dark'
    | 'arctic-light'
    | 'ember'
    | 'forest'
    | 'graphite-contrast'
    | 'rose-executive'
    // Temas claros profesionales
    | 'sakura-light'
    | 'ocean-breeze'
    | 'verdant-light'
    | 'golden-sand'
    | 'lavender-mist'
    | 'charcoal-light'
    // Temas claros tienda
    | 'fresh-mint'
    | 'soft-blossom'
    | 'golden-light'
    | 'peach-cream'
    | 'nordic-light'
    | 'vibrant-play';

interface ActiveThemeResponse {
    themeKey: string;
    isSeasonalActive: boolean;
    seasonalName: string;
}

const VALID_THEMES: AppTheme[] = [
    'dark', 'obsidian', 'orange-black', 'orange-light',
    'verano', 'invierno', 'primavera', 'otoño',
    'christmas', 'black-friday', 'summer',
    // Temas profesionales
    'slate-professional', 'obsidian-dark', 'arctic-light',
    'ember', 'forest', 'graphite-contrast', 'rose-executive',
    // Temas claros profesionales
    'sakura-light', 'ocean-breeze', 'verdant-light',
    'golden-sand', 'lavender-mist', 'charcoal-light',
    // Temas claros tienda
    'fresh-mint', 'soft-blossom', 'golden-light',
    'peach-cream', 'nordic-light', 'vibrant-play',
];

/** Metadatos de los temas disponibles para la UI de selección de temas. */
export interface ThemeMetadata {
    id: AppTheme;
    name: string;
    mode: 'dark' | 'light';
    category: 'default' | 'seasonal' | 'professional';
    primaryColor: string;
}

export const AVAILABLE_THEMES: ThemeMetadata[] = [
    // Default
    { id: 'dark',               name: 'Oscuro',               mode: 'dark',  category: 'default',      primaryColor: '#d7132a' },
    { id: 'obsidian',           name: 'Obsidian',             mode: 'dark',  category: 'default',      primaryColor: '#E8152D' },
    { id: 'orange-black',       name: 'Naranja Oscuro',       mode: 'dark',  category: 'default',      primaryColor: '#ff7e0d' },
    { id: 'orange-light',       name: 'Naranja Claro',        mode: 'light', category: 'default',      primaryColor: '#f36203' },
    // Estacionales
    { id: 'verano',             name: 'Verano',               mode: 'light', category: 'seasonal',     primaryColor: '#c25535' },
    { id: 'invierno',           name: 'Invierno',             mode: 'dark',  category: 'seasonal',     primaryColor: '#4a8fd4' },
    { id: 'primavera',          name: 'Primavera',            mode: 'light', category: 'seasonal',     primaryColor: '#2c7e4a' },
    { id: 'otoño',              name: 'Otoño',                mode: 'light', category: 'seasonal',     primaryColor: '#a87020' },
    { id: 'christmas',          name: 'Navidad',              mode: 'dark',  category: 'seasonal',     primaryColor: '#cc0000' },
    { id: 'black-friday',       name: 'Black Friday',         mode: 'dark',  category: 'seasonal',     primaryColor: '#ffcc00' },
    { id: 'summer',             name: 'Summer',               mode: 'light', category: 'seasonal',     primaryColor: '#f59e0b' },
    // Profesionales
    { id: 'slate-professional', name: 'Slate Profesional',    mode: 'dark',  category: 'professional', primaryColor: '#6366f1' },
    { id: 'obsidian-dark',      name: 'Obsidian Dark',        mode: 'dark',  category: 'professional', primaryColor: '#7c3aed' },
    { id: 'arctic-light',       name: 'Ártico Claro',         mode: 'light', category: 'professional', primaryColor: '#0ea5e9' },
    { id: 'ember',              name: 'Ember',                mode: 'dark',  category: 'professional', primaryColor: '#ea580c' },
    { id: 'forest',             name: 'Forest',               mode: 'dark',  category: 'professional', primaryColor: '#10b981' },
    { id: 'graphite-contrast',  name: 'Grafito Contraste',    mode: 'dark',  category: 'professional', primaryColor: '#facc15' },
    { id: 'rose-executive',     name: 'Rose Ejecutivo',       mode: 'dark',  category: 'professional', primaryColor: '#e11d48' },
    { id: 'sakura-light',       name: 'Sakura',               mode: 'light', category: 'professional', primaryColor: '#be185d' },
    { id: 'ocean-breeze',       name: 'Brisa Marina',         mode: 'light', category: 'professional', primaryColor: '#0369a1' },
    { id: 'verdant-light',      name: 'Verdant',              mode: 'light', category: 'professional', primaryColor: '#15803d' },
    { id: 'golden-sand',        name: 'Arena Dorada',         mode: 'light', category: 'professional', primaryColor: '#92400e' },
    { id: 'lavender-mist',      name: 'Niebla Lavanda',       mode: 'light', category: 'professional', primaryColor: '#6d28d9' },
    { id: 'charcoal-light',     name: 'Carbón Claro',         mode: 'light', category: 'professional', primaryColor: '#1f2937' },
    // Tienda
    { id: 'fresh-mint',         name: 'Fresh Mint',           mode: 'light', category: 'default',      primaryColor: '#1a9e5c' },
    { id: 'soft-blossom',       name: 'Soft Blossom',         mode: 'light', category: 'default',      primaryColor: '#c4456a' },
    { id: 'golden-light',       name: 'Golden Light',         mode: 'light', category: 'default',      primaryColor: '#b8860b' },
    { id: 'peach-cream',        name: 'Peach Cream',          mode: 'light', category: 'default',      primaryColor: '#c4561e' },
    { id: 'nordic-light',       name: 'Nordic Light',         mode: 'light', category: 'default',      primaryColor: '#2e4a6e' },
    { id: 'vibrant-play',       name: 'Vibrant Play',         mode: 'light', category: 'default',      primaryColor: '#7c2dbd' },
];

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);

    // ── Señales por contexto ─────────────────────────────────
    public readonly shopTheme  = signal<AppTheme>(DEFAULT_THEMES.shop);
    public readonly adminTheme = signal<AppTheme>(DEFAULT_THEMES.admin);
    public readonly posTheme   = signal<AppTheme>(DEFAULT_THEMES.pos);

    private readonly activeContext = signal<ThemeContext>('shop');

    /** Tema activo del contexto actual — compatible con el uso anterior. */
    public readonly currentTheme = computed<AppTheme>(() => {
        switch (this.activeContext()) {
            case 'admin': return this.adminTheme();
            case 'pos':   return this.posTheme();
            default:      return this.shopTheme();
        }
    });

    constructor() {
        this.initThemes();

        // Aplica al documento cuando cambia el tema del contexto activo.
        effect(() => {
            const theme = this.currentTheme();
            if (isPlatformBrowser(this.platformId)) {
                this.applyThemeToDocument(theme);
            }
        });

        // Persiste cada contexto en localStorage cuando cambia.
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.shop,  this.shopTheme());
            }
        });
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.admin, this.adminTheme());
            }
        });
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(THEME_KEYS.pos,   this.posTheme());
            }
        });

        this.loadThemeFromServer();
    }

    /**
     * Inicializa los 3 contextos desde localStorage (sincrónico — evita parpadeo).
     */
    private initThemes(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        (['shop', 'admin', 'pos'] as ThemeContext[]).forEach(ctx => {
            const saved  = localStorage.getItem(THEME_KEYS[ctx]) as AppTheme | null;
            const theme  = VALID_THEMES.includes(saved as AppTheme) ? (saved as AppTheme) : DEFAULT_THEMES[ctx];
            this.setTheme(theme, ctx);
        });

        // Aplica inmediatamente el tema del contexto inicial (shop).
        this.applyThemeToDocument(this.shopTheme());
    }

    /**
     * Establece el contexto activo. Llamar desde cada layout (admin, shop, pos).
     * El efecto principal re-ejecuta y aplica el tema del nuevo contexto.
     */
    public setContext(ctx: ThemeContext): void {
        this.activeContext.set(ctx);
    }

    public getContext(): ThemeContext {
        return this.activeContext();
    }

    /**
     * Cambia el tema de un contexto dado (o del contexto activo si se omite).
     */
    public setTheme(theme: AppTheme, ctx?: ThemeContext): void {
        const target = ctx ?? this.activeContext();
        switch (target) {
            case 'shop':  this.shopTheme.set(theme);  break;
            case 'admin': this.adminTheme.set(theme); break;
            case 'pos':   this.posTheme.set(theme);   break;
        }
        if (this.authService.isAuthenticated()) {
            this.saveThemeToServer(theme, target);
        }
    }

    /**
     * Persiste la preferencia de tema del usuario autenticado en el servidor.
     * Fallo silencioso — el tema local ya está aplicado.
     */
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

    /**
     * Carga los temas de todos los módulos desde el servidor (shop, admin, pos).
     * Se llama una sola vez al inicializar el servicio (singleton). Sin bloqueo —
     * la UI ya tiene el tema de localStorage; este método solo sincroniza si cambió.
     */
    public loadThemeFromServer(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const base = environment.apiUrls.users;
        (['shop', 'admin', 'pos'] as ThemeContext[]).forEach(ctx => {
            this.http
                .get<ActiveThemeResponse>(`${base}/api/themes/active?module=${ctx}`)
                .pipe(catchError(() => of(null)))
                .subscribe((response) => {
                    if (!response) return;
                    const serverTheme = response.themeKey as AppTheme;
                    if (VALID_THEMES.includes(serverTheme) && serverTheme !== this[`${ctx}Theme`]()) {
                        this.setTheme(serverTheme, ctx);
                    }
                });
        });
    }

    private applyThemeToDocument(theme: AppTheme): void {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }
    }
}
