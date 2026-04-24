import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreConfigService } from '@core/services/store-config.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  host: { class: 'block w-full' }
})
export class FooterComponent {
    public sc = inject(StoreConfigService);
    currentYear = new Date().getFullYear();

    // Acordeón para mobile: cada sección puede estar expandida/colapsada
    companyExpanded = signal(false);
    helpExpanded    = signal(false);
    legalExpanded   = signal(false);

    toggleCompany(): void { this.companyExpanded.update(v => !v); }
    toggleHelp():    void { this.helpExpanded.update(v => !v); }
    toggleLegal():   void { this.legalExpanded.update(v => !v); }
}
