import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@core/i18n/language.service';
import { CartSyncService } from '@core/services/cart-sync.service';
import { StockSseService } from '@core/services/stock-sse.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App {
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  // Inicializa sincronización de carritos abandonados
  private cartSync = inject(CartSyncService);
  // Abre stream SSE de stock en tiempo real
  private stockSse = inject(StockSseService);

  constructor() {
    this.stockSse.connect();
  }
}
