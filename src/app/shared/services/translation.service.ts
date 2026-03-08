import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom } from 'rxjs';
import { APP_CONFIG, STORAGE_KEYS } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly translateService = inject(TranslateService);
  private readonly _currentLanguage = signal<string>(APP_CONFIG.defaultLanguage);
  
  readonly currentLanguage = this._currentLanguage.asReadonly();
  readonly supportedLanguages = APP_CONFIG.supportedLanguages;

  constructor() {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language);
    const browserLanguage = navigator.language.split('-')[0] as string;
    
    const language = savedLanguage || 
      (this.supportedLanguages.includes(browserLanguage as 'es' | 'en') ? browserLanguage : APP_CONFIG.defaultLanguage);
    
    this.setLanguage(language);
  }

  setLanguage(language: string): void {
    const validLanguage = this.supportedLanguages.includes(language as 'es' | 'en') 
      ? (language as 'es' | 'en') 
      : APP_CONFIG.defaultLanguage;

    if (language !== validLanguage) {
      console.warn(`Language ${language} not supported. Using ${validLanguage}.`);
    }

    this.translateService.use(validLanguage);
    this._currentLanguage.set(validLanguage);
    localStorage.setItem(STORAGE_KEYS.language, validLanguage);
    document.documentElement.lang = validLanguage;
  }

  translate(key: string, params?: Record<string, unknown>): Observable<string> {
    return this.translateService.get(key, params);
  }

  async translateAsync(key: string, params?: Record<string, unknown>): Promise<string> {
    return firstValueFrom(this.translate(key, params));
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translateService.instant(key, params);
  }

  translateMultiple(keys: string[]): Observable<Record<string, string>> {
    return this.translateService.get(keys);
  }

  async translateMultipleAsync(keys: string[]): Promise<Record<string, string>> {
    return firstValueFrom(this.translateMultiple(keys));
  }

  toggleLanguage(): void {
    const currentIndex = this.supportedLanguages.indexOf(this._currentLanguage() as 'es' | 'en');
    const nextIndex = (currentIndex + 1) % this.supportedLanguages.length;
    this.setLanguage(this.supportedLanguages[nextIndex]);
  }

  getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'es': 'Español',
      'en': 'English',
    };
    return names[code] || code;
  }
}
