import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModuleConfig } from '@ngx-translate/core';

/**
 * Configuration for TranslateModule
 * - Default language: Spanish (es)
 * - Loader: HTTP loader for JSON files from /assets/i18n/{lang}.json
 */
export const TRANSLATE_CONFIG: TranslateModuleConfig = {
    fallbackLang: 'es',
    loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json'
    })
};
