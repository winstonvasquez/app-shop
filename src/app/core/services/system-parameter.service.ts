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

    /**
     * Loads parameters from the backend. Typically called at AppInit.
     */
    public loadParameters(): Observable<SystemParameters> {
        const url = `${environment.apiUrls.users}/api/system/parameters`;

        return this.http.get<SystemParameters>(url).pipe(
            tap(params => {
                this.parametersSignal.set(params);
                console.log('[SystemParameterService] Parameters loaded:', params);
            }),
            catchError(error => {
                console.error('[SystemParameterService] Error loading parameters, using defaults.', error);
                return of({}); // default empty params
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
