import { Injectable, signal, inject, effect } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Language {
    code: string;
    name: string;
    flag: string;
}

/**
 * Manages application language with Angular Signals.
 *
 * Translation loading is done ONCE via initializeTranslations() which is
 * called by APP_INITIALIZER — this blocks Angular bootstrap until the
 * JSON file is fully loaded, preventing raw-key flash.
 */
@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private readonly STORAGE_KEY = 'app-language';
    private readonly DEFAULT_LANGUAGE = 'es';

    private translate = inject(TranslateService);

    /** Current active language (reactive signal) */
    currentLanguage = signal<string>(this.DEFAULT_LANGUAGE);

    /** Available languages with metadata */
    readonly availableLanguages: Language[] = [
        { code: 'es', name: 'Español', flag: '🇵🇪' },
        { code: 'en', name: 'English', flag: '🇺🇸' }
    ];

    constructor() {
        // Auto-save language changes to localStorage
        effect(() => {
            const lang = this.currentLanguage();
            localStorage.setItem(this.STORAGE_KEY, lang);
        });
    }

    /**
     * Called by APP_INITIALIZER — returns an Observable that completes
     * only when the active language JSON file is fully loaded.
     * Angular awaits this (via lastValueFrom) before rendering any component.
     */
    initializeTranslations(): Observable<unknown> {
        const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
        const languageToUse = savedLanguage || this.DEFAULT_LANGUAGE;
        const isSupported = this.availableLanguages.some(lang => lang.code === languageToUse);
        const finalLanguage = isSupported ? languageToUse : this.DEFAULT_LANGUAGE;

        // Update signal and use the language (async — APP_INITIALIZER awaits completion)
        this.currentLanguage.set(finalLanguage);
        return this.translate.use(finalLanguage).pipe(
            tap((res: any) => console.log('initializeTranslations use completion:', res))
        );
    }

    /** Change application language at runtime */
    setLanguage(languageCode: string): void {
        const isSupported = this.availableLanguages.some(lang => lang.code === languageCode);
        if (!isSupported) {
            console.warn(`Language '${languageCode}' is not supported. Using default.`);
            return;
        }
        this.translate.use(languageCode);
        this.currentLanguage.set(languageCode);
    }

    /** Get current language metadata */
    getCurrentLanguageData(): Language | undefined {
        return this.availableLanguages.find(lang => lang.code === this.currentLanguage());
    }

    /** Get instant translation (only call after translations are loaded) */
    instant(key: string, params?: object): string {
        return this.translate.instant(key, params);
    }
}
