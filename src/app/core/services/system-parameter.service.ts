import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

export interface SystemParameters {
    [key: string]: string;
}

@Injectable({
    providedIn: 'root'
})
export class SystemParameterService {
    private http = inject(HttpClient);

    // State signal to hold parameters
    private parametersSignal = signal<SystemParameters>({});

    // State exposing properties
    public readonly parameters = this.parametersSignal.asReadonly();

    // Useful semantic computed signals for common params
    public storeName = computed(() => this.get('STORE_NAME', 'Temo Store'));
    public storeCurrency = computed(() => this.get('STORE_CURRENCY', 'USD'));
    public storeCountry = computed(() => this.get('STORE_COUNTRY', 'US'));
    public erpName = computed(() => this.get('ERP_NAME', 'MicroShop ERP'));
    public defaultLanguage = computed(() => this.get('DEFAULT_LANGUAGE', 'en'));
    public defaultTax = computed(() => {
        const tax = this.get('DEFAULT_TAX', '0');
        return parseFloat(tax);
    });
    public posEnabled = computed(() => this.get('POS_ENABLED', 'true') === 'true');
    public ecommerceEnabled = computed(() => this.get('ECOMMERCE_ENABLED', 'true') === 'true');

    // Tienda online — contacto y ubicación
    public contactEmail   = computed(() => this.get('CONTACT_EMAIL', ''));
    public contactPhone   = computed(() => this.get('CONTACT_PHONE', ''));
    public storeAddress   = computed(() => this.get('STORE_ADDRESS', ''));
    public storeSlogan    = computed(() => this.get('STORE_SLOGAN', ''));

    // Tienda online — apps móviles
    public appStoreUrl  = computed(() => this.get('APP_STORE_URL', '#'));
    public playStoreUrl = computed(() => this.get('PLAY_STORE_URL', '#'));

    // Tienda online — redes sociales
    public facebookUrl  = computed(() => this.get('SOCIAL_FACEBOOK', '#'));
    public instagramUrl = computed(() => this.get('SOCIAL_INSTAGRAM', '#'));
    public twitterUrl   = computed(() => this.get('SOCIAL_TWITTER', '#'));

    // Envíos
    public freeShippingMin = computed(() => {
        const v = this.get('FREE_SHIPPING_MIN', '0');
        return parseFloat(v);
    });

    // Parámetros financieros peruanos
    public igvRate = computed(() => parseFloat(this.get('IGV_RATE', '0.18')));
    public uitAnio = computed(() => parseFloat(this.get('UIT_ANIO', '5150')));
    public serieBoletaDefault = computed(() => this.get('SERIE_BOLETA', 'B001'));
    public serieFacturaDefault = computed(() => this.get('SERIE_FACTURA', 'F001'));
    public rmv = computed(() => parseFloat(this.get('RMV', '1025')));

    /**
     * Loads parameters from the backend. Typically called at AppInit.
     */
    public loadParameters(): Observable<SystemParameters> {
        const url = `${environment.apiUrls.users}/api/system/parameters`;

        return this.http.get<SystemParameters>(url).pipe(
            tap(params => this.parametersSignal.set(params)),
            catchError(error => {
                console.error('[SystemParameterService] Error loading parameters, using defaults.', error);
                return of({});
            })
        );
    }

    /**
     * Retrieves a given parameter by key, defaulting to the provided fallback value if not found
     */
    public get(key: string, defaultValue: string = ''): string {
        const currentParams = this.parametersSignal();
        return currentParams[key] !== undefined ? currentParams[key] : defaultValue;
    }
}
