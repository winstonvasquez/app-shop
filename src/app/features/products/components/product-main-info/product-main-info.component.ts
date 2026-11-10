import { Component, inject, input } from '@angular/core';
import { ZonaEnvioService } from '@core/services/zona-envio.service';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-main-info',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './product-main-info.component.html'
})
export class ProductMainInfoComponent {
  product = input.required<ProductDetail>();
  /** Umbral real de envío gratis; null = no se promete. */
  readonly umbralEnvioGratis = inject(ZonaEnvioService).envioGratisDesde;
  constructor() { inject(ZonaEnvioService).cargarUmbral(); }
}
