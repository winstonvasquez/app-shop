import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';

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
    | 'charcoal-light';

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
];

/** Metadatos de los temas disponibles para la UI de selección de temas. */
export interface ThemeMetadata {
    id: AppTheme;
    name: string;
    mode: 'dark' | 'light';
    category: 'default' | 'seasonal' | 'professional';
}

export const AVAILABLE_THEMES: ThemeMetadata[] = [
    // Default
    { id: 'dark',               name: 'Oscuro',               mode: 'dark',  category: 'default' },
    { id: 'obsidian',           name: 'Obsidian',             mode: 'dark',  category: 'default' },
    { id: 'orange-black',       name: 'Naranja Oscuro',       mode: 'dark',  category: 'default' },
    { id: 'orange-light',       name: 'Naranja Claro',        mode: 'light', category: 'default' },
    // Estacionales
    { id: 'verano',             name: 'Verano',               mode: 'light', category: 'seasonal' },
    { id: 'invierno',           name: 'Invierno',             mode: 'dark',  category: 'seasonal' },
    { id: 'primavera',          name: 'Primavera',            mode: 'light', category: 'seasonal' },
    { id: 'otoño',              name: 'Otoño',                mode: 'light', category: 'seasonal' },
    { id: 'christmas',          name: 'Navidad',              mode: 'dark',  category: 'seasonal' },
    { id: 'black-friday',       name: 'Black Friday',         mode: 'dark',  category: 'seasonal' },
    { id: 'summer',             name: 'Summer',               mode: 'light', category: 'seasonal' },
    // Profesionales
    { id: 'slate-professional', name: 'Slate Profesional',    mode: 'dark',  category: 'professional' },
    { id: 'obsidian-dark',      name: 'Obsidian Dark',        mode: 'dark',  category: 'professional' },
    { id: 'arctic-light',       name: 'Ártico Claro',         mode: 'light', category: 'professional' },
    { id: 'ember',              name: 'Ember',                mode: 'dark',  category: 'professional' },
    { id: 'forest',             name: 'Forest',               mode: 'dark',  category: 'professional' },
    { id: 'graphite-contrast',  name: 'Grafito Contraste',    mode: 'dark',  category: 'professional' },
    { id: 'rose-executive',     name: 'Rose Ejecutivo',       mode: 'dark',  category: 'professional' },
    { id: 'sakura-light',       name: 'Sakura',               mode: 'light', category: 'professional' },
    { id: 'ocean-breeze',       name: 'Brisa Marina',         mode: 'light', category: 'professional' },
    { id: 'verdant-light',      name: 'Verdant',              mode: 'light', category: 'professional' },
    { id: 'golden-sand',        name: 'Arena Dorada',         mode: 'light', category: 'professional' },
    { id: 'lavender-mist',      name: 'Niebla Lavanda',       mode: 'light', category: 'professional' },
    { id: 'charcoal-light',     name: 'Carbón Claro',         mode: 'light', category: 'professional' },
];

/** Clave de localStorage para el tema de la tienda pública (separado del admin). */
const SHOP_THEME_KEY = 'shop_theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly http = inject(HttpClient);

    public currentTheme = signal<AppTheme>('dark');

    constructor() {
        this.initTheme();

        // Aplica el tema al documento y persiste en localStorage cada vez que cambia la señal.
        effect(() => {
            const theme = this.currentTheme();
            if (isPlatformBrowser(this.platformId)) {
                this.applyThemeToDocument(theme);
                localStorage.setItem(SHOP_THEME_KEY, theme);
            }
        });

        // Carga el tema desde el servidor de forma asíncrona (sin bloquear el bootstrap).
        this.loadThemeFromServer();
    }

    /** Inicializa el tema desde localStorage (sincrónico — evita parpadeo). */
    private initTheme(): void {
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem(SHOP_THEME_KEY) as AppTheme | null;
            const theme = VALID_THEMES.includes(saved as AppTheme) ? (saved as AppTheme) : 'dark';
            this.currentTheme.set(theme);
            this.applyThemeToDocument(theme);
        }
    }

    /**
     * Consulta GET /api/themes/active en el backend y aplica el tema si difiere
     * del actual. Si el request falla se mantiene el valor de localStorage o 'dark'.
     */
    public loadThemeFromServer(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const url = `${environment.apiUrls.users}/api/themes/active`;
        this.http
            .get<ActiveThemeResponse>(url)
            .pipe(catchError(() => of(null)))
            .subscribe((response) => {
                if (!response) return;

                const serverTheme = response.themeKey as AppTheme;
                if (VALID_THEMES.includes(serverTheme) && serverTheme !== this.currentTheme()) {
                    this.currentTheme.set(serverTheme);
                }
            });
    }

    public setTheme(theme: AppTheme): void {
        this.currentTheme.set(theme);
    }

    public toggleTheme(): void {
        const current = this.currentTheme();
        if (current === 'dark') {
            this.setTheme('orange-black');
        } else if (current === 'orange-black') {
            this.setTheme('orange-light');
        } else {
            this.setTheme('dark');
        }
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
