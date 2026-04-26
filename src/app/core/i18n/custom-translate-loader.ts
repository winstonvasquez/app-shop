import { inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Custom HTTP loader for translations
 * Loads JSON files safely bypassing interceptors
 */
export class CustomTranslateLoader implements TranslateLoader {
    private http: HttpClient;

    // Handler passed to constructor

    constructor(handler: HttpBackend) {
        this.http = new HttpClient(handler);
    }

    getTranslation(lang: string): Observable<TranslationObject> {
        // Deep aggressive cache buster using Math.random and timestamp
        const cacheBuster = new Date().getTime() + '_' + Math.random().toString(36).substring(7);

        // Force browsers to not cache via headers
        const headers = new HttpHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        return this.http.get<TranslationObject>(`/assets/i18n/${lang}.json?cb=${cacheBuster}`, { headers }).pipe(
            catchError(error => {
                console.error(`[TranslateLoader] Failed to load ${lang}.json:`, error);
                return of({});
            })
        );
    }
}

/**
 * Factory function to create custom loader
 */
export function HttpLoaderFactory(handler: HttpBackend): TranslateLoader {
    return new CustomTranslateLoader(handler);
}
