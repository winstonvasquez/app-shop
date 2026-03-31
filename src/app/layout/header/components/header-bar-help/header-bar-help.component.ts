import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { StoreConfigService } from '@core/services/store-config.service';

@Component({
    selector: 'app-header-bar-help',
    standalone: true,
    imports: [CommonModule, LanguageSelectorComponent, RouterLink],
    templateUrl: './header-bar-help.component.html',
    host: { class: 'block w-full' }
})
export class HeaderBarHelpComponent {
    public sc = inject(StoreConfigService);
}
