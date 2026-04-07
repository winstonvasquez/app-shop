import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@core/i18n/language.service';
import { CartSyncService } from '@core/services/cart-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App {
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  // Inicializa el servicio de sincronización de carritos abandonados
  private cartSync = inject(CartSyncService);
}
