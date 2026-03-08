import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@core/i18n/language.service';

/**
 * Language Selector Component
 * - Displays current language flag
 * - Shows dropdown with available languages
 * - Handles language switching
 * - Click outside to close dropdown
 */
@Component({
    selector: 'app-language-selector',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './language-selector.component.html'
})
export class LanguageSelectorComponent {
    private languageService = inject(LanguageService);

    /**
     * Dropdown open/close state
     */
    isOpen = signal(false);

    /**
     * Available languages from service
     */
    get languages() {
        return this.languageService.availableLanguages;
    }

    /**
     * Current language code
     */
    get currentLanguage() {
        return this.languageService.currentLanguage();
    }

    /**
     * Current language data (flag, name)
     */
    currentLanguageData() {
        return this.languageService.getCurrentLanguageData();
    }

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown(): void {
        this.isOpen.update(value => !value);
    }

    /**
     * Select a language and close dropdown
     */
    selectLanguage(languageCode: string): void {
        this.languageService.setLanguage(languageCode);
        this.isOpen.set(false);
    }

    /**
     * Close dropdown when clicking outside
     */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const clickedInside = target.closest('app-language-selector');

        if (!clickedInside && this.isOpen()) {
            this.isOpen.set(false);
        }
    }
}
