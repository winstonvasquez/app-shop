import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface TiendaPaginaDto {
    slug: string;
    titulo: string;
    contenido: string;
}

@Injectable({ providedIn: 'root' })
export class StoreConfigService {
    private http = inject(HttpClient);
    private translate = inject(TranslateService);

    private configSignal = signal<Record<string, string>>({});

    // ── Store identity ─────────────────────────────────────────────────────
    storeName    = computed(() => this.get('STORE_NAME', 'Temo Store'));
    storePhone   = computed(() => this.get('STORE_PHONE', ''));
    storeEmail   = computed(() => this.get('STORE_EMAIL', ''));
    storeAddress = computed(() => this.get('STORE_ADDRESS', ''));
    storeSlogan  = computed(() => this.get('STORE_SLOGAN', ''));

    // ── Mobile apps ────────────────────────────────────────────────────────
    appStoreUrl  = computed(() => this.get('APP_STORE_URL', ''));
    playStoreUrl = computed(() => this.get('PLAY_STORE_URL', ''));

    // ── Social networks ────────────────────────────────────────────────────
    facebookUrl  = computed(() => this.get('SOCIAL_FACEBOOK', ''));
    instagramUrl = computed(() => this.get('SOCIAL_INSTAGRAM', ''));
    twitterUrl   = computed(() => this.get('SOCIAL_TWITTER', ''));

    // ── Header bar labels ──────────────────────────────────────────────────
    freeShippingLabel        = computed(() => this.get('HEADER_FREE_SHIPPING', ''));
    guaranteedDeliveryLabel  = computed(() => this.get('HEADER_GUARANTEED_DELIVERY', ''));
    downloadAppLabel         = computed(() => this.get('HEADER_DOWNLOAD_APP', ''));

    // ── Footer section titles ──────────────────────────────────────────────
    footerCompanyTitle      = computed(() => this.get('FOOTER_COMPANY_TITLE', ''));
    footerHelpTitle         = computed(() => this.get('FOOTER_HELP_TITLE', ''));
    footerLegalTitle        = computed(() => this.get('FOOTER_LEGAL_TITLE', ''));
    footerAppTitle          = computed(() => this.get('FOOTER_APP_TITLE', ''));
    footerShopAnywhereLabel = computed(() => this.get('FOOTER_SHOP_ANYWHERE', ''));
    footerGetItOnLabel      = computed(() => this.get('FOOTER_GET_IT_ON', ''));
    footerAvailableOnLabel  = computed(() => this.get('FOOTER_AVAILABLE_ON', ''));
    footerAllRightsLabel    = computed(() => this.get('FOOTER_ALL_RIGHTS', ''));
    footerPrivacyLabel      = computed(() => this.get('FOOTER_PRIVACY', ''));
    footerTermsLabel        = computed(() => this.get('FOOTER_TERMS', ''));

    // ── Footer link arrays (stored as JSON in DB) ──────────────────────────
    footerCompanyLinks = computed(() => this.parseLinks('FOOTER_COMPANY_LINKS'));
    footerHelpLinks    = computed(() => this.parseLinks('FOOTER_HELP_LINKS'));
    footerLegalLinks   = computed(() => this.parseLinks('FOOTER_LEGAL_LINKS'));

    constructor() {
        // Reload config whenever the user switches language at runtime
        this.translate.onLangChange.subscribe(event => {
            this.loadConfig(event.lang).subscribe();
        });
    }

    /** Load all store config keys for a given locale from the backend. */
    loadConfig(locale: string): Observable<Record<string, string>> {
        const url = `${environment.apiUrls.sales}/api/ventas/tienda/config?locale=${locale}`;
        return this.http.get<Record<string, string>>(url).pipe(
            tap(cfg => this.configSignal.set(cfg)),
            catchError(err => {
                console.error('[StoreConfigService] Error loading config', err);
                return of({});
            })
        );
    }

    /** Fetch a single info page by slug and locale. Returns null if not found. */
    getPageContent(slug: string, locale: string): Observable<TiendaPaginaDto | null> {
        const url = `${environment.apiUrls.sales}/api/ventas/tienda/paginas/${slug}?locale=${locale}`;
        return this.http.get<TiendaPaginaDto>(url).pipe(
            catchError(() => of(null))
        );
    }

    /** Read a config key with an optional default. */
    get(key: string, defaultValue = ''): string {
        return this.configSignal()[key] ?? defaultValue;
    }

    private parseLinks(key: string): { label: string; url: string }[] {
        try {
            const raw = this.get(key);
            if (!raw) return [];
            return JSON.parse(raw) as { label: string; url: string }[];
        } catch {
            return [];
        }
    }
}
